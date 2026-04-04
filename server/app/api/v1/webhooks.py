import json
from fastapi import APIRouter, Request, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.dependencies import get_db
from app.models.call import Call
from app.models.workspace import Workspace
from app.database import AsyncSessionLocal
from app.services.webhook_handler import verify_elevenlabs_signature, handle_elevenlabs_event
from app.config import settings

router = APIRouter()

async def process_webhook_bg(event_type: str, payload: dict):
    async with AsyncSessionLocal() as db:
        await handle_elevenlabs_event(db, event_type, payload)

@router.post("/webhooks/elevenlabs", status_code=200)
async def elevenlabs_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    body = await request.body()
    signature = request.headers.get("elevenlabs-signature", "")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # 1. Verify Signature if secret is set
    if settings.elevenlabs_webhook_secret:
        if not verify_elevenlabs_signature(body, signature, settings.elevenlabs_webhook_secret):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    # Return 200 immediately — process in background
    event_type = payload.get("type")
    background_tasks.add_task(process_webhook_bg, event_type, payload)
    
    return {"received": True}
