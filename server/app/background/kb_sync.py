from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.background.celery_app import celery_app
from app.background.utils import async_task
from app.database import AsyncSessionLocal
from app.models.campaign import Campaign
from app.enums import CampaignStatus, KBSyncStatus
from app.services.kb_service import sync_campaign_kb

@celery_app.task
@async_task
async def check_pending_kb_syncs():
    """Periodic task to trigger sync for campaigns with pending KB updates."""
    async with AsyncSessionLocal() as db:
        stmt = (
            select(Campaign)
            .where(
                and_(
                    Campaign.status == CampaignStatus.live,
                    Campaign.kb_sync_status == KBSyncStatus.pending
                )
            )
        )
        result = await db.execute(stmt)
        campaigns = result.scalars().all()
        
        for campaign in campaigns:
            sync_campaign_kb_task.delay(str(campaign.id))

@celery_app.task
@async_task
async def sync_campaign_kb_task(campaign_id: str):
    """Worker task to perform the actual KB sync with ElevenLabs."""
    async with AsyncSessionLocal() as db:
        # Fetch campaign with workspace
        stmt = (
            select(Campaign)
            .where(Campaign.id == UUID(campaign_id))
            .options(selectinload(Campaign.workspace))
        )
        result = await db.execute(stmt)
        campaign = result.scalar_one_or_none()
        
        if not campaign:
            return
            
        # Verify sync is still needed
        if campaign.status != CampaignStatus.live or campaign.kb_sync_status != KBSyncStatus.pending:
            return
            
        await sync_campaign_kb(db, campaign, campaign.workspace)
