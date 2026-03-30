import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db, get_current_user, get_workspace_member, require_role
from app.models.user import User
from app.models.workspace import WorkspaceMember, Workspace
from app.enums import WorkspaceRole, DocType
from app.schemas.knowledge import (
    KBDocumentAddURL, 
    KBDocumentResponse, 
    KBSyncStatusResponse, 
    KBSnapshotResponse
)
from app.services import kb_service, campaign_service

router = APIRouter()

@router.get("/{workspace_id}/campaigns/{campaign_id}/knowledge", response_model=list[KBDocumentResponse])
async def list_knowledge_documents(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """List all knowledge base documents for a campaign."""
    return await kb_service.list_documents(db, campaign_id)

@router.post("/{workspace_id}/campaigns/{campaign_id}/knowledge/url", response_model=KBDocumentResponse, status_code=status.HTTP_201_CREATED)
async def add_url_document(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    data: KBDocumentAddURL,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Add a URL-based knowledge base document."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    return await kb_service.add_url_document(db, campaign, current_user.id, data)

@router.post("/{workspace_id}/campaigns/{campaign_id}/knowledge/file", response_model=KBDocumentResponse, status_code=status.HTTP_201_CREATED)
async def add_file_document(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """
    Upload a file-based knowledge base document (PDF, TXT, DOCX).
    The file is uploaded directly to ElevenLabs and not stored locally.
    """
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one()
    
    # Determine DocType from extension
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext == "pdf":
        doc_type = DocType.pdf
    elif ext in ["docx", "doc"]:
        doc_type = DocType.docx
    elif ext == "txt":
        doc_type = DocType.txt
    else:
        doc_type = DocType.txt # Default or we could raise error
        
    file_bytes = await file.read()
    return await kb_service.add_file_document(
        db, campaign, workspace, current_user.id, file_bytes, file.filename, doc_type
    )

@router.delete("/{workspace_id}/campaigns/{campaign_id}/knowledge/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_document(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Remove a knowledge base document from the campaign and ElevenLabs."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one()
    await kb_service.delete_document(db, campaign, workspace, doc_id)

@router.get("/{workspace_id}/campaigns/{campaign_id}/knowledge/sync-status", response_model=KBSyncStatusResponse)
async def get_sync_status(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """Get the current synchronization status of the campaign's knowledge base."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    return await kb_service.get_kb_sync_status(db, campaign)

@router.post("/{workspace_id}/campaigns/{campaign_id}/knowledge/sync", response_model=KBSyncStatusResponse)
async def trigger_sync(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Manually trigger a synchronization of the knowledge base with ElevenLabs."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one()
    await kb_service.sync_campaign_kb(db, campaign, workspace)
    return await kb_service.get_kb_sync_status(db, campaign)

@router.get("/{workspace_id}/campaigns/{campaign_id}/knowledge/snapshots", response_model=list[KBSnapshotResponse])
async def list_kb_snapshots(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """List historical KB snapshots for the campaign."""
    return await kb_service.list_snapshots(db, campaign_id)

@router.get("/{workspace_id}/campaigns/{campaign_id}/knowledge/snapshots/{snapshot_id}", response_model=KBSnapshotResponse)
async def get_kb_snapshot(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    snapshot_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """Get a specific historical KB snapshot."""
    return await kb_service.get_snapshot(db, campaign_id, snapshot_id)
