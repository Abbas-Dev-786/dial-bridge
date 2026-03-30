from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from app.enums import AuthMethod, IntegrationStatus

class IntegrationProviderResponse(BaseModel):
    id: UUID
    key: str
    display_name: str
    icon_url: str | None
    auth_method: AuthMethod
    category: str
    oauth_scopes: list[str] | None = None
    model_config = ConfigDict(from_attributes=True)

class WorkspaceIntegrationResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    provider: IntegrationProviderResponse
    status: IntegrationStatus
    config: dict = {}
    connected_at: datetime | None = None
    last_synced_at: datetime | None = None
    error_message: str | None = None
    active_campaign_count: int = 0
    model_config = ConfigDict(from_attributes=True)

class ConnectAPIKeyRequest(BaseModel):
    """For api_key auth method providers (Zapier, Make, etc.)"""
    api_key: str

class ConnectWebhookRequest(BaseModel):
    """For webhook_secret auth method providers"""
    endpoint_url: str
    signing_secret: str | None = None

class OAuthCallbackRequest(BaseModel):
    """Received from the OAuth provider after user authorises"""
    code: str
    state: str

class CampaignIntegrationToggle(BaseModel):
    is_active: bool
    config: dict = {}

class CampaignIntegrationResponse(BaseModel):
    id: UUID
    campaign_id: UUID
    workspace_integration: WorkspaceIntegrationResponse
    is_active: bool
    config: dict
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class OAuthInitResponse(BaseModel):
    authorization_url: str
    state: str
