import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, get_workspace_member, require_role
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.enums import WorkspaceRole, CampaignStatus
from app.schemas.campaign import (
    CampaignCreate, 
    CampaignUpdate, 
    CampaignResponse, 
    CampaignListItem,
    CampaignAssignAgent,
    CampaignAssignPhoneNumber,
    CampaignStatusTransition
)
from app.services import campaign_service
from app.models.workspace import Workspace
from sqlalchemy import select

router = APIRouter()

@router.get("/{workspace_id}/campaigns", response_model=list[CampaignListItem])
async def list_campaigns(
    workspace_id: uuid.UUID,
    status: list[CampaignStatus] | None = Query(None),
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """List all campaigns in a workspace."""
    return await campaign_service.list_campaigns(db, workspace_id, status)

@router.post("/{workspace_id}/campaigns", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    workspace_id: uuid.UUID,
    data: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Create a new campaign."""
    # We need the workspace object for some service calls
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one()
    return await campaign_service.create_campaign(db, workspace, current_user.id, data)

@router.get("/{workspace_id}/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """Get a single campaign by ID."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    return campaign

@router.patch("/{workspace_id}/campaigns/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    data: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Update campaign settings."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    return await campaign_service.update_campaign(db, campaign, data)

@router.delete("/{workspace_id}/campaigns/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Soft delete a campaign."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    # Need workspace for unassigning if scheduled
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one()
    await campaign_service.delete_campaign(db, campaign, workspace)

@router.post("/{workspace_id}/campaigns/{campaign_id}/status", response_model=CampaignResponse)
async def transition_campaign_status(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    data: CampaignStatusTransition,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Transition campaign lifecycle status."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one()
    return await campaign_service.transition_status(db, campaign, data.status, workspace)

@router.post("/{workspace_id}/campaigns/{campaign_id}/assign-agent", response_model=CampaignResponse)
async def assign_agent(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    data: CampaignAssignAgent,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Assign/Reassign an agent to the campaign."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    return await campaign_service.assign_agent(db, campaign, data)

@router.post("/{workspace_id}/campaigns/{campaign_id}/assign-phone", response_model=CampaignResponse)
async def assign_phone(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    data: CampaignAssignPhoneNumber,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Assign/Change the phone number for the campaign."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    return await campaign_service.assign_phone_number(db, campaign, data)
