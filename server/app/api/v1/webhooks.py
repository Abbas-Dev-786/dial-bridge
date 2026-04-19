import json
from fastapi import APIRouter, Request, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db
from app.database import AsyncSessionLocal
from app.services.webhook_handler import (
    verify_elevenlabs_signature, 
    handle_elevenlabs_event,
    handle_initiation_webhook
)
from app.config import settings

# This router is included without a prefix in main.py, 
# so we define the full path here or move it to v1_router.
# Here we use the /api/v1 prefix manually to match agent_service.py expectations.
router = APIRouter(prefix="/api/v1/webhooks/elevenlabs")

async def process_webhook_bg(payload: dict):
    async with AsyncSessionLocal() as db:
        await handle_elevenlabs_event(db, payload)

@router.post("/post-call", status_code=200)
async def elevenlabs_post_call_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
):
    """Handles ElevenLabs post-call webhooks (transcription, audio, failure)."""
    body = await request.body()
    signature = request.headers.get("elevenlabs-signature", "")

    # Verify signature against the raw body before parsing JSON.
    if settings.elevenlabs_webhook_secret:
        if not verify_elevenlabs_signature(body, signature, settings.elevenlabs_webhook_secret):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Process in background
    background_tasks.add_task(process_webhook_bg, payload)
    
    return {"received": True}

@router.post("/initiation", status_code=200)
async def elevenlabs_initiation_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handles the ElevenLabs Conversation Initiation Webhook.
    Fires when the conversation starts. Performs synchronous DB update.
    """
    body = await request.body()
    signature = request.headers.get("elevenlabs-signature", "")

    # Verify Signature
    if settings.elevenlabs_webhook_secret:
        if not verify_elevenlabs_signature(body, signature, settings.elevenlabs_webhook_secret):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Process synchronously because we might want to return dynamic variables
    response_data = await handle_initiation_webhook(db, payload)
    
    return response_data
