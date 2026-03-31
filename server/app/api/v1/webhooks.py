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

    conversation_id = payload.get("conversation_id")
    if conversation_id:
        # Look up the workspace from the call record to verify signature
        stmt = select(Call).where(Call.elevenlabs_conversation_id == conversation_id)
        result = await db.execute(stmt)
        call = result.scalar_one_or_none()

        if call:
            # Need workspace specifically for the secret
            ws_stmt = select(Workspace).where(Workspace.id == call.workspace_id)
            ws_res = await db.execute(ws_stmt)
            workspace = ws_res.scalar_one_or_none()
            
            if workspace and workspace.elevenlabs_webhook_secret_enc:
                if not verify_elevenlabs_signature(body, signature, workspace.elevenlabs_webhook_secret_enc):
                    raise HTTPException(status_code=401, detail="Invalid webhook signature")

    # Return 200 immediately — process in background
    event_type = payload.get("type")
    background_tasks.add_task(process_webhook_bg, event_type, payload)
    
    return {"received": True}
