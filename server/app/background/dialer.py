import asyncio
import logging
from uuid import UUID
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from celery.result import AsyncResult
from sqlalchemy import select, update, func, and_, or_
from sqlalchemy.orm import selectinload

from app.background.celery_app import celery_app
from app.background.utils import async_task
from app.database import AsyncSessionLocal
from app.models.campaign import Campaign
from app.models.contact import Contact
from app.models.call import Call
from app.enums import (
    CampaignStatus, 
    ContactStatus, 
    CallStatus, 
    CallDirection,
    KBSyncStatus
)
from app.services.elevenlabs_client import get_elevenlabs_client

logger = logging.getLogger(__name__)

# Constants for feeder timing
FEEDER_INTERVAL_SECONDS = 10
FEEDER_BACKOFF_SECONDS = 5

@celery_app.task(
    bind=True,
    name="app.background.dialer.feed_campaign_contacts",
    max_retries=None,
    queue="feeders",
)
@async_task
async def feed_campaign_contacts(self, campaign_id: str):
    """
    Feeder task that reschedules itself.
    Continously pulls contacts for a single live campaign.
    """
    async with AsyncSessionLocal() as db:
        # 1. Fetch campaign
        campaign = await db.get(Campaign, UUID(campaign_id))
        if not campaign or campaign.status != CampaignStatus.live:
            logger.info(f"Feeder stopping for campaign {campaign_id}: status is {campaign.status if campaign else 'deleted'}")
            return

        # 2. Check schedule window
        if not _is_within_schedule(campaign):
            logger.debug(f"Campaign {campaign_id} outside schedule window — backing off 60s")
            await _reschedule_feeder(db, campaign, delay=60)
            return

        # 3. Count active calls
        active_stmt = select(func.count(Call.id)).where(
            and_(
                Call.campaign_id == campaign.id,
                Call.status.in_([CallStatus.queued, CallStatus.ringing, CallStatus.in_progress])
            )
        )
        result = await db.execute(active_stmt)
        active_calls = result.scalar() or 0
        
        slots = campaign.max_concurrency - active_calls
        if slots <= 0:
            logger.debug(f"Campaign {campaign_id} at capacity — backing off {FEEDER_BACKOFF_SECONDS}s")
            await _reschedule_feeder(db, campaign, delay=FEEDER_BACKOFF_SECONDS)
            return

        # 4. Fetch next contacts with SKIP LOCKED
        contacts_stmt = (
            select(Contact)
            .where(
                and_(
                    Contact.campaign_id == campaign.id,
                    Contact.status == ContactStatus.pending,
                    Contact.is_dnc.is_(False),
                    or_(
                        Contact.next_retry_at.is_(None),
                        Contact.next_retry_at <= datetime.utcnow()
                    )
                )
            )
            .order_by(Contact.created_at.asc())
            .limit(slots)
            .with_for_update(skip_locked=True)
        )
        result = await db.execute(contacts_stmt)
        contacts = result.scalars().all()
        
        if not contacts:
            # Check if auto-completion is needed
            # (No pending contacts, no active calls)
            if active_calls == 0:
                # Double check for ANY pending contacts (even ones with future retry)
                any_pending_stmt = select(func.count(Contact.id)).where(
                    and_(
                        Contact.campaign_id == campaign.id,
                        Contact.status == ContactStatus.pending
                    )
                )
                any_pending = (await db.execute(any_pending_stmt)).scalar() or 0
                if any_pending == 0:
                    logger.info(f"Campaign {campaign_id} exhausted — auto-completing")
                    await _auto_complete_campaign(db, campaign)
                    return # Stopping feeder
            
            await _reschedule_feeder(db, campaign, delay=FEEDER_INTERVAL_SECONDS)
            return

        # 5. Lock contacts atomically
        contact_ids = [c.id for c in contacts]
        await db.execute(
            update(Contact)
            .where(Contact.id.in_(contact_ids))
            .values(status=ContactStatus.calling)
        )
        await db.commit()

        # 6. Dispatch call tasks
        for contact_id in contact_ids:
            dispatch_call.delay(str(campaign.id), str(contact_id))

        # 7. Reschedule feeder
        await _reschedule_feeder(db, campaign, delay=FEEDER_INTERVAL_SECONDS)

async def _reschedule_feeder(db, campaign, delay):
    new_task = feed_campaign_contacts.apply_async(
        args=[str(campaign.id)],
        countdown=delay,
        queue="feeders"
    )
    campaign.feeder_task_id = new_task.id
    await db.commit()

@celery_app.task(
    bind=True,
    name="app.background.dialer.dispatch_call",
    max_retries=3,
    default_retry_delay=15,
    queue="calls"
)
@async_task
async def dispatch_call(self, campaign_id: str, contact_id: str):
    """
    Task to initiate a single outbound call.
    """
    async with AsyncSessionLocal() as db:
        # Load campaign with related models
        campaign_stmt = (
            select(Campaign)
            .where(Campaign.id == UUID(campaign_id))
            .options(
                selectinload(Campaign.workspace),
                selectinload(Campaign.agent),
                selectinload(Campaign.phone_number)
            )
        )
        campaign = (await db.execute(campaign_stmt)).scalar_one_or_none()
        contact = await db.get(Contact, UUID(contact_id))

        if not campaign or not contact:
            return

        # Guard: campaign may have been paused since feeder dispatched this
        if campaign.status != CampaignStatus.live:
            if contact.status == ContactStatus.calling:
                contact.status = ContactStatus.pending
                await db.commit()
            return

        # Build dynamic variables
        dynamic_vars = {
            "contact_name": contact.full_name or "there",
            "contact_phone": contact.phone,
            "contact_company": contact.company or "",
            "campaign_name": campaign.name,
        }
        if contact.custom_fields:
            dynamic_vars.update({f"custom_{k}": str(v) for k, v in contact.custom_fields.items()})

        # Initiate ElevenLabs call
        try:
            client = await get_elevenlabs_client(campaign.workspace)
            # Create Call row
            call = Call(
                workspace_id=campaign.workspace_id,
                campaign_id=campaign.id,
                agent_id=campaign.agent_id,
                contact_id=contact.id,
                phone_number_id=campaign.phone_number_id,
                direction=CallDirection.outbound,
                from_number=campaign.phone_number.number if campaign.phone_number else "",
                to_number=contact.phone,
                status=CallStatus.queued,
                retry_number=contact.retry_count or 0,
            )
            db.add(call)
            await db.flush()

            payload = {
                "agent_id": campaign.agent.elevenlabs_agent_id,
                "agent_phone_number_id": campaign.phone_number.elevenlabs_number_id,
                "to_number": contact.phone,
                "conversation_initiation_client_data": {
                    "dynamic_variables": dynamic_vars
                }
            }
            if campaign.record_calls:
                payload["conversation_initiation_client_data"]["recording"] = {"enabled": True}

            response = await client.initiate_call(payload)
            call.elevenlabs_conversation_id = response.get("conversation_id")
            call.status = CallStatus.ringing
            contact.last_called_at = datetime.utcnow()
            
        except Exception as e:
            logger.error(f"Failed to initiate call for {contact.id}: {e}")
            # Reschedule or fail contact
            contact.status = ContactStatus.pending
            contact.retry_count = (contact.retry_count or 0) + 1
            if contact.retry_count > campaign.max_retries:
                contact.status = ContactStatus.failed
            else:
                delay = campaign.retry_delay_minutes
                contact.next_retry_at = datetime.utcnow() + timedelta(minutes=delay)
            
            # Record failed call if row was created
            if 'call' in locals():
                call.status = CallStatus.failed
                call.error_message = str(e)

        await db.commit()

@celery_app.task(name="app.background.dialer.recover_orphaned_feeders", queue="default")
@async_task
async def recover_orphaned_feeders():
    """
    Periodic task to find live campaigns without a running feeder.
    """
    async with AsyncSessionLocal() as db:
        stmt = select(Campaign).where(Campaign.status == CampaignStatus.live)
        result = await db.execute(stmt)
        campaigns = result.scalars().all()
        
        for campaign in campaigns:
            is_orphaned = False
            if not campaign.feeder_task_id:
                is_orphaned = True
            else:
                res = AsyncResult(campaign.feeder_task_id)
                # Success/Failure means the task finished but didn't reschedule (crash)
                if res.state in ("SUCCESS", "FAILURE", "REVOKED"):
                    is_orphaned = True
            
            if is_orphaned:
                logger.warning(f"Recovering orphaned feeder for campaign {campaign.id}")
                new_task = feed_campaign_contacts.delay(str(campaign.id))
                campaign.feeder_task_id = new_task.id
        
        await db.commit()

def _is_within_schedule(campaign: Campaign) -> bool:
    try:
        tz = ZoneInfo(campaign.timezone or "US/Eastern")
    except Exception:
        tz = ZoneInfo("US/Eastern")
        
    now_in_tz = datetime.now(tz)
    day = now_in_tz.strftime("%a")
    curr_time = now_in_tz.time()
    
    if campaign.schedule_days and day not in campaign.schedule_days:
        return False
    if campaign.schedule_start_time and curr_time < campaign.schedule_start_time:
        return False
    if campaign.schedule_end_time and curr_time > campaign.schedule_end_time:
        return False
        
    return True

async def _auto_complete_campaign(db, campaign: Campaign):
    """Transition campaign to completed status."""
    from app.services.campaign_service import transition_status
    from app.models.workspace import Workspace
    
    workspace = await db.get(Workspace, campaign.workspace_id)
    await transition_status(db, campaign, CampaignStatus.completed, workspace)
    await db.commit()
