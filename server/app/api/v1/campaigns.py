import uuid
import time
from fastapi import APIRouter, Depends, Query, status, Header, Response
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
    CampaignAssignPhoneNumber,
    CampaignStatusTransition
)
from app.exceptions import ConflictError, ValidationError
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
    # List view uses CampaignListItem which doesn't need build_campaign_response
    return await campaign_service.list_campaigns(db, workspace_id, status)

@router.post("/{workspace_id}/campaigns", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    workspace_id: uuid.UUID,
    data: CampaignCreate,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """
    Creates a campaign and automatically generates an AI voice agent from the goal.
    This endpoint calls Gemini and ElevenLabs — expect 2-5 seconds response time.
    """
    start_time = time.time()
    
    # We need the workspace object for some service calls
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one()
    
    campaign = await campaign_service.create_campaign(db, workspace, current_user, data)
    
    duration_ms = int((time.time() - start_time) * 1000)
    response.headers["X-Generation-Time-Ms"] = str(duration_ms)
    
    return campaign_service.build_campaign_response(campaign)

@router.get("/{workspace_id}/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """Get a single campaign by ID."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    return campaign_service.build_campaign_response(campaign)

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
    updated = await campaign_service.update_campaign(db, campaign, data)
    return campaign_service.build_campaign_response(updated)

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
    updated = await campaign_service.transition_status(db, campaign, data.status, workspace)
    return campaign_service.build_campaign_response(updated)

# assign_agent removed in favor of auto-generation

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
    updated = await campaign_service.assign_phone_number(db, campaign, data)
    return campaign_service.build_campaign_response(updated)

@router.post("/{workspace_id}/campaigns/{campaign_id}/regenerate-agent", response_model=CampaignResponse)
async def regenerate_agent(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    body: dict,   # { "goal": str }
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Regenerates the agent from a new or updated goal."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)

    if campaign.status not in (CampaignStatus.draft, CampaignStatus.paused):
        raise ConflictError(
            "Agent can only be regenerated when campaign is draft or paused."
        )

    new_goal = body.get("goal", "").strip()
    if len(new_goal) < 10:
        raise ValidationError("Goal must be at least 10 characters")

    # Generate new config
    from app.services.agent_generation_service import generate_agent_config, build_agent_create
    from app.services.agent_service import update_agent, update_voice_config, update_conversation_config
    from app.schemas.agent import AgentUpdate
    from app.enums import KBSyncStatus

    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one()

    generated_config, was_generated = await generate_agent_config(
        goal=new_goal,
        workspace_name=workspace.name,
    )
    agent_create = build_agent_create(generated_config, campaign.name)

    # Update existing agent (do not create a new one — keep the same agent_id)
    agent = campaign.agent
    await update_agent(db, workspace, agent, AgentUpdate(
        name=agent_create.name,
        description=agent_create.description,
        system_prompt=agent_create.system_prompt,
        first_message=agent_create.first_message,
        temperature=agent_create.temperature,
        max_tokens=agent_create.max_tokens,
    ))
    await update_voice_config(db, workspace, agent, agent_create.voice_config)
    await update_conversation_config(db, workspace, agent, agent_create.conversation_config)

    # Update campaign metadata
    campaign.goal_description       = new_goal
    campaign.agent_was_generated    = was_generated
    campaign.agent_generation_failed= not was_generated
    campaign.kb_sync_status         = KBSyncStatus.pending
    await db.commit()

    # Re-fetch with all relations for the response builder
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign.id)
    return campaign_service.build_campaign_response(campaign)
