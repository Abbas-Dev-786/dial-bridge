import uuid
from datetime import datetime
from sqlalchemy.orm import joinedload
from sqlalchemy import select, and_, or_, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from celery.result import AsyncResult
from fastapi import status

from app.models.campaign import Campaign
from app.models.contact import Contact
from app.models.knowledge import CampaignKBSnapshot, KnowledgeDocument
from app.models.agent import Agent
from app.models.phone_number import PhoneNumber
from app.models.workspace import Workspace
from app.schemas.campaign import (
    CampaignCreate, 
    CampaignUpdate, 
    CampaignAssignAgent, 
    CampaignAssignPhoneNumber
)
from app.enums import (
    CampaignStatus, 
    KBSyncStatus, 
    KBSnapshotTrigger,
    PhoneNumberStatus,
    ContactStatus
)
from app.exceptions import (
    NotFoundError, 
    ConflictError, 
    ValidationError, 
    ElevenLabsError
)
from app.services.elevenlabs_client import get_elevenlabs_client
from app.utils.audit import log_action

from app.services import kb_service

async def create_campaign(db: AsyncSession, workspace: Workspace, user_id: uuid.UUID, data: CampaignCreate) -> Campaign:
    # 1. If agent_id provided: verify agent belongs to workspace
    if data.agent_id:
        result = await db.execute(select(Agent).where(Agent.id == data.agent_id))
        agent = result.scalar_one_or_none()
        if not agent or agent.workspace_id != workspace.id:
            raise NotFoundError("Agent")
        
        # 2. If agent_id provided: verify agent is not in another active campaign
        result = await db.execute(
            select(Campaign).where(
                and_(
                    Campaign.agent_id == data.agent_id,
                    Campaign.status.in_([CampaignStatus.live, CampaignStatus.scheduled]),
                    Campaign.deleted_at.is_(None)
                )
            )
        )
        blocking_campaign = result.scalar_one_or_none()
        if blocking_campaign:
            raise ConflictError(
                f"{agent.name} is active in '{blocking_campaign.name}'. Pause that campaign first."
            )

    # 3. If phone_number_id provided: verify number belongs to workspace and is active
    if data.phone_number_id:
        result = await db.execute(select(PhoneNumber).where(PhoneNumber.id == data.phone_number_id))
        phone = result.scalar_one_or_none()
        if not phone or phone.workspace_id != workspace.id:
            raise NotFoundError("PhoneNumber")
        if phone.status != PhoneNumberStatus.active:
            raise ValidationError("Phone number is not active")

    # 4. Create Campaign row, status = draft
    campaign = Campaign(
        workspace_id=workspace.id,
        created_by=user_id,
        **data.model_dump()
    )
    db.add(campaign)
    await db.flush()
    
    await log_action(
        db, workspace.id, "campaign.created", "campaign", campaign.id, actor_user_id=user_id
    )
    
    await db.commit()
    await db.refresh(campaign)
    return campaign

async def get_campaign(db: AsyncSession, workspace_id: uuid.UUID, campaign_id: uuid.UUID) -> Campaign:
    result = await db.execute(
        select(Campaign)
        .options(joinedload(Campaign.agent), joinedload(Campaign.phone_number))
        .where(
            and_(
                Campaign.id == campaign_id,
                Campaign.workspace_id == workspace_id,
                Campaign.deleted_at.is_(None)
            )
        )
    )
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise NotFoundError("Campaign")
    return campaign

async def list_campaigns(db: AsyncSession, workspace_id: uuid.UUID, status: CampaignStatus | list[CampaignStatus] | None = None) -> list[Campaign]:
    query = select(Campaign).options(
        joinedload(Campaign.agent), 
        joinedload(Campaign.phone_number)
    ).where(
        and_(
            Campaign.workspace_id == workspace_id,
            Campaign.deleted_at.is_(None)
        )
    )
    
    if status:
        if isinstance(status, list):
            query = query.where(Campaign.status.in_(status))
        else:
            query = query.where(Campaign.status == status)
            
    result = await db.execute(query)
    return list(result.scalars().all())

async def update_campaign(db: AsyncSession, campaign: Campaign, data: CampaignUpdate) -> Campaign:
    live_blocked_fields = [
        "schedule_days", "schedule_start_time", "schedule_end_time", 
        "start_date", "max_concurrency", "max_retries", 
        "retry_delay_minutes", "retry_on_outcomes"
    ]
    
    update_data = data.model_dump(exclude_none=True)
    if campaign.status == CampaignStatus.live:
        for field in live_blocked_fields:
            if field in update_data:
                raise ConflictError(f"Cannot change {field} while campaign is live. Pause it first.")
    
    for key, value in update_data.items():
        setattr(campaign, key, value)
    
    await db.commit()
    await db.refresh(campaign)
    return campaign

async def assign_agent(db: AsyncSession, campaign: Campaign, data: CampaignAssignAgent) -> Campaign:
    if campaign.status == CampaignStatus.live:
        raise ConflictError("Cannot reassign agent to a live campaign. Pause it first.")
    
    result = await db.execute(select(Agent).where(Agent.id == data.agent_id))
    agent = result.scalar_one_or_none()
    if not agent or agent.workspace_id != campaign.workspace_id:
        raise NotFoundError("Agent")
    
    result = await db.execute(
        select(Campaign).where(
            and_(
                Campaign.agent_id == data.agent_id,
                Campaign.status.in_([CampaignStatus.live, CampaignStatus.scheduled]),
                Campaign.deleted_at.is_(None),
                Campaign.id != campaign.id
            )
        )
    )
    blocking_campaign = result.scalar_one_or_none()
    if blocking_campaign:
        raise ConflictError(
            f"{agent.name} is active in '{blocking_campaign.name}'. Pause that campaign first."
        )
    
    if campaign.agent_id and campaign.kb_sync_status == KBSyncStatus.synced:
        await take_kb_snapshot(db, campaign, KBSnapshotTrigger.agent_reassigned)
    
    campaign.agent_id = data.agent_id
    campaign.kb_sync_status = KBSyncStatus.pending
    
    await log_action(
        db, campaign.workspace_id, "campaign.agent_assigned", "campaign", campaign.id,
        diff={"agent_id": str(data.agent_id)}
    )
    
    await db.commit()
    await db.refresh(campaign)
    return campaign

async def assign_phone_number(db: AsyncSession, campaign: Campaign, data: CampaignAssignPhoneNumber) -> Campaign:
    if campaign.status == CampaignStatus.live:
        raise ConflictError("Cannot change phone number while campaign is live. Pause it first.")
    
    result = await db.execute(select(PhoneNumber).where(PhoneNumber.id == data.phone_number_id))
    phone = result.scalar_one_or_none()
    if not phone or phone.workspace_id != campaign.workspace_id:
        raise NotFoundError("PhoneNumber")
    if phone.status != PhoneNumberStatus.active:
        raise ValidationError("Phone number is not active")
    
    result = await db.execute(
        select(Campaign).where(
            and_(
                Campaign.phone_number_id == data.phone_number_id,
                Campaign.status.in_([CampaignStatus.live, CampaignStatus.scheduled]),
                Campaign.deleted_at.is_(None),
                Campaign.id != campaign.id
            )
        )
    )
    blocking_campaign = result.scalar_one_or_none()
    if blocking_campaign:
        raise ConflictError(f"Phone number is already active in campaign '{blocking_campaign.name}'")
    
    campaign.phone_number_id = data.phone_number_id
    await db.commit()
    await db.refresh(campaign)
    return campaign

async def transition_status(db: AsyncSession, campaign: Campaign, new_status: CampaignStatus, workspace: Workspace) -> Campaign:
    current = campaign.status
    valid_transitions = {
        CampaignStatus.draft: [CampaignStatus.scheduled, CampaignStatus.live],
        CampaignStatus.scheduled: [CampaignStatus.live, CampaignStatus.paused, CampaignStatus.archived],
        CampaignStatus.live: [CampaignStatus.paused, CampaignStatus.completed],
        CampaignStatus.paused: [CampaignStatus.live, CampaignStatus.completed, CampaignStatus.archived],
        CampaignStatus.completed: [CampaignStatus.archived],
        CampaignStatus.archived: []
    }
    
    if new_status not in valid_transitions.get(current, []):
        raise ValidationError(f"Invalid transition from {current} to {new_status}")
    
    if new_status == CampaignStatus.live:
        if not campaign.agent_id:
            raise ValidationError("An agent must be assigned before going live")
        if not campaign.phone_number_id:
            raise ValidationError("A phone number must be assigned before going live")
        if campaign.contacts_total == 0:
            raise ValidationError("Campaign must have at least one contact before going live")
            
        result = await db.execute(select(Agent).where(Agent.id == campaign.agent_id))
        agent = result.scalar_one_or_none()
        
        result = await db.execute(
            select(Campaign).where(
                and_(
                    Campaign.agent_id == campaign.agent_id,
                    Campaign.status.in_([CampaignStatus.live, CampaignStatus.scheduled]),
                    Campaign.deleted_at.is_(None),
                    Campaign.id != campaign.id
                )
            )
        )
        blocking_campaign = result.scalar_one_or_none()
        if blocking_campaign:
            raise ConflictError(f"{agent.name} is already active in campaign '{blocking_campaign.name}'")
            
        if campaign.kb_sync_status != KBSyncStatus.synced:
            await kb_service.sync_campaign_kb(db, campaign, workspace)
            
        result = await db.execute(select(PhoneNumber).where(PhoneNumber.id == campaign.phone_number_id))
        phone = result.scalar_one_or_none()
        
        client = await get_elevenlabs_client(workspace)
        try:
            await client.assign_phone_to_agent(
                phone.elevenlabs_number_id, 
                agent.elevenlabs_agent_id
            )
        except Exception as e:
            raise ElevenLabsError(str(e))
            
        campaign.status = CampaignStatus.live
        
        # Start the feeder — one per campaign, runs until paused/completed
        from app.background.dialer import feed_campaign_contacts
        new_task = feed_campaign_contacts.delay(str(campaign.id))
        campaign.feeder_task_id = new_task.id

    elif new_status == CampaignStatus.paused:
        _stop_feeder(campaign)
        campaign.status = CampaignStatus.paused
        await take_kb_snapshot(db, campaign, KBSnapshotTrigger.paused)
        
        # Reset contacts stuck in 'calling'
        await db.execute(
            update(Contact)
            .where(
                and_(
                    Contact.campaign_id == campaign.id,
                    Contact.status == ContactStatus.calling
                )
            )
            .values(status=ContactStatus.pending, next_retry_at=None)
        )
        
        result = await db.execute(select(PhoneNumber).where(PhoneNumber.id == campaign.phone_number_id))
        phone = result.scalar_one_or_none()
        if phone:
            client = await get_elevenlabs_client(workspace)
            try:
                await client.unassign_phone_from_agent(phone.elevenlabs_number_id)
            except Exception:
                pass

    elif new_status == CampaignStatus.completed:
        _stop_feeder(campaign)
        campaign.status = CampaignStatus.completed
        await take_kb_snapshot(db, campaign, KBSnapshotTrigger.completed)
        
        result = await db.execute(select(PhoneNumber).where(PhoneNumber.id == campaign.phone_number_id))
        phone = result.scalar_one_or_none()
        if phone:
            client = await get_elevenlabs_client(workspace)
            try:
                await client.unassign_phone_from_agent(phone.elevenlabs_number_id)
            except Exception:
                pass

    elif new_status == CampaignStatus.scheduled:
        if not campaign.agent_id:
            raise ValidationError("An agent must be assigned before scheduling")
        if not campaign.phone_number_id:
            raise ValidationError("A phone number must be assigned before scheduling")
        if campaign.contacts_total == 0:
            raise ValidationError("Campaign must have at least one contact before scheduling")
        if not campaign.start_date:
            raise ValidationError("Start date is required for scheduled campaigns")
            
        campaign.status = CampaignStatus.scheduled

    elif new_status == CampaignStatus.archived:
        if current == CampaignStatus.live:
            raise ConflictError("Pause the campaign before archiving")
        campaign.status = CampaignStatus.archived
        campaign.deleted_at = datetime.now()

    await log_action(
        db, campaign.workspace_id, "campaign.status_changed", "campaign", campaign.id,
        diff={"old_status": current, "new_status": new_status}
    )

    await db.commit()
    await db.refresh(campaign)
    return campaign

async def take_kb_snapshot(db: AsyncSession, campaign: Campaign, trigger: KBSnapshotTrigger) -> CampaignKBSnapshot:
    # Fetch all non-deleted KB docs for this campaign
    result = await db.execute(
        select(KnowledgeDocument).where(
            and_(
                KnowledgeDocument.campaign_id == campaign.id,
                KnowledgeDocument.deleted_at.is_(None)
            )
        )
    )
    docs = result.scalars().all()
    
    docs_json = [
        {
            "doc_id": str(doc.id),
            "name": doc.name,
            "doc_type": doc.doc_type,
            "elevenlabs_kb_id": doc.elevenlabs_kb_id,
            "status": doc.status,
            "chunk_count": doc.chunk_count,
            "last_synced_at": doc.last_synced_at.isoformat() if doc.last_synced_at else None,
        }
        for doc in docs
    ]
    
    if not campaign.agent:
        result = await db.execute(select(Agent).where(Agent.id == campaign.agent_id))
        agent = result.scalar_one_or_none()
    else:
        agent = campaign.agent
        
    elevenlabs_agent_id = agent.elevenlabs_agent_id if agent else None
    
    snapshot = CampaignKBSnapshot(
        campaign_id=campaign.id,
        elevenlabs_agent_id=elevenlabs_agent_id,
        campaign_status_at_snapshot=campaign.status,
        triggered_by=trigger,
        documents=docs_json
    )
    db.add(snapshot)
    await db.flush()
    return snapshot

async def delete_campaign(db: AsyncSession, campaign: Campaign, workspace: Workspace) -> None:
    if campaign.status == CampaignStatus.live:
        raise ConflictError("Pause the campaign before deleting")
    
    if campaign.status == CampaignStatus.scheduled and campaign.phone_number_id:
        result = await db.execute(select(PhoneNumber).where(PhoneNumber.id == campaign.phone_number_id))
        phone = result.scalar_one_or_none()
        if phone:
            client = await get_elevenlabs_client(workspace)
            try:
                await client.unassign_phone_from_agent(phone.elevenlabs_number_id)
            except Exception:
                pass
                
    campaign.deleted_at = datetime.now()
    campaign.status = CampaignStatus.archived
    
    await log_action(
        db, campaign.workspace_id, "campaign.deleted", "campaign", campaign.id
    )
    
    await db.commit()

def _stop_feeder(campaign: Campaign) -> None:
    """Revoke the active feeder task for a campaign."""
    if campaign.feeder_task_id:
        # terminate=False lets the current iteration finish cleanly
        AsyncResult(campaign.feeder_task_id).revoke(terminate=False)
        campaign.feeder_task_id = None
