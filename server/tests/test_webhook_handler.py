from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.enums import CallStatus, ContactStatus, RetryOnOutcome
from app.models.call import Call
from app.models.campaign import Campaign
from app.models.contact import Contact
from app.services.webhook_handler import handle_call_ended, handle_call_failed


class ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


@pytest.mark.asyncio
async def test_handle_call_ended_updates_terminal_state_once():
    campaign = Campaign(
        id=uuid4(),
        contacts_called=2,
        contacts_remaining=5,
        calls_successful=1,
        calls_failed=0,
        total_spend_cents=25,
        retry_on_outcomes=[RetryOnOutcome.no_answer],
        max_retries=3,
        retry_delay_minutes=30,
    )
    contact = Contact(id=uuid4(), status=ContactStatus.calling, retry_count=0)
    call = Call(
        id=uuid4(),
        campaign_id=campaign.id,
        contact_id=contact.id,
        status=CallStatus.ringing,
        cost_telephony_cents=10,
        cost_llm_cents=20,
        cost_tts_cents=30,
        cost_stt_cents=40,
    )
    call.contact = contact
    call.campaign = campaign

    db = AsyncMock()
    db.execute.return_value = ScalarResult(call)

    await handle_call_ended(
        db,
        {
            "conversation_id": "conv-1",
            "call_outcome": "completed",
            "duration_seconds": 48,
            "cost_breakdown": {"telephony": 0.1, "llm": 0.2, "tts": 0.3, "stt": 0.4},
        },
    )

    assert call.status == CallStatus.completed
    assert contact.status == ContactStatus.called
    assert campaign.contacts_called == 3
    assert campaign.contacts_remaining == 4
    assert campaign.calls_successful == 2
    assert campaign.total_spend_cents == 125


@pytest.mark.asyncio
async def test_handle_call_ended_retries_retryable_outcome():
    campaign = Campaign(
        id=uuid4(),
        contacts_called=0,
        contacts_remaining=4,
        calls_successful=0,
        calls_failed=0,
        total_spend_cents=0,
        retry_on_outcomes=[RetryOnOutcome.no_answer],
        max_retries=3,
        retry_delay_minutes=15,
    )
    contact = Contact(id=uuid4(), status=ContactStatus.calling, retry_count=0)
    call = Call(
        id=uuid4(),
        campaign_id=campaign.id,
        contact_id=contact.id,
        status=CallStatus.in_progress,
    )
    call.contact = contact
    call.campaign = campaign

    db = AsyncMock()
    db.execute.return_value = ScalarResult(call)

    await handle_call_ended(
        db,
        {
            "conversation_id": "conv-2",
            "call_outcome": "no_answer",
            "duration_seconds": 12,
        },
    )

    assert call.status == CallStatus.no_answer
    assert contact.status == ContactStatus.pending
    assert contact.retry_count == 1
    assert contact.next_retry_at is not None
    assert campaign.contacts_called == 0
    assert campaign.contacts_remaining == 4


@pytest.mark.asyncio
async def test_handle_call_failed_requeues_retryable_contact():
    campaign = Campaign(
        id=uuid4(),
        contacts_called=1,
        contacts_remaining=3,
        calls_successful=0,
        calls_failed=0,
        total_spend_cents=0,
        max_retries=3,
        retry_delay_minutes=20,
    )
    contact = Contact(id=uuid4(), status=ContactStatus.calling, retry_count=0)
    call = Call(
        id=uuid4(),
        campaign_id=campaign.id,
        contact_id=contact.id,
        status=CallStatus.ringing,
    )
    call.contact = contact
    call.campaign = campaign

    db = AsyncMock()
    db.execute.return_value = ScalarResult(call)

    await handle_call_failed(
        db,
        {"conversation_id": "conv-3", "error_code": "provider_error", "error_message": "boom"},
    )

    assert call.status == CallStatus.failed
    assert contact.status == ContactStatus.pending
    assert contact.retry_count == 1
    assert contact.next_retry_at is not None
    assert campaign.calls_failed == 1
    assert campaign.contacts_called == 1
    assert campaign.contacts_remaining == 3


@pytest.mark.asyncio
async def test_handle_call_failed_marks_terminal_failure_when_retries_exhausted():
    campaign = Campaign(
        id=uuid4(),
        contacts_called=1,
        contacts_remaining=3,
        calls_successful=0,
        calls_failed=0,
        total_spend_cents=0,
        max_retries=3,
        retry_delay_minutes=20,
    )
    contact = Contact(id=uuid4(), status=ContactStatus.calling, retry_count=3)
    call = Call(
        id=uuid4(),
        campaign_id=campaign.id,
        contact_id=contact.id,
        status=CallStatus.ringing,
    )
    call.contact = contact
    call.campaign = campaign

    db = AsyncMock()
    db.execute.return_value = ScalarResult(call)

    await handle_call_failed(
        db,
        {"conversation_id": "conv-4", "error_code": "provider_error", "error_message": "boom"},
    )

    assert contact.status == ContactStatus.failed
    assert contact.next_retry_at is None
    assert contact.retry_count == 4
    assert campaign.calls_failed == 1
    assert campaign.contacts_called == 2
    assert campaign.contacts_remaining == 2


@pytest.mark.asyncio
async def test_duplicate_terminal_webhook_is_ignored():
    campaign = Campaign(
        id=uuid4(),
        contacts_called=2,
        contacts_remaining=1,
        calls_successful=1,
        calls_failed=1,
        total_spend_cents=50,
        max_retries=3,
        retry_delay_minutes=20,
    )
    contact = Contact(id=uuid4(), status=ContactStatus.called, retry_count=0)
    call = Call(
        id=uuid4(),
        campaign_id=campaign.id,
        contact_id=contact.id,
        status=CallStatus.completed,
    )
    call.contact = contact
    call.campaign = campaign

    db = AsyncMock()
    db.execute.return_value = ScalarResult(call)

    await handle_call_ended(db, {"conversation_id": "conv-5", "call_outcome": "completed"})

    assert campaign.contacts_called == 2
    assert campaign.contacts_remaining == 1
    assert campaign.calls_successful == 1
