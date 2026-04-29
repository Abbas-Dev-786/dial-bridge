import hashlib
import hmac
import json
import logging
import time
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.background.outgoing_webhooks import enqueue_webhook_delivery
from app.enums import CallStatus, ContactStatus, RetryOnOutcome, TranscriptSpeaker
from app.models.call import Call, CallCollectedData, CallEvaluation, CallTranscript
from app.utils.dynamic_variables import build_dynamic_variables

logger = logging.getLogger(__name__)

SIGNATURE_TOLERANCE_SECONDS = 30 * 60
TERMINAL_CALL_STATUSES = {
    CallStatus.completed,
    CallStatus.failed,
    CallStatus.no_answer,
    CallStatus.busy,
    CallStatus.voicemail,
    CallStatus.transferred,
    CallStatus.timeout,
}


def verify_elevenlabs_signature(
    request_body: bytes,
    signature_header: str,
    secret: str,
) -> bool:
    """Verify the ElevenLabs webhook signature header."""
    if not secret or not signature_header:
        return False

    parsed_signature = _parse_signature_header(signature_header)
    if parsed_signature is not None:
        timestamp, received_hash = parsed_signature
        now = int(time.time())

        if abs(now - timestamp) > SIGNATURE_TOLERANCE_SECONDS:
            logger.warning("Rejected ElevenLabs webhook with stale timestamp")
            return False

        try:
            payload_to_sign = f"{timestamp}.{request_body.decode('utf-8')}".encode("utf-8")
        except UnicodeDecodeError:
            logger.warning("Rejected ElevenLabs webhook with non-UTF8 body")
            return False

        expected_hash = hmac.new(
            secret.encode("utf-8"),
            payload_to_sign,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected_hash, received_hash)

    # Backward-compatible fallback for old integrations that sent only a raw digest.
    legacy_expected = hmac.new(
        secret.encode("utf-8"),
        request_body,
        hashlib.sha256,
    ).hexdigest()
    normalized_header = signature_header.removeprefix("v0=")
    return hmac.compare_digest(legacy_expected, normalized_header)


def _parse_signature_header(signature_header: str) -> tuple[int, str] | None:
    parts: dict[str, str] = {}
    for raw_part in signature_header.split(","):
        if "=" not in raw_part:
            continue
        key, value = raw_part.split("=", 1)
        parts[key.strip()] = value.strip()

    timestamp_raw = parts.get("t")
    signature_hash = parts.get("v0")
    if not timestamp_raw or not signature_hash:
        return None

    try:
        return int(timestamp_raw), signature_hash
    except ValueError:
        return None


async def handle_elevenlabs_event(db: AsyncSession, payload: dict) -> None:
    """Dispatch and persist ElevenLabs post-call webhook events."""
    event_type = payload.get("type")
    handlers = {
        "post_call_transcription": handle_post_call_transcription,
        "post_call_audio": handle_post_call_audio,
        "call_initiation_failure": handle_call_initiation_failure,
    }

    handler = handlers.get(event_type)
    if handler is None:
        logger.warning("No handler for ElevenLabs event type: %s", event_type)
        return

    try:
        await handler(db, payload)
        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("Error handling ElevenLabs event %s", event_type)
        raise


async def handle_initiation_webhook(db: AsyncSession, payload: dict) -> dict:
    """
    Handle the conversation initiation webhook.

    This webhook fires when ElevenLabs starts the conversation and is the best
    point to move the call from ringing to in-progress while returning contact-
    specific dynamic variables.
    """
    conversation_id = payload.get("conversation_id")
    logger.info("Initiation webhook received for conversation: %s", conversation_id)

    call = await _get_call_by_conversation_id(db, conversation_id)

    fallback_dynamic_vars, _ = build_dynamic_variables(
        contact_name="there",
        contact_phone=payload.get("caller_id") or payload.get("from_number") or "",
        contact_company="",
        campaign_name="",
        custom_fields=None,
    )
    response_data: dict[str, Any] = {
        "type": "conversation_initiation_client_data",
        "dynamic_variables": fallback_dynamic_vars,
    }
    if call:
        contact = call.contact
        campaign = call.campaign

        if call.status not in TERMINAL_CALL_STATUSES:
            call.status = CallStatus.in_progress
            if not call.answered_at:
                call.answered_at = datetime.now(UTC)

            if contact:
                contact.status = ContactStatus.calling

        if campaign:
            dynamic_vars, dynamic_stats = build_dynamic_variables(
                contact_name=contact.full_name if contact else "there",
                contact_phone=contact.phone if contact else call.to_number,
                contact_company=contact.company if contact else "",
                campaign_name=campaign.name,
                custom_fields=contact.custom_fields if contact else None,
            )
            response_data = {
                "type": "conversation_initiation_client_data",
                "dynamic_variables": dynamic_vars,
            }
            logger.info(
                "Prepared dynamic variables for initiation webhook "
                "conversation_id=%s total_keys=%s custom_seen=%s custom_added=%s "
                "dropped_invalid_key=%s dropped_collision=%s dropped_limit=%s",
                conversation_id,
                len(dynamic_vars),
                dynamic_stats["custom_seen"],
                dynamic_stats["custom_added"],
                dynamic_stats["dropped_invalid_key"],
                dynamic_stats["dropped_collision"],
                dynamic_stats["dropped_limit"],
            )

        await db.commit()

    return response_data


async def handle_post_call_transcription(db: AsyncSession, payload: dict) -> None:
    """
    Process the `post_call_transcription` event from ElevenLabs.

    The latest docs describe this as the canonical call-end event containing the
    final transcript, metadata, analysis, and any conversation initiation data.
    """
    data = payload.get("data", {}) or {}
    conversation_id = data.get("conversation_id")
    call = await _get_call_by_conversation_id(db, conversation_id)

    if not call:
        logger.error(
            "Call with conversation_id %s not found in post_call_transcription",
            conversation_id,
        )
        return

    contact = call.contact
    campaign = call.campaign
    call_before = _capture_call_campaign_contribution(call)
    contact_before = _capture_contact_campaign_contribution(contact)
    was_terminal = call.status in TERMINAL_CALL_STATUSES

    metadata = data.get("metadata", {}) or {}
    analysis = data.get("analysis", {}) or {}
    outcome = _normalize_transcription_outcome(analysis, metadata)
    started_at = _timestamp_to_utc(metadata.get("start_time_unix_secs"))
    termination_reason = str(metadata.get("termination_reason") or "")

    if started_at:
        call.started_at = started_at
    if not call.answered_at and call.started_at:
        call.answered_at = call.started_at

    call.duration_seconds = _coerce_int(metadata.get("call_duration_secs"))
    call.ended_at = datetime.now(UTC)
    call.outcome = outcome
    call.summary = analysis.get("transcript_summary")
    call.cost_telephony_cents = _coerce_int(metadata.get("cost"))
    call.recording_url = metadata.get("recording_url") or call.recording_url
    call.is_voicemail = outcome == RetryOnOutcome.voicemail.value or "voicemail" in termination_reason.lower()
    call.was_transferred = "transfer" in termination_reason.lower() or bool(data.get("transfer_destination"))
    call.transfer_destination = data.get("transfer_destination") or call.transfer_destination
    call.status = _call_status_for_transcription_outcome(outcome)
    _store_raw_provider_event(call, payload)

    await _replace_transcripts(db, call.id, data.get("transcript", []))
    await _replace_evaluations(db, call.id, analysis.get("evaluation_criteria_results", {}))
    await _replace_collected_data(db, call.id, analysis.get("data_collection_results", {}))

    if contact:
        _update_contact_after_terminal_call(
            contact=contact,
            campaign=campaign,
            outcome=outcome,
            occurred_at=call.ended_at or datetime.now(UTC),
            call_retry_number=call.retry_number,
        )

    if campaign:
        _apply_campaign_delta(
            campaign=campaign,
            call_before=call_before,
            call_after=_capture_call_campaign_contribution(call),
            contact_before=contact_before,
            contact_after=_capture_contact_campaign_contribution(contact),
        )

    if not was_terminal and call.status in TERMINAL_CALL_STATUSES:
        await enqueue_webhook_delivery(db, call, "call.completed")


async def handle_post_call_audio(db: AsyncSession, payload: dict) -> None:
    """
    Process the `post_call_audio` event.

    ElevenLabs now sends audio as a separate event and may stream it with chunked
    transfer encoding. We are only logging/recording the latest event metadata
    for now because the app relies on the transcription webhook for campaign
    state and analytics.
    """
    data = payload.get("data", {}) or {}
    conversation_id = data.get("conversation_id")
    logger.info("Audio received for conversation: %s", conversation_id)

    call = await _get_call_by_conversation_id(db, conversation_id)
    if not call:
        return

    _store_raw_provider_event(call, payload)


async def handle_call_initiation_failure(db: AsyncSession, payload: dict) -> None:
    """Process the `call_initiation_failure` event from ElevenLabs."""
    data = payload.get("data", {}) or {}
    conversation_id = data.get("conversation_id")
    call = await _get_call_by_conversation_id(db, conversation_id)

    if not call:
        logger.error(
            "Call with conversation_id %s not found in call_initiation_failure",
            conversation_id,
        )
        return

    contact = call.contact
    campaign = call.campaign
    call_before = _capture_call_campaign_contribution(call)
    contact_before = _capture_contact_campaign_contribution(contact)
    was_terminal = call.status in TERMINAL_CALL_STATUSES

    failure_reason = _normalize_failure_reason(data.get("failure_reason"))
    metadata = data.get("metadata", {}) or {}

    call.status = _call_status_for_failure_reason(failure_reason)
    call.outcome = failure_reason
    call.ended_at = datetime.now(UTC)
    call.error_code = failure_reason
    call.error_message = _build_failure_error_message(failure_reason, metadata)
    _store_raw_provider_event(call, payload)

    if contact:
        _update_contact_after_terminal_call(
            contact=contact,
            campaign=campaign,
            outcome=failure_reason,
            occurred_at=call.ended_at or datetime.now(UTC),
            call_retry_number=call.retry_number,
        )

    if campaign:
        _apply_campaign_delta(
            campaign=campaign,
            call_before=call_before,
            call_after=_capture_call_campaign_contribution(call),
            contact_before=contact_before,
            contact_after=_capture_contact_campaign_contribution(contact),
        )

    if not was_terminal and call.status in TERMINAL_CALL_STATUSES:
        await enqueue_webhook_delivery(db, call, "call.completed")


async def _get_call_by_conversation_id(
    db: AsyncSession,
    conversation_id: str | None,
) -> Call | None:
    if not conversation_id:
        return None

    stmt = (
        select(Call)
        .where(Call.elevenlabs_conversation_id == conversation_id)
        .options(selectinload(Call.contact), selectinload(Call.campaign))
        .with_for_update()
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


def _capture_call_campaign_contribution(call: Call) -> dict[str, int]:
    outcome = str(call.outcome or "")
    return {
        "calls_successful": 1 if outcome == "success" else 0,
        "calls_failed": 1 if outcome and outcome != "success" else 0,
        "total_spend_cents": _call_total_cost(call),
    }


def _capture_contact_campaign_contribution(contact: Any) -> dict[str, int]:
    if not contact:
        return {"contacts_called": 0, "contacts_remaining": 0}

    return {
        "contacts_called": 1
        if contact.status in {ContactStatus.called, ContactStatus.failed}
        else 0,
        "contacts_remaining": 1
        if contact.status in {ContactStatus.pending, ContactStatus.calling}
        else 0,
    }


def _apply_campaign_delta(
    campaign: Any,
    call_before: dict[str, int],
    call_after: dict[str, int],
    contact_before: dict[str, int],
    contact_after: dict[str, int],
) -> None:
    campaign.calls_successful = max(
        0,
        (campaign.calls_successful or 0)
        + call_after["calls_successful"]
        - call_before["calls_successful"],
    )
    campaign.calls_failed = max(
        0,
        (campaign.calls_failed or 0)
        + call_after["calls_failed"]
        - call_before["calls_failed"],
    )
    campaign.total_spend_cents = max(
        0,
        (campaign.total_spend_cents or 0)
        + call_after["total_spend_cents"]
        - call_before["total_spend_cents"],
    )
    campaign.contacts_called = max(
        0,
        (campaign.contacts_called or 0)
        + contact_after["contacts_called"]
        - contact_before["contacts_called"],
    )
    campaign.contacts_remaining = max(
        0,
        (campaign.contacts_remaining or 0)
        + contact_after["contacts_remaining"]
        - contact_before["contacts_remaining"],
    )


def _update_contact_after_terminal_call(
    contact: Any,
    campaign: Any,
    outcome: str,
    occurred_at: datetime,
    call_retry_number: int,
) -> None:
    current_retry_count = int(contact.retry_count or 0)
    attempt_retry_number = int(call_retry_number or 0)
    should_retry = (
        outcome != "success"
        and campaign is not None
        and _outcome_is_retryable(campaign, outcome)
        and attempt_retry_number < int(campaign.max_retries or 0)
    )

    contact.last_called_at = occurred_at
    contact.last_outcome = outcome

    if outcome != "success":
        contact.retry_count = max(current_retry_count, attempt_retry_number + 1)
    else:
        contact.retry_count = max(current_retry_count, attempt_retry_number)

    if outcome == "success":
        contact.status = ContactStatus.called
        contact.next_retry_at = None
        return

    if should_retry:
        contact.status = ContactStatus.pending
        contact.next_retry_at = occurred_at + timedelta(
            minutes=int(campaign.retry_delay_minutes or 0)
        )
        return

    contact.status = ContactStatus.failed
    contact.next_retry_at = None


def _outcome_is_retryable(campaign: Any, outcome: str) -> bool:
    retry_outcomes = {
        item.value if isinstance(item, RetryOnOutcome) else str(item)
        for item in (campaign.retry_on_outcomes or [])
    }
    return outcome in retry_outcomes


def _normalize_transcription_outcome(analysis: dict, metadata: dict) -> str:
    call_successful = str(analysis.get("call_successful") or "").lower()
    termination_reason = str(metadata.get("termination_reason") or "").lower()

    if call_successful == "success":
        return "success"
    if "no answer" in termination_reason or "no-answer" in termination_reason:
        return RetryOnOutcome.no_answer.value
    if "busy" in termination_reason:
        return RetryOnOutcome.busy.value
    if "voicemail" in termination_reason:
        return RetryOnOutcome.voicemail.value
    if "timeout" in termination_reason:
        return RetryOnOutcome.timeout.value
    return RetryOnOutcome.failed.value


def _normalize_failure_reason(reason: Any) -> str:
    normalized = str(reason or "failed").strip().lower().replace("-", "_")
    if normalized in {
        RetryOnOutcome.busy.value,
        RetryOnOutcome.no_answer.value,
        RetryOnOutcome.timeout.value,
        RetryOnOutcome.failed.value,
    }:
        return normalized
    return RetryOnOutcome.failed.value


def _call_status_for_transcription_outcome(outcome: str) -> CallStatus:
    if outcome == RetryOnOutcome.no_answer.value:
        return CallStatus.no_answer
    if outcome == RetryOnOutcome.busy.value:
        return CallStatus.busy
    if outcome == RetryOnOutcome.voicemail.value:
        return CallStatus.voicemail
    if outcome == RetryOnOutcome.timeout.value:
        return CallStatus.timeout
    return CallStatus.completed


def _call_status_for_failure_reason(failure_reason: str) -> CallStatus:
    if failure_reason == RetryOnOutcome.busy.value:
        return CallStatus.busy
    if failure_reason == RetryOnOutcome.no_answer.value:
        return CallStatus.no_answer
    if failure_reason == RetryOnOutcome.timeout.value:
        return CallStatus.timeout
    return CallStatus.failed


def _build_failure_error_message(failure_reason: str, metadata: dict) -> str:
    provider = str(metadata.get("type") or "provider")
    provider_body = metadata.get("body") or {}
    provider_reason = provider_body.get("error_reason") or provider_body.get("CallStatus")

    if provider_reason:
        return f"Call initiation failed via {provider}: {provider_reason}"
    return f"Call initiation failed via {provider}: {failure_reason}"


def _timestamp_to_utc(timestamp: Any) -> datetime | None:
    if timestamp in (None, ""):
        return None

    try:
        return datetime.fromtimestamp(float(timestamp), tz=UTC)
    except (TypeError, ValueError, OSError):
        return None


def _coerce_int(value: Any) -> int:
    if value in (None, ""):
        return 0

    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return 0


def _coerce_float(value: Any) -> float | None:
    if value in (None, ""):
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _store_raw_provider_event(call: Call, payload: dict) -> None:
    raw_payload = dict(call.raw_provider_payload or {})
    raw_payload["elevenlabs_last_event"] = {
        "type": payload.get("type"),
        "event_timestamp": payload.get("event_timestamp"),
        "received_at": datetime.now(UTC).isoformat(),
    }
    if isinstance(payload.get("data"), dict):
        raw_payload["elevenlabs_last_data"] = {
            "conversation_id": payload["data"].get("conversation_id"),
            "agent_id": payload["data"].get("agent_id"),
        }
    call.raw_provider_payload = raw_payload


async def _replace_transcripts(
    db: AsyncSession,
    call_id,
    transcript_data: list[dict] | None,
) -> None:
    await db.execute(delete(CallTranscript).where(CallTranscript.call_id == call_id))

    speaker_map = {
        "agent": TranscriptSpeaker.agent,
        "user": TranscriptSpeaker.user,
        "tool": TranscriptSpeaker.tool,
        "system": TranscriptSpeaker.system,
    }

    for idx, turn in enumerate(transcript_data or []):
        text = _extract_transcript_text(turn)
        if not text:
            continue

        db.add(
            CallTranscript(
                call_id=call_id,
                sequence=idx + 1,
                speaker=speaker_map.get(turn.get("role"), TranscriptSpeaker.user),
                text=text,
                timestamp_secs=_coerce_float(turn.get("time_in_call_secs")),
            )
        )


def _extract_transcript_text(turn: dict) -> str:
    if turn.get("message"):
        return str(turn["message"])
    if turn.get("tool_results"):
        return json.dumps(turn["tool_results"])
    if turn.get("tool_calls"):
        return json.dumps(turn["tool_calls"])
    return ""


async def _replace_evaluations(
    db: AsyncSession,
    call_id,
    evaluation_results: Any,
) -> None:
    await db.execute(delete(CallEvaluation).where(CallEvaluation.call_id == call_id))

    if not isinstance(evaluation_results, dict):
        return

    for criteria, result in evaluation_results.items():
        passed, score, rationale = _normalize_evaluation_result(result)
        db.add(
            CallEvaluation(
                call_id=call_id,
                criteria=str(criteria),
                passed=passed,
                score=score,
                rationale=rationale,
                evaluated_by="elevenlabs",
            )
        )


def _normalize_evaluation_result(result: Any) -> tuple[bool, float | None, str | None]:
    if isinstance(result, dict):
        passed = result.get("passed")
        if passed is None:
            verdict = str(
                result.get("result")
                or result.get("status")
                or result.get("value")
                or ""
            ).lower()
            passed = verdict in {"true", "pass", "passed", "success"}

        score = _coerce_float(result.get("score") or result.get("confidence"))
        rationale = result.get("rationale") or result.get("reason")
        return bool(passed), score, rationale

    if isinstance(result, bool):
        return result, None, None

    verdict = str(result).lower()
    return verdict in {"true", "pass", "passed", "success"}, None, str(result)


async def _replace_collected_data(
    db: AsyncSession,
    call_id,
    collected_results: Any,
) -> None:
    await db.execute(
        delete(CallCollectedData).where(CallCollectedData.call_id == call_id)
    )

    if not isinstance(collected_results, dict):
        return

    for field_key, value in collected_results.items():
        field_value, confidence = _normalize_collected_data_value(value)
        db.add(
            CallCollectedData(
                call_id=call_id,
                field_key=str(field_key),
                field_value=field_value,
                confidence=confidence,
            )
        )


def _normalize_collected_data_value(value: Any) -> tuple[str | None, float | None]:
    if isinstance(value, dict):
        field_value = value.get("value")
        if field_value is None:
            field_value = value.get("result")
        confidence = _coerce_float(value.get("confidence") or value.get("score"))
        return None if field_value is None else str(field_value), confidence

    if value is None:
        return None, None
    return str(value), None


def _call_total_cost(call: Call) -> int:
    return (
        (call.cost_telephony_cents or 0)
        + (call.cost_llm_cents or 0)
        + (call.cost_tts_cents or 0)
        + (call.cost_stt_cents or 0)
    )
