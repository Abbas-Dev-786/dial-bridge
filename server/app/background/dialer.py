import asyncio
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy import select, func, and_, or_, update
from sqlalchemy.orm import selectinload
import pytz

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
    CallDirection
)
from app.services.elevenlabs_client import get_elevenlabs_client

@celery_app.task(queue="dialer")
@async_task
async def dialer_tick():
    """Periodic task to scan for live campaigns and trigger calls."""
    async with AsyncSessionLocal() as db:
        # 1. Fetch all live campaigns
        stmt = (
            select(Campaign)
            .where(Campaign.status == CampaignStatus.live)
            .options(selectinload(Campaign.workspace))
        )
        result = await db.execute(stmt)
        campaigns = result.scalars().all()
        
        for campaign in campaigns:
            await _process_campaign_dialer(db, campaign)

async def _process_campaign_dialer(db, campaign):
    # a. Check schedule window
    tz = pytz.timezone(campaign.timezone or "US/Eastern")
    now_in_tz = datetime.now(tz)
    day_of_week = now_in_tz.strftime("%a") # 'Mon', 'Tue', etc.
    current_time = now_in_tz.time()
    
    if campaign.schedule_days and day_of_week not in campaign.schedule_days:
        return
    if campaign.schedule_start_time and current_time < campaign.schedule_start_time:
        return
    if campaign.schedule_end_time and current_time > campaign.schedule_end_time:
        return

    # b. Count active calls
    active_calls_stmt = select(func.count(Call.id)).where(
        and_(
            Call.campaign_id == campaign.id,
            Call.status.in_([CallStatus.queued, CallStatus.ringing, CallStatus.in_progress])
        )
    )
    result = await db.execute(active_calls_stmt)
    active_calls = result.scalar() or 0
    
    slots_available = (campaign.max_concurrency or 1) - active_calls
    if slots_available <= 0:
        return

    # c. Fetch next batch of contacts
    contacts_stmt = (
        select(Contact)
        .where(
            and_(
                Contact.campaign_id == campaign.id,
                Contact.status == ContactStatus.pending,
                Contact.is_dnc == False,
                Contact.retry_count < campaign.max_retries,
                or_(
                    Contact.next_retry_at.is_(None),
                    Contact.next_retry_at <= datetime.utcnow()
                )
            )
        )
        .order_by(Contact.created_at.asc())
        .limit(slots_available)
    )
    result = await db.execute(contacts_stmt)
    contacts = result.scalars().all()
    
    for contact in contacts:
        dispatch_call.delay(str(campaign.id), str(contact.id))

@celery_app.task(queue="dialer")
@async_task
async def dispatch_call(campaign_id: str, contact_id: str):
    """Task to initiate a single outbound call."""
    async with AsyncSessionLocal() as db:
        # 1. Fetch data
        campaign_stmt = (
            select(Campaign)
            .where(Campaign.id == UUID(campaign_id))
            .options(
                selectinload(Campaign.workspace),
                selectinload(Campaign.agent),
                selectinload(Campaign.phone_number)
            )
        )
        campaign_res = await db.execute(campaign_stmt)
        campaign = campaign_res.scalar_one_or_none()
        
        if not campaign or campaign.status != CampaignStatus.live:
            return
            
        contact_stmt = select(Contact).where(Contact.id == UUID(contact_id))
        contact_res = await db.execute(contact_stmt)
        contact = contact_res.scalar_one_or_none()
        
        if not contact or contact.status != ContactStatus.pending:
            return
            
        # 2. Optimistic lock
        lock_stmt = (
            update(Contact)
            .where(and_(Contact.id == contact.id, Contact.status == ContactStatus.pending))
            .values(status=ContactStatus.calling)
        )
        lock_res = await db.execute(lock_stmt)
        if lock_res.rowcount == 0:
            return # Already grabbed by another worker
            
        # 3. Create Call row
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
        
        # 4. Initiate ElevenLabs call
        try:
            client = await get_elevenlabs_client(campaign.workspace)
            agent = campaign.agent
            phone_number = campaign.phone_number
            
            if not agent or not phone_number:
                raise ValueError("Campaign lacks agent or phone number")

            payload = {
                "agent_id": agent.elevenlabs_agent_id,
                "agent_phone_number_id": phone_number.elevenlabs_number_id,
                "to_number": contact.phone,
                "conversation_initiation_client_data": {
                    "dynamic_variables": {
                        "contact_name": contact.full_name or "there",
                        "contact_company": contact.company or "",
                    }
                }
            }
            
            response = await client.initiate_call(payload)
            call.elevenlabs_conversation_id = response.get("conversation_id")
            call.status = CallStatus.ringing
            
        except Exception as e:
            # Failure handling
            call.status = CallStatus.failed
            call.error_message = str(e)
            
            # Reset contact for retry
            contact.status = ContactStatus.pending
            contact.retry_count = (contact.retry_count or 0) + 1
            if campaign.retry_delay_minutes:
                contact.next_retry_at = datetime.utcnow() + timedelta(minutes=campaign.retry_delay_minutes)
            else:
                contact.next_retry_at = datetime.utcnow()
                
        await db.commit()
