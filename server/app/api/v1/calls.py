from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user, get_workspace_member
from app.services import call_service
from app.schemas.call import CallListResponse, CallDetailResponse, CallTranscriptResponse

router = APIRouter()

@router.get("/{workspace_id}/calls", response_model=CallListResponse)
async def list_calls(
    workspace_id: UUID,
    campaign_id: Optional[UUID] = None,
    contact_id: Optional[UUID] = None,
    status: Optional[List[str]] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    member = Depends(get_workspace_member)
):
    return await call_service.list_calls(
        db, workspace_id, campaign_id, contact_id, status, page, page_size
    )

@router.get("/{workspace_id}/calls/{call_id}", response_model=CallDetailResponse)
async def get_call(
    workspace_id: UUID,
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    member = Depends(get_workspace_member)
):
    return await call_service.get_call(db, workspace_id, call_id)

@router.get("/{workspace_id}/calls/{call_id}/transcript", response_model=List[CallTranscriptResponse])
async def get_call_transcript(
    workspace_id: UUID,
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    member = Depends(get_workspace_member)
):
    return await call_service.list_call_transcripts(db, workspace_id, call_id)

@router.get("/{workspace_id}/calls/{call_id}/recording")
async def get_call_recording(
    workspace_id: UUID,
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    member = Depends(get_workspace_member)
):
    url = await call_service.get_call_recording_url(db, workspace_id, call_id)
    return {"url": url}

@router.get("/{workspace_id}/campaigns/{campaign_id}/calls", response_model=CallListResponse)
async def list_campaign_calls(
    workspace_id: UUID,
    campaign_id: UUID,
    status: Optional[List[str]] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    member = Depends(get_workspace_member)
):
    return await call_service.list_calls(
        db, workspace_id, campaign_id=campaign_id, status=status, page=page, page_size=page_size
    )
