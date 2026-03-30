import uuid
from datetime import datetime
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.knowledge import KnowledgeDocument, CampaignKBSnapshot
from app.models.campaign import Campaign
from app.models.agent import Agent
from app.models.workspace import Workspace
from app.schemas.knowledge import KBDocumentAddURL, KBSyncStatusResponse
from app.enums import (
    DocType, 
    DocStatus, 
    KBSyncStatus, 
    CampaignStatus
)
from app.exceptions import (
    NotFoundError, 
    ConflictError, 
    ElevenLabsError,
    ValidationError
)
from app.services.elevenlabs_client import get_elevenlabs_client

async def add_url_document(
    db: AsyncSession, 
    campaign: Campaign, 
    user_id: uuid.UUID, 
    data: KBDocumentAddURL
) -> KnowledgeDocument:
    # 1. Create KnowledgeDocument row with status=pending, doc_type=url_scrape
    doc = KnowledgeDocument(
        campaign_id=campaign.id,
        uploaded_by=user_id,
        name=data.name,
        source_url=str(data.source_url),
        doc_type=DocType.url_scrape,
        status=DocStatus.pending
    )
    db.add(doc)
    
    # 2. Set campaign.kb_sync_status = pending
    campaign.kb_sync_status = KBSyncStatus.pending
    db.add(campaign)
    
    await db.commit()
    await db.refresh(doc)
    return doc

async def add_file_document(
    db: AsyncSession, 
    campaign: Campaign, 
    workspace: Workspace,
    user_id: uuid.UUID, 
    file_bytes: bytes, 
    filename: str, 
    doc_type: DocType
) -> KnowledgeDocument:
    # Validate campaign has an agent (needed for immediate EL upload)
    if not campaign.agent_id:
        raise ValidationError("Campaign must have an agent assigned before adding documents.")
    
    # Fetch agent to get EL agent ID
    result = await db.execute(select(Agent).where(Agent.id == campaign.agent_id))
    agent = result.scalar_one_or_none()
    if not agent or not agent.elevenlabs_agent_id:
        raise ValidationError("Campaign agent is not correctly configured on ElevenLabs.")

    # 1. Create KnowledgeDocument row with status=pending
    doc = KnowledgeDocument(
        campaign_id=campaign.id,
        uploaded_by=user_id,
        name=filename,
        doc_type=doc_type,
        status=DocStatus.pending,
        file_size_bytes=len(file_bytes)
    )
    db.add(doc)
    await db.flush() # Get doc ID
    
    # 2. Immediately upload to EL
    client = await get_elevenlabs_client(workspace)
    try:
        response = await client.add_file_to_kb(
            agent.elevenlabs_agent_id, 
            file_bytes, 
            filename
        )
        # 3. Store the returned elevenlabs_kb_id
        doc.elevenlabs_kb_id = response.get("id")
        doc.status = DocStatus.ready
        doc.last_synced_at = datetime.now()
    except Exception as e:
        doc.status = DocStatus.failed
        doc.error_message = str(e)
        raise ElevenLabsError(f"Failed to upload file to ElevenLabs: {str(e)}")
    
    # 4. Set campaign.kb_sync_status = pending (since we might have other pending items)
    campaign.kb_sync_status = KBSyncStatus.pending
    db.add(campaign)
    
    await db.commit()
    await db.refresh(doc)
    return doc

async def delete_document(
    db: AsyncSession, 
    campaign: Campaign, 
    workspace: Workspace,
    doc_id: uuid.UUID
) -> None:
    # 1. Fetch document
    result = await db.execute(
        select(KnowledgeDocument).where(
            and_(
                KnowledgeDocument.id == doc_id,
                KnowledgeDocument.campaign_id == campaign.id,
                KnowledgeDocument.deleted_at.is_(None)
            )
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise NotFoundError("KnowledgeDocument")
    
    # 2. Block deletion if campaign is live
    if campaign.status == CampaignStatus.live:
        raise ConflictError("Pause the campaign before removing knowledge base documents.")
    
    # 3. If doc.elevenlabs_kb_id is not NULL, call EL to remove it
    if doc.elevenlabs_kb_id:
        result = await db.execute(select(Agent).where(Agent.id == campaign.agent_id))
        agent = result.scalar_one_or_none()
        if agent and agent.elevenlabs_agent_id:
            client = await get_elevenlabs_client(workspace)
            try:
                await client.delete_kb_document(agent.elevenlabs_agent_id, doc.elevenlabs_kb_id)
            except Exception:
                # We log but continue, the sync algorithm should clean up orphans anyway
                pass
    
    # 4. Soft-delete
    doc.deleted_at = datetime.now()
    
    # 5. Set campaign.kb_sync_status = pending
    campaign.kb_sync_status = KBSyncStatus.pending
    db.add(campaign)
    await db.commit()

async def sync_campaign_kb(db: AsyncSession, campaign: Campaign, workspace: Workspace) -> None:
    """
    Core sync function to reconcile local knowledge base with ElevenLabs.
    """
    # 1. Validate
    if not campaign.agent_id:
        raise ValidationError("Campaign has no agent assigned.")
    
    result = await db.execute(select(Agent).where(Agent.id == campaign.agent_id))
    agent = result.scalar_one_or_none()
    if not agent or not agent.elevenlabs_agent_id:
        raise ElevenLabsError("Campaign agent is not configured on ElevenLabs.")

    # 2. Set campaign.kb_sync_status = syncing
    campaign.kb_sync_status = KBSyncStatus.syncing
    await db.commit()

    client = await get_elevenlabs_client(workspace)
    try:
        # 3. Fetch current EL KB docs for this agent
        el_docs = await client.list_kb_documents(agent.elevenlabs_agent_id)
        el_doc_ids = {d["id"] for d in el_docs}

        # 4. Fetch our campaign's KB docs (non-deleted)
        result = await db.execute(
            select(KnowledgeDocument).where(
                and_(
                    KnowledgeDocument.campaign_id == campaign.id,
                    KnowledgeDocument.deleted_at.is_(None)
                )
            )
        )
        our_docs = result.scalars().all()
        our_el_ids = {d.elevenlabs_kb_id for d in our_docs if d.elevenlabs_kb_id}

        # 5. Delete from EL any docs not in our campaign
        to_delete = el_doc_ids - our_el_ids
        for el_id in to_delete:
            try:
                await client.delete_kb_document(agent.elevenlabs_agent_id, el_id)
            except Exception:
                pass # Non-fatal

        # 6. Upload docs that don't have an elevenlabs_kb_id yet (URLs)
        any_failed = False
        for doc in our_docs:
            if doc.elevenlabs_kb_id is None:
                try:
                    if doc.doc_type == DocType.url_scrape:
                        response = await client.add_url_to_kb(
                            agent.elevenlabs_agent_id, 
                            doc.source_url, 
                            doc.name
                        )
                        doc.elevenlabs_kb_id = response.get("id")
                        doc.status = DocStatus.ready
                        doc.last_synced_at = datetime.now()
                    else:
                        # File docs should have been uploaded at add time.
                        # If somehow missing here, we mark as failed.
                        doc.status = DocStatus.failed
                        doc.error_message = "File content missing for synchronization."
                        any_failed = True
                except Exception as e:
                    doc.status = DocStatus.failed
                    doc.error_message = str(e)
                    any_failed = True
            
            db.add(doc)

        # 7. Finalize status
        if any_failed:
            campaign.kb_sync_status = KBSyncStatus.failed
            raise ElevenLabsError("KB sync failed for one or more documents.")
        else:
            campaign.kb_sync_status = KBSyncStatus.synced
            campaign.kb_last_synced_at = datetime.now()

    except Exception as e:
        if campaign.kb_sync_status != KBSyncStatus.failed:
            campaign.kb_sync_status = KBSyncStatus.failed
        raise e
    finally:
        db.add(campaign)
        await db.commit()

async def list_documents(db: AsyncSession, campaign_id: uuid.UUID) -> list[KnowledgeDocument]:
    result = await db.execute(
        select(KnowledgeDocument).where(
            and_(
                KnowledgeDocument.campaign_id == campaign_id,
                KnowledgeDocument.deleted_at.is_(None)
            )
        )
    )
    return list(result.scalars().all())

async def get_knowledge_document(db: AsyncSession, campaign_id: uuid.UUID, doc_id: uuid.UUID) -> KnowledgeDocument:
    result = await db.execute(
        select(KnowledgeDocument).where(
            and_(
                KnowledgeDocument.id == doc_id,
                KnowledgeDocument.campaign_id == campaign_id,
                KnowledgeDocument.deleted_at.is_(None)
            )
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise NotFoundError("KnowledgeDocument")
    return doc

async def get_kb_sync_status(db: AsyncSession, campaign: Campaign) -> KBSyncStatusResponse:
    result = await db.execute(
        select(func.count(KnowledgeDocument.id)).where(
            and_(
                KnowledgeDocument.campaign_id == campaign.id,
                KnowledgeDocument.deleted_at.is_(None)
            )
        )
    )
    total_docs = result.scalar() or 0
    
    result = await db.execute(
        select(func.count(KnowledgeDocument.id)).where(
            and_(
                KnowledgeDocument.campaign_id == campaign.id,
                KnowledgeDocument.deleted_at.is_(None),
                KnowledgeDocument.status != DocStatus.ready
            )
        )
    )
    pending_docs = result.scalar() or 0
    
    return KBSyncStatusResponse(
        campaign_id=campaign.id,
        kb_sync_status=campaign.kb_sync_status,
        kb_last_synced_at=campaign.kb_last_synced_at,
        pending_docs=pending_docs,
        total_docs=total_docs
    )

async def list_snapshots(db: AsyncSession, campaign_id: uuid.UUID) -> list[CampaignKBSnapshot]:
    result = await db.execute(
        select(CampaignKBSnapshot)
        .where(CampaignKBSnapshot.campaign_id == campaign_id)
        .order_by(CampaignKBSnapshot.created_at.desc())
    )
    return list(result.scalars().all())

async def get_snapshot(db: AsyncSession, campaign_id: uuid.UUID, snapshot_id: uuid.UUID) -> CampaignKBSnapshot:
    result = await db.execute(
        select(CampaignKBSnapshot).where(
            and_(
                CampaignKBSnapshot.id == snapshot_id,
                CampaignKBSnapshot.campaign_id == campaign_id
            )
        )
    )
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        raise NotFoundError("CampaignKBSnapshot")
    return snapshot
