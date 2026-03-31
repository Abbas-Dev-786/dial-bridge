from uuid import UUID
from typing import List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.call import Call, CallTranscript, CallEvaluation, CallCollectedData
from app.models.contact import Contact
from app.models.agent import Agent
from app.models.campaign import Campaign
from app.schemas.call import CallListItem, CallDetailResponse, CallListResponse, CallTranscriptResponse
from app.exceptions import NotFoundError

async def get_call(db: AsyncSession, workspace_id: UUID, call_id: UUID) -> CallDetailResponse:
    stmt = (
        select(Call)
        .where(and_(Call.id == call_id, Call.workspace_id == workspace_id))
        .options(
            selectinload(Call.transcripts),
            selectinload(Call.evaluations),
            selectinload(Call.collected_data),
            selectinload(Call.agent),
            selectinload(Call.contact),
            selectinload(Call.campaign)
        )
    )
    result = await db.execute(stmt)
    call = result.scalar_one_or_none()
    if not call:
        raise NotFoundError("Call")
    
    # Calculate mapping for response
    # transcripts, evaluations, collected_data are eager loaded
    return CallDetailResponse.model_validate(call)

async def list_calls(
    db: AsyncSession, 
    workspace_id: UUID, 
    campaign_id: Optional[UUID] = None, 
    contact_id: Optional[UUID] = None, 
    status: Optional[List[str]] = None, 
    page: int = 1, 
    page_size: int = 50
) -> CallListResponse:
    query = select(Call).where(Call.workspace_id == workspace_id)
    
    if campaign_id:
        query = query.where(Call.campaign_id == campaign_id)
    if contact_id:
        query = query.where(Call.contact_id == contact_id)
    if status:
        query = query.where(Call.status.in_(status))
    
    # Pagination count
    total_stmt = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(total_stmt)
    total = total_res.scalar_one()
    
    query = query.order_by(Call.started_at.desc().nulls_last()).limit(page_size).offset((page - 1) * page_size)
    query = query.options(
        selectinload(Call.agent),
        selectinload(Call.contact),
        selectinload(Call.campaign)
    )
    
    result = await db.execute(query)
    calls = result.scalars().all()
    
    items = []
    for call in calls:
        item = CallListItem.model_validate(call)
        # Handle computed fields or relationships not directly mapped by from_attributes
        item.contact_name = call.contact.full_name if call.contact else None
        item.contact_phone = call.contact.phone if call.contact else None
        item.agent_name = call.agent.name if call.agent else None
        item.campaign_name = call.campaign.name if call.campaign else None
        item.total_cost_cents = (call.cost_telephony_cents or 0) + (call.cost_llm_cents or 0) + (call.cost_tts_cents or 0) + (call.cost_stt_cents or 0)
        items.append(item)
    
    return CallListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=total > page * page_size
    )

async def list_call_transcripts(db: AsyncSession, workspace_id: UUID, call_id: UUID) -> List[CallTranscript]:
    # Ensure call belongs to workspace
    stmt = select(Call).where(and_(Call.id == call_id, Call.workspace_id == workspace_id))
    result = await db.execute(stmt)
    call = result.scalar_one_or_none()
    if not call:
        raise NotFoundError("Call")
    
    stmt = select(CallTranscript).where(CallTranscript.call_id == call_id).order_by(CallTranscript.sequence.asc())
    result = await db.execute(stmt)
    return result.scalars().all()

async def get_call_recording_url(db: AsyncSession, workspace_id: UUID, call_id: UUID) -> Optional[str]:
    stmt = select(Call.recording_url).where(and_(Call.id == call_id, Call.workspace_id == workspace_id))
    result = await db.execute(stmt)
    url = result.scalar_one_or_none()
    if url is None:
         # Need to check if call exists to raise NotFound if appropriate
         check_stmt = select(Call.id).where(and_(Call.id == call_id, Call.workspace_id == workspace_id))
         if not (await db.execute(check_stmt)).scalar_one_or_none():
             raise NotFoundError("Call")
    return url
