import hmac
import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from app.models.call import Call, CallTranscript, CallEvaluation, CallCollectedData
from app.models.contact import Contact
from app.models.campaign import Campaign
from app.models.agent import Agent
from app.models.phone_number import PhoneNumber
from app.enums import CallStatus, ContactStatus, TranscriptSpeaker
from app.models.workspace import Workspace

logger = logging.getLogger(__name__)

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

async def handle_elevenlabs_event(db: AsyncSession, event_type: str, payload: dict) -> None:
    """Main dispatcher for ElevenLabs webhook events."""
    handlers = {
        "elevenlabs.call.initiated": handle_call_initiated,
        "elevenlabs.call.answered": handle_call_answered,
        "elevenlabs.call.ended": handle_call_ended,
        "elevenlabs.conversation.transcript": handle_transcript,
        "elevenlabs.conversation.summary": handle_summary,
        "elevenlabs.call.failed": handle_call_failed,
    }
    
    handler = handlers.get(event_type)
    if handler:
        try:
            await handler(db, payload)
            await db.commit()
        except Exception as e:
            await db.rollback()
            logger.error(f"Error handling ElevenLabs event {event_type}: {e}")
            raise
    else:
        logger.warning(f"No handler for event type: {event_type}")

async def handle_call_initiated(db: AsyncSession, payload: dict) -> None:
    conversation_id = payload.get("conversation_id")
    # Using fetch for later use
    stmt = select(Call).where(Call.elevenlabs_conversation_id == conversation_id)
    result = await db.execute(stmt)
    call = result.scalar_one_or_none()
    
    if not call:
        logger.warning(f"Call not found for conversation_id: {conversation_id}. Creating minimal record.")
        # Minimal record creation if needed - though usually dialer creates it
        # This part might need workspace_id which we should try to extract from payload if available
        return

    call.status = CallStatus.ringing
    call.started_at = datetime.fromtimestamp(payload.get("timestamp")) if payload.get("timestamp") else datetime.now()
    call.raw_provider_payload = payload

async def handle_call_answered(db: AsyncSession, payload: dict) -> None:
    conversation_id = payload.get("conversation_id")
    stmt = select(Call).where(Call.elevenlabs_conversation_id == conversation_id)
    result = await db.execute(stmt)
    call = result.scalar_one_or_none()
    
    if not call:
        return

    call.status = CallStatus.in_progress
    call.answered_at = datetime.fromtimestamp(payload.get("timestamp")) if payload.get("timestamp") else datetime.now()
    
    if call.contact_id:
        await db.execute(
            update(Contact)
            .where(Contact.id == call.contact_id)
            .values(status=ContactStatus.calling, last_called_at=datetime.now())
        )

async def handle_call_ended(db: AsyncSession, payload: dict) -> None:
    conversation_id = payload.get("conversation_id")
    stmt = select(Call).where(Call.elevenlabs_conversation_id == conversation_id)
    result = await db.execute(stmt)
    call = result.scalar_one_or_none()
    
    if not call:
        logger.error(f"Call with conversation_id {conversation_id} not found during call.ended")
        return

    outcome = payload.get("call_outcome", "completed") # outcome field mapping might vary
    # Assuming mapping outcome to CallStatus
    status_map = {
        "completed": CallStatus.completed,
        "voicemail": CallStatus.voicemail,
        "transferred": CallStatus.transferred,
        "busy": CallStatus.busy,
        "no_answer": CallStatus.no_answer,
    }
    call.status = status_map.get(outcome, CallStatus.completed)
    call.ended_at = datetime.now()
    call.duration_seconds = payload.get("duration_seconds")
    call.recording_url = payload.get("recording_url")
    call.outcome = outcome
    call.is_voicemail = payload.get("is_voicemail", False)
    call.was_transferred = payload.get("was_transferred", False)
    call.transfer_destination = payload.get("transfer_destination")
    
    # Costs
    costs = payload.get("cost_breakdown", {})
    call.cost_telephony_cents = int(costs.get("telephony", 0) * 100)
    call.cost_llm_cents = int(costs.get("llm", 0) * 100)
    call.cost_tts_cents = int(costs.get("tts", 0) * 100)
    call.cost_stt_cents = int(costs.get("stt", 0) * 100)
    
    # Latency
    latency = payload.get("latency_stats", {}) # Mapping might differ
    call.latency_p50_ms = latency.get("p50")
    call.latency_p95_ms = latency.get("p95")
    call.latency_p99_ms = latency.get("p99")
    
    call.raw_provider_payload = payload

    # Update Contact
    if call.contact_id:
        await db.execute(
            update(Contact)
            .where(Contact.id == call.contact_id)
            .values(
                status=ContactStatus.called, 
                last_called_at=datetime.now(),
                last_outcome=outcome
            )
        )

    # Update Campaign Counters (Atomic)
    if call.campaign_id:
        await db.execute(
            update(Campaign)
            .where(Campaign.id == call.campaign_id)
            .values(
                contacts_called=Campaign.contacts_called + 1,
                contacts_remaining=Campaign.contacts_remaining - 1,
                calls_successful=Campaign.calls_successful + (1 if call.status == CallStatus.completed else 0),
                calls_failed=Campaign.calls_failed + (1 if call.status == CallStatus.failed else 0),
                total_spend_cents=Campaign.total_spend_cents + (
                    call.cost_telephony_cents + call.cost_llm_cents + call.cost_tts_cents + call.cost_stt_cents
                )
            )
        )

    # Update PhoneNumber stats
    if call.phone_number_id:
        # Assuming calls_made field exists on PhoneNumber
        pass

    # Update Agent stats
    if call.agent_id:
        # Assuming total_calls field exists on Agent
        pass

async def handle_transcript(db: AsyncSession, payload: dict) -> None:
    conversation_id = payload.get("conversation_id")
    stmt = select(Call).where(Call.elevenlabs_conversation_id == conversation_id)
    result = await db.execute(stmt)
    call = result.scalar_one_or_none()
    
    if not call:
        return

    transcript_data = payload.get("transcript", [])
    for idx, turn in enumerate(transcript_data):
        speaker_map = {
            "agent": TranscriptSpeaker.agent,
            "user": TranscriptSpeaker.user,
            "tool": TranscriptSpeaker.tool,
            "system": TranscriptSpeaker.system
        }
        
        new_transcript = CallTranscript(
            call_id=call.id,
            sequence=idx + 1,
            speaker=speaker_map.get(turn.get("role"), TranscriptSpeaker.user),
            text=turn.get("message"),
            timestamp_secs=turn.get("time_in_call_secs"),
            latency_ms=turn.get("latency_ms"),
            tool_name=turn.get("tool_name"),
            tool_payload=turn.get("tool_response")
        )
        db.add(new_transcript)
    
    await db.flush()
    # Post-call processing trigger
    await run_post_call_processing(db, call)

async def handle_summary(db: AsyncSession, payload: dict) -> None:
    conversation_id = payload.get("conversation_id")
    stmt = select(Call).where(Call.elevenlabs_conversation_id == conversation_id)
    result = await db.execute(stmt)
    call = result.scalar_one_or_none()
    
    if call:
        call.summary = payload.get("summary")

async def handle_call_failed(db: AsyncSession, payload: dict) -> None:
    conversation_id = payload.get("conversation_id")
    stmt = select(Call).where(Call.elevenlabs_conversation_id == conversation_id)
    result = await db.execute(stmt)
    call = result.scalar_one_or_none()
    
    if not call:
        return

    call.status = CallStatus.failed
    call.ended_at = datetime.now()
    call.error_code = payload.get("error_code")
    call.error_message = payload.get("error_message")
    call.raw_provider_payload = payload

    if call.contact_id:
        contact_stmt = select(Contact).where(Contact.id == call.contact_id)
        contact_res = await db.execute(contact_stmt)
        contact = contact_res.scalar_one_or_none()
        
        if contact:
            contact.status = ContactStatus.failed
            contact.retry_count += 1
            
            # Retry logic
            if call.campaign_id:
                camp_stmt = select(Campaign).where(Campaign.id == call.campaign_id)
                camp_res = await db.execute(camp_stmt)
                campaign = camp_res.scalar_one_or_none()
                
                if campaign and contact.retry_count < campaign.max_retries:
                    # Check if error is in retry_on_outcomes
                    # This is a simplified check
                    contact.next_retry_at = datetime.now() + timedelta(minutes=campaign.retry_delay_minutes)

    if call.campaign_id:
        await db.execute(
            update(Campaign)
            .where(Campaign.id == call.campaign_id)
            .values(calls_failed=Campaign.calls_failed + 1)
        )

async def run_post_call_processing(db: AsyncSession, call: Call) -> None:
    """Run summary generation and data extraction."""
    # 1. AI Summary if missing
    if not call.summary:
        # Placeholder for LLM call
        pass

    # 2. Data collection extract
    # This would involve querying agent config and extraction values via LLM
    pass

    # 3. Fire outgoing webhooks
    # This would involve querying workspace webhook endpoints
    pass
