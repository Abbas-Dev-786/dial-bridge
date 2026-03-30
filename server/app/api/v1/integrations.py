import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db, get_current_user, get_workspace_member, require_role
from app.models.user import User
from app.models.workspace import WorkspaceMember, Workspace
from app.enums import WorkspaceRole
from app.schemas.integration import (
    IntegrationProviderResponse,
    WorkspaceIntegrationResponse,
    ConnectAPIKeyRequest,
    ConnectWebhookRequest,
    OAuthCallbackRequest,
    OAuthInitResponse,
    CampaignIntegrationToggle,
    CampaignIntegrationResponse
)
from app.services import integration_service, campaign_service

router = APIRouter()

# Workspace-level routes
@router.get("/{workspace_id}/integrations/providers", response_model=list[IntegrationProviderResponse])
async def list_providers(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """Full catalogue of available integration providers."""
    return await integration_service.list_providers(db)

@router.get("/{workspace_id}/integrations", response_model=list[WorkspaceIntegrationResponse])
async def list_workspace_integrations(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """All installed integrations for this workspace."""
    return await integration_service.list_workspace_integrations(db, workspace_id)

@router.post("/{workspace_id}/integrations/{provider_key}/connect-api-key", response_model=WorkspaceIntegrationResponse)
async def connect_api_key(
    workspace_id: uuid.UUID,
    provider_key: str,
    data: ConnectAPIKeyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Connect an integration via API key."""
    return await integration_service.connect_api_key(db, workspace_id, provider_key, data, current_user.id)

@router.post("/{workspace_id}/integrations/{provider_key}/connect-webhook", response_model=WorkspaceIntegrationResponse)
async def connect_webhook(
    workspace_id: uuid.UUID,
    provider_key: str,
    data: ConnectWebhookRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Connect an integration via Webhook."""
    return await integration_service.connect_webhook(db, workspace_id, provider_key, data, current_user.id)

@router.get("/{workspace_id}/integrations/{provider_key}/oauth/initiate", response_model=OAuthInitResponse)
async def initiate_oauth(
    workspace_id: uuid.UUID,
    provider_key: str,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Returns the authorization URL to redirect user to."""
    return await integration_service.initiate_oauth(db, workspace_id, provider_key)

@router.post("/oauth/callback", response_model=WorkspaceIntegrationResponse)
async def oauth_callback(
    data: OAuthCallbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """Receive OAuth code and context to complete installation."""
    # Top-level route: workspace context recovered from state token in service
    return await integration_service.handle_oauth_callback(db, data)

@router.delete("/{workspace_id}/integrations/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_integration(
    workspace_id: uuid.UUID,
    integration_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Disconnect and remove integration credentials."""
    await integration_service.disconnect_integration(db, workspace_id, integration_id)

# Campaign-level routes
@router.get("/{workspace_id}/campaigns/{campaign_id}/integrations", response_model=list[CampaignIntegrationResponse])
async def list_campaign_integrations(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """List all integrations enabled for a specific campaign."""
    # Verify campaign exists in this workspace
    await campaign_service.get_campaign(db, workspace_id, campaign_id)
    return await integration_service.list_campaign_integrations(db, campaign_id)

@router.post("/{workspace_id}/campaigns/{campaign_id}/integrations/{workspace_integration_id}", response_model=CampaignIntegrationResponse)
async def toggle_campaign_integration(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    workspace_integration_id: uuid.UUID,
    data: CampaignIntegrationToggle,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Enable/Disable or update config for an integration in a campaign."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    return await integration_service.toggle_campaign_integration(db, campaign, workspace_integration_id, data)

@router.delete("/{workspace_id}/campaigns/{campaign_id}/integrations/{workspace_integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign_integration(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    workspace_integration_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Remove integration toggle from a campaign."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    await integration_service.remove_campaign_integration(db, campaign, workspace_integration_id)
