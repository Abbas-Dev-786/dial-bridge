import hmac
import hashlib
import json
import httpx
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.background.celery_app import celery_app
from app.background.utils import async_task
from app.database import AsyncSessionLocal
from app.models.platform import WebhookEndpoint, WebhookDelivery
from app.models.call import Call
from app.enums import WebhookDeliveryStatus

@celery_app.task
@async_task
async def deliver_webhook(delivery_id: str):
    """Celery task to deliver a webhook with retries."""
    async with AsyncSessionLocal() as db:
        stmt = (
            select(WebhookDelivery)
            .where(WebhookDelivery.id == UUID(delivery_id))
            .options(selectinload(WebhookDelivery.endpoint))
        )
        result = await db.execute(stmt)
        delivery = result.scalar_one_or_none()
        
        if not delivery or delivery.status == WebhookDeliveryStatus.success:
            return

        endpoint = delivery.endpoint
        payload_json = json.dumps(delivery.payload)
        
        # Sign the payload
        signature = ""
        if endpoint.signing_secret_enc:
            # In production, decrypt the secret first
            secret = endpoint.signing_secret_enc.encode()
            signature = hmac.new(secret, payload_json.encode(), hashlib.sha256).hexdigest()

        headers = {
            "Content-Type": "application/json",
            "X-DialBridge-Signature": signature,
            "X-DialBridge-Event": delivery.event_type,
            "X-DialBridge-Delivery": str(delivery.id),
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    endpoint.url,
                    content=payload_json,
                    headers=headers,
                    timeout=10.0
                )
                
                delivery.http_status_code = response.status_code
                if response.is_success:
                    delivery.status = WebhookDeliveryStatus.success
                    delivery.delivered_at = datetime.utcnow()
                else:
                    delivery.response_body = response.text[:1000]
                    await _handle_delivery_failure(db, delivery, endpoint)
                    
        except Exception as e:
            delivery.http_status_code = 0
            delivery.response_body = str(e)[:1000]
            await _handle_delivery_failure(db, delivery, endpoint)
            
        await db.commit()

async def _handle_delivery_failure(db, delivery, endpoint):
    if delivery.attempt_number < endpoint.max_retries:
        delivery.status = WebhookDeliveryStatus.retrying
        delivery.attempt_number += 1
        
        # Exponential backoff: 1min, 5min, 30min
        backoff_minutes = [1, 5, 30, 60, 120]
        delay = backoff_minutes[min(delivery.attempt_number - 2, len(backoff_minutes) - 1)]
        delivery.next_retry_at = datetime.utcnow() + timedelta(minutes=delay)
        
        # Schedule retry
        deliver_webhook.apply_async(
            args=[str(delivery.id)],
            eta=delivery.next_retry_at
        )
    else:
        delivery.status = WebhookDeliveryStatus.failed

async def enqueue_webhook_delivery(db, call: Call, event_type: str) -> None:
    """Helper to create delivery rows and enqueue tasks."""
    # Find active endpoints for this workspace and event type
    # For Postgres ARRAY, we use contains
    stmt = select(WebhookEndpoint).where(
        WebhookEndpoint.workspace_id == call.workspace_id,
        WebhookEndpoint.is_active == True,
        WebhookEndpoint.events.contains([event_type])
    )
    result = await db.execute(stmt)
    endpoints = result.scalars().all()
    
    for endpoint in endpoints:
        delivery = WebhookDelivery(
            workspace_id=call.workspace_id,
            endpoint_id=endpoint.id,
            call_id=call.id,
            event_type=event_type,
            payload=build_call_completed_payload(call),
            status=WebhookDeliveryStatus.pending,
            attempt_number=1,
        )
        db.add(delivery)
        await db.flush() # Get delivery ID
        deliver_webhook.delay(str(delivery.id))

def build_call_completed_payload(call: Call) -> dict:
    return {
        "event": "call.completed",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "call_id": str(call.id),
            "campaign_id": str(call.campaign_id),
            "contact": {
                "id": str(call.contact_id) if call.contact_id else None,
                "name": call.contact.full_name if call.contact else None,
                "phone": call.to_number,
            },
            "outcome": call.outcome,
            "sentiment": str(call.sentiment.value) if call.sentiment else None,
            "duration_seconds": call.duration_seconds,
            "summary": call.summary,
            "recording_url": call.recording_url,
            "cost_cents": (
                (call.cost_telephony_cents or 0) + 
                (call.cost_llm_cents or 0) + 
                (call.cost_tts_cents or 0) + 
                (call.cost_stt_cents or 0)
            ),
        }
    }
