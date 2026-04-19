import hashlib
import hmac
import time
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest

from app.enums import CallStatus, ContactStatus, RetryOnOutcome
from app.models.call import Call
from app.models.campaign import Campaign
from app.models.contact import Contact
from app.services.webhook_handler import (
    handle_call_initiation_failure,
    handle_post_call_transcription,
    verify_elevenlabs_signature,
)


class ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


def _build_call_with_relations(
    *,
    campaign_kwargs: dict | None = None,
    contact_kwargs: dict | None = None,
    call_kwargs: dict | None = None,
):
    campaign_data = {
        "id": uuid4(),
        "contacts_called": 2,
        "contacts_remaining": 5,
        "calls_successful": 1,
        "calls_failed": 0,
        "total_spend_cents": 25,
        "retry_on_outcomes": [RetryOnOutcome.no_answer],
        "max_retries": 3,
        "retry_delay_minutes": 30,
    }
    campaign_data.update(campaign_kwargs or {})
    campaign = Campaign(**campaign_data)

    contact_data = {
        "id": uuid4(),
        "status": ContactStatus.calling,
        "retry_count": 0,
    }
    contact_data.update(contact_kwargs or {})
    contact = Contact(**contact_data)

    call_data = {
        "id": uuid4(),
        "campaign_id": campaign.id,
        "contact_id": contact.id,
        "status": CallStatus.in_progress,
        "retry_number": 0,
        "cost_telephony_cents": 0,
        "cost_llm_cents": 0,
        "cost_tts_cents": 0,
        "cost_stt_cents": 0,
    }
    call_data.update(call_kwargs or {})
    call = Call(**call_data)
    call.contact = contact
    call.campaign = campaign
    return call, contact, campaign


@pytest.mark.asyncio
async def test_handle_post_call_transcription_updates_campaign_stats(monkeypatch):
    call, contact, campaign = _build_call_with_relations()

    db = AsyncMock()
    db.add = Mock()
    db.execute.side_effect = [ScalarResult(call), None, None, None]

    enqueue_mock = AsyncMock()
    monkeypatch.setattr(
        "app.services.webhook_handler.enqueue_webhook_delivery",
        enqueue_mock,
    )

    await handle_post_call_transcription(
        db,
        {
            "type": "post_call_transcription",
            "event_timestamp": 1739537297,
            "data": {
                "conversation_id": "conv-1",
                "metadata": {
                    "call_duration_secs": 48,
                    "cost": 100,
                    "start_time_unix_secs": 1739537297,
                },
                "analysis": {
                    "call_successful": "success",
                    "transcript_summary": "Booked a follow-up",
                },
                "transcript": [
                    {"role": "agent", "message": "Hello", "time_in_call_secs": 0},
                    {"role": "user", "message": "Hi", "time_in_call_secs": 2},
                ],
            },
        },
    )

    assert call.status == CallStatus.completed
    assert call.outcome == "success"
    assert call.duration_seconds == 48
    assert call.summary == "Booked a follow-up"
    assert call.cost_telephony_cents == 100
    assert contact.status == ContactStatus.called
    assert contact.next_retry_at is None
    assert contact.retry_count == 0
    assert campaign.contacts_called == 3
    assert campaign.contacts_remaining == 4
    assert campaign.calls_successful == 2
    assert campaign.calls_failed == 0
    assert campaign.total_spend_cents == 125
    enqueue_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_duplicate_post_call_transcription_is_idempotent(monkeypatch):
    call, contact, campaign = _build_call_with_relations()

    db = AsyncMock()
    db.add = Mock()
    db.execute.side_effect = [
        ScalarResult(call),
        None,
        None,
        None,
        ScalarResult(call),
        None,
        None,
        None,
    ]

    enqueue_mock = AsyncMock()
    monkeypatch.setattr(
        "app.services.webhook_handler.enqueue_webhook_delivery",
        enqueue_mock,
    )

    payload = {
        "type": "post_call_transcription",
        "event_timestamp": 1739537297,
        "data": {
            "conversation_id": "conv-1",
            "metadata": {
                "call_duration_secs": 48,
                "cost": 100,
                "start_time_unix_secs": 1739537297,
            },
            "analysis": {
                "call_successful": "success",
                "transcript_summary": "Booked a follow-up",
            },
            "transcript": [
                {"role": "agent", "message": "Hello", "time_in_call_secs": 0},
                {"role": "user", "message": "Hi", "time_in_call_secs": 2},
            ],
        },
    }

    await handle_post_call_transcription(db, payload)
    first_snapshot = (
        campaign.contacts_called,
        campaign.contacts_remaining,
        campaign.calls_successful,
        campaign.calls_failed,
        campaign.total_spend_cents,
        contact.retry_count,
    )

    await handle_post_call_transcription(db, payload)
    second_snapshot = (
        campaign.contacts_called,
        campaign.contacts_remaining,
        campaign.calls_successful,
        campaign.calls_failed,
        campaign.total_spend_cents,
        contact.retry_count,
    )

    assert second_snapshot == first_snapshot
    enqueue_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_call_initiation_failure_requeues_retryable_contact(monkeypatch):
    call, contact, campaign = _build_call_with_relations(
        campaign_kwargs={
            "contacts_called": 1,
            "contacts_remaining": 3,
            "calls_successful": 0,
            "calls_failed": 0,
            "total_spend_cents": 0,
            "retry_on_outcomes": [RetryOnOutcome.no_answer],
        },
        call_kwargs={"status": CallStatus.ringing},
    )

    db = AsyncMock()
    db.add = Mock()
    db.execute.side_effect = [ScalarResult(call)]

    enqueue_mock = AsyncMock()
    monkeypatch.setattr(
        "app.services.webhook_handler.enqueue_webhook_delivery",
        enqueue_mock,
    )

    await handle_call_initiation_failure(
        db,
        {
            "type": "call_initiation_failure",
            "event_timestamp": 1759931652,
            "data": {
                "conversation_id": "conv-2",
                "failure_reason": "no-answer",
                "metadata": {"type": "twilio", "body": {}},
            },
        },
    )

    assert call.status == CallStatus.no_answer
    assert call.outcome == "no_answer"
    assert contact.status == ContactStatus.pending
    assert contact.retry_count == 1
    assert contact.next_retry_at is not None
    assert campaign.calls_failed == 1
    assert campaign.contacts_called == 1
    assert campaign.contacts_remaining == 3
    enqueue_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_call_initiation_failure_marks_contact_failed_when_retries_exhausted(monkeypatch):
    call, contact, campaign = _build_call_with_relations(
        campaign_kwargs={
            "contacts_called": 1,
            "contacts_remaining": 3,
            "calls_successful": 0,
            "calls_failed": 0,
            "total_spend_cents": 0,
            "retry_on_outcomes": [RetryOnOutcome.no_answer],
            "max_retries": 3,
        },
        contact_kwargs={"retry_count": 3},
        call_kwargs={"status": CallStatus.ringing, "retry_number": 3},
    )

    db = AsyncMock()
    db.add = Mock()
    db.execute.side_effect = [ScalarResult(call)]

    enqueue_mock = AsyncMock()
    monkeypatch.setattr(
        "app.services.webhook_handler.enqueue_webhook_delivery",
        enqueue_mock,
    )

    await handle_call_initiation_failure(
        db,
        {
            "type": "call_initiation_failure",
            "event_timestamp": 1759931652,
            "data": {
                "conversation_id": "conv-3",
                "failure_reason": "no-answer",
                "metadata": {"type": "twilio", "body": {}},
            },
        },
    )

    assert call.status == CallStatus.no_answer
    assert contact.status == ContactStatus.failed
    assert contact.retry_count == 4
    assert contact.next_retry_at is None
    assert campaign.calls_failed == 1
    assert campaign.contacts_called == 2
    assert campaign.contacts_remaining == 2
    enqueue_mock.assert_awaited_once()


def test_verify_elevenlabs_signature_uses_timestamped_header():
    secret = "top-secret"
    body = b'{"type":"post_call_transcription"}'
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{body.decode('utf-8')}".encode("utf-8")
    digest = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    header = f"t={timestamp},v0={digest}"

    assert verify_elevenlabs_signature(body, header, secret) is True
    assert verify_elevenlabs_signature(b'{"type":"tampered"}', header, secret) is False
