import asyncio
import logging
from uuid import UUID
from sqlalchemy import select, and_
from app.background.celery_app import celery_app
from app.background.utils import async_task
from app.database import AsyncSessionLocal
from app.models.campaign import Campaign
from app.models.workspace import Workspace
from app.enums import CampaignStatus, KBSyncStatus
from app.services.kb_service import sync_campaign_kb

logger = logging.getLogger(__name__)

@celery_app.task(name="app.background.kb_sync.check_pending_kb_syncs", queue="default")
@async_task
async def check_pending_kb_syncs():
    """Periodic task to scan for campaigns needing KB sync."""
    async with AsyncSessionLocal() as db:
        stmt = select(Campaign).where(
            and_(
                Campaign.status == CampaignStatus.live,
                Campaign.kb_sync_status == KBSyncStatus.pending
            )
        )
        result = await db.execute(stmt)
        campaigns = result.scalars().all()
        
        for campaign in campaigns:
            sync_campaign_kb_task.delay(str(campaign.id))

@celery_app.task(
    name="app.background.kb_sync.sync_campaign_kb_task",
    queue="default",
    max_retries=3,
    default_retry_delay=60
)
@async_task
async def sync_campaign_kb_task(campaign_id: str):
    """Task to perform the actual KB sync for a campaign."""
    async with AsyncSessionLocal() as db:
        campaign = await db.get(Campaign, UUID(campaign_id))
        if not campaign or campaign.status != CampaignStatus.live:
            return
            
        try:
            await sync_campaign_kb(db, campaign)
            await db.commit()
            logger.info(f"KB sync successful for campaign {campaign_id}")
        except Exception as e:
            logger.error(f"KB sync failed for campaign {campaign_id}: {e}")
            campaign.kb_sync_status = KBSyncStatus.failed
            await db.commit()
