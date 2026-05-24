import uuid
from datetime import datetime
from sqlalchemy.orm import joinedload, selectinload
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
    CampaignAssignPhoneNumber,
    AgentGenerationPreview,
    CampaignResponse
)
from app.schemas.agent import AgentResponse
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
from app.models.user import User
from app.schemas.agent import AgentUpdate

async def create_campaign(
    db: AsyncSession,
    workspace: Workspace,
    user: User,
    data: CampaignCreate,
) -> Campaign:
    from app.services.agent_generation_service import (
        generate_agent_config,
        build_agent_create,
    )
    from app.services.agent_service import create_agent

    # 1. Generate agent config from the campaign goal via AI
    generated_config, was_generated = await generate_agent_config(
        goal=data.goal_description,
        workspace_name=workspace.name,
    )

    # 2. Build AgentCreate from the generated config
    agent_create = build_agent_create(generated_config, data.name)

    # 3. Create the agent (pushes to ElevenLabs internally)
    agent = await create_agent(db, workspace, user, agent_create)

    # 4. Create the Campaign row
    campaign = Campaign(
        workspace_id           = workspace.id,
        created_by             = user.id,
        name                   = data.name,
        goal_description       = data.goal_description,
        status                 = CampaignStatus.draft,
        agent_id               = agent.id,
        kb_sync_status         = KBSyncStatus.pending,
        agent_was_generated    = was_generated,
        agent_generation_failed= not was_generated,
        timezone               = data.timezone,
        schedule_days          = data.schedule_days,
        schedule_start_time    = datetime.strptime(data.schedule_start_time, "%H:%M").time(),
        schedule_end_time      = datetime.strptime(data.schedule_end_time, "%H:%M").time(),
        start_date             = data.start_date,
        end_date               = data.end_date,
        max_concurrency        = data.max_concurrency,
        max_retries            = data.max_retries,
        retry_delay_minutes    = data.retry_delay_minutes,
        retry_on_outcomes      = data.retry_on_outcomes,
        dnc_check_enabled      = data.dnc_check_enabled,
        record_calls           = data.record_calls,
        tcpa_mode              = data.tcpa_mode,
        voicemail_detection    = data.voicemail_detection,
        leave_voicemail        = data.leave_voicemail,
        caller_id_display_name = data.caller_id_display_name,
    )
    db.add(campaign)
    await db.flush()
    
    await log_action(
        db, workspace.id, "campaign.created", "campaign", campaign.id, actor_user_id=user.id
    )
    
    await db.commit()
    # Re-fetch with all relations for the response builder
    return await get_campaign(db, workspace.id, campaign.id)

async def get_campaign(db: AsyncSession, workspace_id: uuid.UUID, campaign_id: uuid.UUID) -> Campaign:
    result = await db.execute(
        select(Campaign)
        .options(
            joinedload(Campaign.agent).selectinload(Agent.tools),
            joinedload(Campaign.agent).selectinload(Agent.voice_config),
            joinedload(Campaign.agent).selectinload(Agent.conversation_config),
            joinedload(Campaign.phone_number)
        )
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
    await _apply_campaign_progress_aggregates(db, [campaign])
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
    campaigns = list(result.scalars().all())
    await _apply_campaign_progress_aggregates(db, campaigns)
    return campaigns

async def update_campaign(db: AsyncSession, campaign: Campaign, data: CampaignUpdate) -> Campaign:
    update_data = data.model_dump(exclude_none=True)

    
    for key, value in update_data.items():
        if key == "schedule_start_time" and isinstance(value, str):
            value = datetime.strptime(value, "%H:%M").time()
        if key == "schedule_end_time" and isinstance(value, str):
            value = datetime.strptime(value, "%H:%M").time()
        setattr(campaign, key, value)
    
    await db.commit()
    # Re-fetch with all relations for the response builder
    return await get_campaign(db, campaign.workspace_id, campaign.id)

# assign_agent removed - agents are auto-created and managed via agent detail endpoints.

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
    # Re-fetch with all relations for the response builder
    return await get_campaign(db, campaign.workspace_id, campaign.id)

async def transition_status(db: AsyncSession, campaign: Campaign, new_status: CampaignStatus, workspace: Workspace | None = None) -> Campaign:
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
            await kb_service.sync_campaign_kb(db, campaign)
            
        result = await db.execute(select(PhoneNumber).where(PhoneNumber.id == campaign.phone_number_id))
        phone = result.scalar_one_or_none()
        
        from app.services.elevenlabs_client import ElevenLabsClient
        try:
            async with ElevenLabsClient() as client:
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
            from app.services.elevenlabs_client import ElevenLabsClient
            async with ElevenLabsClient() as client:
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
            from app.services.elevenlabs_client import ElevenLabsClient
            async with ElevenLabsClient() as client:
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
    # Re-fetch with all relations for the response builder
    return await get_campaign(db, campaign.workspace_id, campaign.id)

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
    
    agent = await db.get(Agent, campaign.agent_id) if campaign.agent_id else None
        
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
            from app.services.elevenlabs_client import ElevenLabsClient
            async with ElevenLabsClient() as client:
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

def build_campaign_response(campaign: Campaign) -> CampaignResponse:
    agent_gen = None
    if campaign.agent:
        agent = campaign.agent
        tools_enabled = [
            t.name for t in (agent.tools or []) if t.is_enabled
        ]
        voice_name = agent.voice_config.voice_name if agent.voice_config else None
        system_prompt = agent.system_prompt or ""

        fallback_warning = None
        if campaign.agent_generation_failed:
            fallback_warning = (
                "AI agent generation failed. A default agent was created. "
                "Review the system prompt and adjust it for your campaign goal."
            )

        agent_gen = AgentGenerationPreview(
            agent_name=agent.name,
            first_message=agent.first_message or "",
            system_prompt_preview=system_prompt[:200] + ("..." if len(system_prompt) > 200 else ""),
            voice_name=voice_name,
            tools_enabled=tools_enabled,
            was_generated=campaign.agent_was_generated,
            generation_failed=campaign.agent_generation_failed,
            fallback_warning=fallback_warning,
        )

    return CampaignResponse(
        id=campaign.id,
        workspace_id=campaign.workspace_id,
        name=campaign.name,
        goal_description=campaign.goal_description,
        status=campaign.status,
        agent_id=campaign.agent_id,
        agent_name=campaign.agent.name if campaign.agent else None,
        agent=AgentResponse.model_validate(campaign.agent) if campaign.agent else None,
        agent_generation=agent_gen,
        phone_number_id=campaign.phone_number_id,
        phone_number=campaign.phone_number.number if campaign.phone_number else None,
        kb_sync_status=campaign.kb_sync_status,
        kb_last_synced_at=campaign.kb_last_synced_at,
        timezone=campaign.timezone,
        schedule_days=campaign.schedule_days,
        schedule_start_time=campaign.schedule_start_time.strftime("%H:%M"),
        schedule_end_time=campaign.schedule_end_time.strftime("%H:%M"),
        max_concurrency=campaign.max_concurrency,
        max_retries=campaign.max_retries,
        retry_delay_minutes=campaign.retry_delay_minutes,
        retry_on_outcomes=campaign.retry_on_outcomes,
        dnc_check_enabled=campaign.dnc_check_enabled,
        record_calls=campaign.record_calls,
        tcpa_mode=campaign.tcpa_mode,
        voicemail_detection=campaign.voicemail_detection,
        leave_voicemail=campaign.leave_voicemail,
        contacts_total=campaign.contacts_total,
        contacts_called=campaign.contacts_called,
        contacts_remaining=campaign.contacts_remaining,
        contacts_pending=getattr(campaign, "contacts_pending", 0),
        contacts_calling=getattr(campaign, "contacts_calling", 0),
        contacts_reached=getattr(campaign, "contacts_reached", 0),
        calls_successful=campaign.calls_successful,
        calls_failed=campaign.calls_failed,
        total_spend_cents=campaign.total_spend_cents,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


def _stop_feeder(campaign: Campaign) -> None:
    """Revoke the active feeder task for a campaign."""
    if campaign.feeder_task_id:
        # terminate=False lets the current iteration finish cleanly
        AsyncResult(campaign.feeder_task_id).revoke(terminate=False)
        campaign.feeder_task_id = None


async def _apply_campaign_progress_aggregates(
    db: AsyncSession,
    campaigns: list[Campaign],
) -> None:
    campaign_ids = [campaign.id for campaign in campaigns]
    if not campaign_ids:
        return

    progress_rows = await db.execute(
        select(
            Contact.campaign_id,
            func.count(Contact.id)
            .filter(Contact.status == ContactStatus.pending)
            .label("contacts_pending"),
            func.count(Contact.id)
            .filter(Contact.status == ContactStatus.calling)
            .label("contacts_calling"),
            func.count(Contact.id)
            .filter(
                Contact.status.in_(
                    [
                        ContactStatus.calling,
                        ContactStatus.called,
                        ContactStatus.failed,
                    ]
                )
            )
            .label("contacts_reached"),
        )
        .where(
            and_(
                Contact.campaign_id.in_(campaign_ids),
                Contact.deleted_at.is_(None),
            )
        )
        .group_by(Contact.campaign_id)
    )

    progress_map = {
        row.campaign_id: {
            "contacts_pending": row.contacts_pending or 0,
            "contacts_calling": row.contacts_calling or 0,
            "contacts_reached": row.contacts_reached or 0,
        }
        for row in progress_rows
    }

    for campaign in campaigns:
        progress = progress_map.get(
            campaign.id,
            {
                "contacts_pending": 0,
                "contacts_calling": 0,
                "contacts_reached": 0,
            },
        )
        campaign.contacts_pending = progress["contacts_pending"]
        campaign.contacts_calling = progress["contacts_calling"]
        campaign.contacts_reached = progress["contacts_reached"]
