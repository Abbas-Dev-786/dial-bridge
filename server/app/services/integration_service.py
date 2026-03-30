import uuid
import json
import httpx
from datetime import datetime, timedelta
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integration import IntegrationProvider, WorkspaceIntegration, CampaignIntegration
from app.models.campaign import Campaign
from app.schemas.integration import (
    ConnectAPIKeyRequest, 
    ConnectWebhookRequest, 
    OAuthCallbackRequest, 
    OAuthInitResponse,
    CampaignIntegrationToggle
)
from app.enums import AuthMethod, IntegrationStatus
from app.exceptions import NotFoundError, ValidationError, ConflictError
from app.core.security import encrypt_value, decrypt_value
from app.core.redis import redis_client
from app.config import settings

OAUTH_URLS = {
    "hubspot":    "https://app.hubspot.com/oauth/authorize",
    "salesforce": "https://login.salesforce.com/services/oauth2/authorize",
    "slack":      "https://slack.com/oauth/v2/authorize",
    "google_cal": "https://accounts.google.com/o/oauth2/v2/auth",
    "pipedrive":  "https://oauth.pipedrive.com/oauth/authorize",
}

TOKEN_URLS = {
    "hubspot":    "https://api.hubapi.com/oauth/v1/token",
    "salesforce": "https://login.salesforce.com/services/oauth2/token",
    "slack":      "https://slack.com/api/oauth.v2.access",
    "google_cal": "https://oauth2.googleapis.com/token",
    "pipedrive":  "https://oauth.pipedrive.com/oauth/token",
}

def _get_oauth_creds(provider_key: str):
    """Fetch client ID and secret from settings."""
    key_lower = provider_key.lower()
    client_id = getattr(settings, f"{key_lower}_client_id", "")
    client_secret = getattr(settings, f"{key_lower}_client_secret", "")
    return client_id, client_secret

async def list_providers(db: AsyncSession) -> list[IntegrationProvider]:
    stmt = select(IntegrationProvider).where(IntegrationProvider.is_active == True)
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def list_workspace_integrations(db: AsyncSession, workspace_id: uuid.UUID) -> list[WorkspaceIntegration]:
    # Subquery to count active campaign uses per integration
    active_count_stmt = (
        select(
            CampaignIntegration.workspace_integration_id,
            func.count(CampaignIntegration.id).label("active_count")
        )
        .where(CampaignIntegration.is_active == True)
        .group_by(CampaignIntegration.workspace_integration_id)
        .subquery()
    )

    stmt = (
        select(WorkspaceIntegration)
        .options(selectinload(WorkspaceIntegration.provider))
        .where(WorkspaceIntegration.workspace_id == workspace_id)
        .outerjoin(active_count_stmt, WorkspaceIntegration.id == active_count_stmt.c.workspace_integration_id)
        # We'll attach the count later or use it in a join if we want to return it in the object
    )
    result = await db.execute(stmt)
    integrations = list(result.scalars().all())

    # Map the counts
    for integration in integrations:
        # Re-query count for each (not super efficient, but okay for a small list)
        count_stmt = select(func.count(CampaignIntegration.id)).where(
            CampaignIntegration.workspace_integration_id == integration.id,
            CampaignIntegration.is_active == True
        )
        count_result = await db.execute(count_stmt)
        integration.active_campaign_count = count_result.scalar() or 0

    return integrations

async def get_workspace_integration(db: AsyncSession, workspace_id: uuid.UUID, integration_id: uuid.UUID) -> WorkspaceIntegration:
    stmt = select(WorkspaceIntegration).where(
        WorkspaceIntegration.id == integration_id,
        WorkspaceIntegration.workspace_id == workspace_id
    ).options(selectinload(WorkspaceIntegration.provider))
    result = await db.execute(stmt)
    integration = result.scalar_one_or_none()
    if not integration:
        raise NotFoundError("Workspace integration", str(integration_id))
    return integration

async def connect_api_key(
    db: AsyncSession, 
    workspace_id: uuid.UUID, 
    provider_key: str, 
    data: ConnectAPIKeyRequest, 
    user_id: uuid.UUID
) -> WorkspaceIntegration:
    provider_stmt = select(IntegrationProvider).where(
        IntegrationProvider.key == provider_key,
        IntegrationProvider.auth_method == AuthMethod.api_key
    )
    provider_result = await db.execute(provider_stmt)
    provider = provider_result.scalar_one_or_none()
    if not provider:
        raise NotFoundError("API Key integration provider", provider_key)

    # Upsert logic
    stmt = select(WorkspaceIntegration).where(
        WorkspaceIntegration.workspace_id == workspace_id,
        WorkspaceIntegration.provider_id == provider.id
    )
    result = await db.execute(stmt)
    integration = result.scalar_one_or_none()

    if integration:
        integration.api_key_enc = encrypt_value(data.api_key)
        integration.status = IntegrationStatus.connected
        integration.connected_at = datetime.utcnow()
        integration.installed_by = user_id
    else:
        integration = WorkspaceIntegration(
            workspace_id=workspace_id,
            provider_id=provider.id,
            api_key_enc=encrypt_value(data.api_key),
            status=IntegrationStatus.connected,
            connected_at=datetime.utcnow(),
            installed_by=user_id
        )
        db.add(integration)

    await db.commit()
    await db.refresh(integration)
    # Re-fetch with provider
    return await get_workspace_integration(db, workspace_id, integration.id)

async def connect_webhook(
    db: AsyncSession, 
    workspace_id: uuid.UUID, 
    provider_key: str, 
    data: ConnectWebhookRequest, 
    user_id: uuid.UUID
) -> WorkspaceIntegration:
    provider_stmt = select(IntegrationProvider).where(
        IntegrationProvider.key == provider_key,
        IntegrationProvider.auth_method == AuthMethod.webhook_secret
    )
    provider_result = await db.execute(provider_stmt)
    provider = provider_result.scalar_one_or_none()
    if not provider:
        raise NotFoundError("Webhook integration provider", provider_key)

    # Optional: Validate endpoint_url
    if data.endpoint_url:
        try:
            async with httpx.AsyncClient() as client:
                # Making a basic GET request to verify URL is reachable
                # In production, you might want more complex validation
                await client.get(data.endpoint_url, timeout=5.0)
        except Exception:
             pass # Or raise ValidationError("Endpoint URL is not reachable") if mandatory

    # Upsert logic
    stmt = select(WorkspaceIntegration).where(
        WorkspaceIntegration.workspace_id == workspace_id,
        WorkspaceIntegration.provider_id == provider.id
    )
    result = await db.execute(stmt)
    integration = result.scalar_one_or_none()

    if integration:
        integration.endpoint_url = data.endpoint_url
        if data.signing_secret:
            integration.signing_secret_enc = encrypt_value(data.signing_secret)
        integration.status = IntegrationStatus.connected
        integration.connected_at = datetime.utcnow()
        integration.installed_by = user_id
    else:
        integration = WorkspaceIntegration(
            workspace_id=workspace_id,
            provider_id=provider.id,
            endpoint_url=data.endpoint_url,
            signing_secret_enc=encrypt_value(data.signing_secret) if data.signing_secret else None,
            status=IntegrationStatus.connected,
            connected_at=datetime.utcnow(),
            installed_by=user_id
        )
        db.add(integration)

    await db.commit()
    await db.refresh(integration)
    return await get_workspace_integration(db, workspace_id, integration.id)

async def initiate_oauth(db: AsyncSession, workspace_id: uuid.UUID, provider_key: str) -> OAuthInitResponse:
    provider_stmt = select(IntegrationProvider).where(
        IntegrationProvider.key == provider_key,
        IntegrationProvider.auth_method == AuthMethod.oauth2
    )
    provider_result = await db.execute(provider_stmt)
    provider = provider_result.scalar_one_or_none()
    if not provider:
        raise NotFoundError("OAuth provider", provider_key)

    state = str(uuid.uuid4())
    # Store state in Redis with 10-minute TTL
    await redis_client.setex(
        f"oauth_state:{state}",
        600,
        f"{workspace_id}:{provider_key}"
    )

    client_id, _ = _get_oauth_creds(provider_key)
    redirect_uri = f"{settings.frontend_url}/integrations/oauth/callback"
    
    auth_base_url = OAUTH_URLS.get(provider_key)
    if not auth_base_url:
        raise ValidationError(f"OAuth URL not configured for provider: {provider_key}")

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "response_type": "code",
    }
    if provider.oauth_scopes:
        # Different providers use different separators for scopes
        separator = " " if provider_key in ["slack", "google_cal"] else ","
        params["scope"] = separator.join(provider.oauth_scopes)

    # Build final URL
    query_params = "&".join([f"{k}={v}" for k, v in params.items()])
    authorization_url = f"{auth_base_url}?{query_params}"

    return OAuthInitResponse(authorization_url=authorization_url, state=state)

async def handle_oauth_callback(db: AsyncSession, data: OAuthCallbackRequest) -> WorkspaceIntegration:
    state_val = await redis_client.get(f"oauth_state:{data.state}")
    if not state_val:
        raise ValidationError("Invalid or expired OAuth state")

    workspace_id_str, provider_key = state_val.split(":")
    workspace_id = uuid.UUID(workspace_id_str)
    
    # One-time use state
    await redis_client.delete(f"oauth_state:{data.state}")

    provider_stmt = select(IntegrationProvider).where(IntegrationProvider.key == provider_key)
    provider_result = await db.execute(provider_stmt)
    provider = provider_result.scalar_one_or_none()

    client_id, client_secret = _get_oauth_creds(provider_key)
    token_url = TOKEN_URLS.get(provider_key)

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        response = await client.post(
            token_url,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": data.code,
                "grant_type": "authorization_code",
                "redirect_uri": f"{settings.frontend_url}/integrations/oauth/callback"
            }
        )
        if response.is_error:
            raise ValidationError(f"Failed to exchange OAuth code: {response.text}")
        
        token_data = response.json()

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in")
    
    token_expires_at = None
    if expires_in:
        token_expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))

    # Upsert logic
    stmt = select(WorkspaceIntegration).where(
        WorkspaceIntegration.workspace_id == workspace_id,
        WorkspaceIntegration.provider_id == provider.id
    )
    result = await db.execute(stmt)
    integration = result.scalar_one_or_none()

    if integration:
        integration.access_token_enc = encrypt_value(access_token)
        if refresh_token:
            integration.refresh_token_enc = encrypt_value(refresh_token)
        integration.status = IntegrationStatus.connected
        integration.connected_at = datetime.utcnow()
    else:
        integration = WorkspaceIntegration(
            workspace_id=workspace_id,
            provider_id=provider.id,
            access_token_enc=encrypt_value(access_token),
            refresh_token_enc=encrypt_value(refresh_token) if refresh_token else None,
            status=IntegrationStatus.connected,
            connected_at=datetime.utcnow()
        )
        db.add(integration)

    await db.commit()
    await db.refresh(integration)
    return await get_workspace_integration(db, workspace_id, integration.id)

async def disconnect_integration(db: AsyncSession, workspace_id: uuid.UUID, integration_id: uuid.UUID) -> None:
    integration = await get_workspace_integration(db, workspace_id, integration_id)
    
    # Check for active campaign integrations
    active_check_stmt = select(func.count(CampaignIntegration.id)).where(
        CampaignIntegration.workspace_integration_id == integration_id,
        CampaignIntegration.is_active == True
    )
    result = await db.execute(active_check_stmt)
    active_count = result.scalar()
    
    if active_count > 0:
        raise ConflictError(f"This integration is active in {active_count} campaigns. Disable it from those campaigns first.")

    # Clear sensitive data
    integration.access_token_enc = None
    integration.refresh_token_enc = None
    integration.api_key_enc = None
    integration.signing_secret_enc = None
    integration.status = IntegrationStatus.disconnected
    
    await db.commit()

async def toggle_campaign_integration(
    db: AsyncSession, 
    campaign: Campaign, 
    workspace_integration_id: uuid.UUID, 
    data: CampaignIntegrationToggle
) -> CampaignIntegration:
    # Verify integration belongs to the same workspace
    integration = await get_workspace_integration(db, campaign.workspace_id, workspace_integration_id)
    
    if integration.status != IntegrationStatus.connected:
        raise ValidationError("Cannot enable an integration that is not connected.")

    stmt = select(CampaignIntegration).where(
        CampaignIntegration.campaign_id == campaign.id,
        CampaignIntegration.workspace_integration_id == workspace_integration_id
    )
    result = await db.execute(stmt)
    campaign_integration = result.scalar_one_or_none()

    if campaign_integration:
        campaign_integration.is_active = data.is_active
        campaign_integration.config = data.config
    else:
        campaign_integration = CampaignIntegration(
            campaign_id=campaign.id,
            workspace_integration_id=workspace_integration_id,
            is_active=data.is_active,
            config=data.config
        )
        db.add(campaign_integration)

    await db.commit()
    await db.refresh(campaign_integration)
    
    # Re-fetch with workspace_integration and provider
    stmt = (
        select(CampaignIntegration)
        .where(CampaignIntegration.id == campaign_integration.id)
        .options(
            selectinload(CampaignIntegration.workspace_integration)
            .selectinload(WorkspaceIntegration.provider)
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one()

async def list_campaign_integrations(db: AsyncSession, campaign_id: uuid.UUID) -> list[CampaignIntegration]:
    stmt = (
        select(CampaignIntegration)
        .where(CampaignIntegration.campaign_id == campaign_id)
        .options(
            selectinload(CampaignIntegration.workspace_integration)
            .selectinload(WorkspaceIntegration.provider)
        )
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def remove_campaign_integration(
    db: AsyncSession, 
    campaign: Campaign, 
    workspace_integration_id: uuid.UUID
) -> None:
    """Hard delete a campaign integration toggle."""
    stmt = select(CampaignIntegration).where(
        CampaignIntegration.campaign_id == campaign.id,
        CampaignIntegration.workspace_integration_id == workspace_integration_id
    )
    result = await db.execute(stmt)
    campaign_integration = result.scalar_one_or_none()
    
    if campaign_integration:
        await db.delete(campaign_integration)
        await db.commit()
