import hmac
import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.models.call import Call, CallTranscript
from app.models.contact import Contact
from app.models.campaign import Campaign
from app.enums import CallStatus, ContactStatus, TranscriptSpeaker
from app.background.outgoing_webhooks import enqueue_webhook_delivery

logger = logging.getLogger(__name__)

TERMINAL_CALL_STATUSES = {
    CallStatus.completed,
    CallStatus.failed,
    CallStatus.no_answer,
    CallStatus.busy,
    CallStatus.voicemail,
    CallStatus.transferred,
    CallStatus.timeout,
}

def verify_elevenlabs_signature(request_body: bytes, signature_header: str, secret: str) -> bool:
    """Verify HMAC signature from ElevenLabs."""
    if not secret:
        return False
    
    expected_signature = hmac.new(
        secret.encode(), 
        request_body, 
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature_header)

async def handle_elevenlabs_event(db: AsyncSession, payload: dict) -> None:
    """Main dispatcher for ElevenLabs webhook events (Post-call)."""
    event_type = payload.get("type")
    
    handlers = {
        "post_call_transcription": handle_post_call_transcription,
        "post_call_audio": handle_post_call_audio,
        "post_call_initiation_failure": handle_post_call_initiation_failure,
    }
    
    handler = handlers.get(event_type)
    if handler:
        try:
            await handler(db, payload.get("data", {}))
            await db.commit()
        except Exception as e:
            await db.rollback()
            logger.error(f"Error handling ElevenLabs event {event_type}: {e}")
            raise
    else:
        logger.warning(f"No handler for event type: {event_type}")

async def handle_initiation_webhook(db: AsyncSession, payload: dict) -> dict:
    """
    Handles the 'Conversation Initiation Webhook'.
    Fires when a conversation starts (closest to 'Call Answered').
    Returns provisioning data (dynamic variables).
    """
    conversation_id = payload.get("conversation_id")
    logger.info(f"Initiation webhook received for conversation: {conversation_id}")

    stmt = (
        select(Call)
        .where(Call.elevenlabs_conversation_id == conversation_id)
        .options(selectinload(Call.contact), selectinload(Call.campaign))
    )
    result = await db.execute(stmt)
    call = result.scalar_one_or_none()

    if call:
        if call.status not in TERMINAL_CALL_STATUSES:
            call.status = CallStatus.in_progress
            if not call.answered_at:
                call.answered_at = datetime.utcnow()
            
            if call.contact:
                call.contact.status = ContactStatus.calling
        
        await db.commit()
    
    # Return 200 with optional overrides if needed
    # For now, we return empty dict to use default config passed during initiation
    return {}

async def handle_post_call_transcription(db: AsyncSession, data: dict) -> None:
    """
    Processes the 'post_call_transcription' event.
    This is the primary source of truth for call results.
    """
    conversation_id = data.get("conversation_id")
    stmt = (
        select(Call)
        .where(Call.elevenlabs_conversation_id == conversation_id)
        .options(selectinload(Call.contact), selectinload(Call.campaign))
    )
    result = await db.execute(stmt)
    call = result.scalar_one_or_none()
    
    if not call:
        logger.error(f"Call with conversation_id {conversation_id} not found in post_call_transcription")
        return

    # 1. Update Core Metadata
    metadata = data.get("metadata", {})
    analysis = data.get("analysis", {})
    
    call.duration_seconds = metadata.get("call_duration_secs")
    call.started_at = datetime.fromtimestamp(metadata.get("start_time_unix_secs")) if metadata.get("start_time_unix_secs") else call.started_at
    call.ended_at = datetime.utcnow()
    
    # Outcome and Success
    outcome = analysis.get("call_successful") # 'success' or 'failure'
    call.outcome = outcome
    call.summary = analysis.get("transcript_summary")
    
    # Billing
    cost_raw = metadata.get("cost", 0) # usually in cents or fractional cents? Docs say 296 = 2.96? 
    # Let's assume cost is in millicents or something, but our DB uses cents.
    # Actually, ElevenLabs cost field in transcript payload is usually in cents * 10 or similar.
    # Let's store as provided for now or refine if we know the scale.
    call.cost_telephony_cents = cost_raw 

    # 2. Update Status
    if outcome == "success":
        call.status = CallStatus.completed
    else:
        # Check termination reason if possible
        reason = metadata.get("termination_reason", "").lower()
        if "no answer" in reason or "no-answer" in reason:
            call.status = CallStatus.no_answer
        elif "busy" in reason:
            call.status = CallStatus.busy
        elif "voicemail" in reason:
            call.status = CallStatus.voicemail
        else:
            call.status = CallStatus.completed # Even if 'failure' analysis, the call technically 'completed'

    # 3. Save Transcript
    transcript_data = data.get("transcript", [])
    # Clear any old "ringing" transcripts if they existed
    # (Though for post-call they shouldn't)
    
    for idx, turn in enumerate(transcript_data):
        speaker_map = {
            "agent": TranscriptSpeaker.agent,
            "user": TranscriptSpeaker.user,
        }
        new_transcript = CallTranscript(
            call_id=call.id,
            sequence=idx + 1,
            speaker=speaker_map.get(turn.get("role"), TranscriptSpeaker.user),
            text=turn.get("message"),
            timestamp_secs=turn.get("time_in_call_secs"),
        )
        db.add(new_transcript)

    # 4. Update Campaign & Contact
    contact = call.contact
    campaign = call.campaign
    
    if contact and campaign:
        is_successful_outcome = (outcome == "success")
        should_retry = (
            not is_successful_outcome
            and (contact.retry_count or 0) < campaign.max_retries
        )

        contact.last_called_at = datetime.utcnow()
        contact.last_outcome = outcome

        if should_retry:
            contact.retry_count = (contact.retry_count or 0) + 1
            contact.status = ContactStatus.pending
            contact.next_retry_at = datetime.utcnow() + timedelta(minutes=campaign.retry_delay_minutes)
        else:
            contact.status = ContactStatus.called
            contact.next_retry_at = None

        # Campaign aggregates
        campaign.total_spend_cents += (call.cost_telephony_cents or 0)
        if outcome == "success":
            campaign.calls_successful += 1
        else:
            campaign.calls_failed += 1
            
        if not should_retry:
            campaign.contacts_called += 1
            campaign.contacts_remaining = max(0, campaign.contacts_remaining - 1)

    # 5. Trigger Outgoing webhooks
    await enqueue_webhook_delivery(db, call, "call.completed")

async def handle_post_call_audio(db: AsyncSession, data: dict) -> None:
    """
    Processes the 'post_call_audio' event.
    Useful for local archival, though we prefer the recording_url in metadata.
    """
    conversation_id = data.get("conversation_id")
    # For now, we just log it. We might implement local storage later.
    logger.info(f"Audio received for conversation: {conversation_id}")

async def handle_post_call_initiation_failure(db: AsyncSession, data: dict) -> None:
    """
    Processes the 'post_call_initiation_failure' event.
    """
    conversation_id = data.get("conversation_id")
    stmt = (
        select(Call)
        .where(Call.elevenlabs_conversation_id == conversation_id)
        .options(selectinload(Call.contact), selectinload(Call.campaign))
    )
    result = await db.execute(stmt)
    call = result.scalar_one_or_none()

    if call:
        call.status = CallStatus.failed
        call.error_message = "Initiation failed (unreachable or invalid number)"
        
        contact = call.contact
        campaign = call.campaign
        if contact and campaign:
            contact.status = ContactStatus.failed # Or pending if we want to retry connection failures
            campaign.calls_failed += 1
            campaign.contacts_called += 1
            campaign.contacts_remaining = max(0, campaign.contacts_remaining - 1)

def _call_total_cost(call: Call) -> int:
    return (call.cost_telephony_cents or 0)
