import secrets
import hashlib
from datetime import datetime, timedelta
from uuid import UUID
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.platform import APIKey, WebhookEndpoint, WebhookDelivery
from app.models.workspace import Workspace
from app.models.user import User
from app.schemas.platform import APIKeyCreate, WebhookEndpointCreate
from app.enums import WebhookDeliveryStatus
from app.exceptions import NotFoundError, ConflictError

def generate_api_key_params(environment: str) -> tuple[str, str, str]:
    """
    Returns (full_key, key_prefix, key_hash).
    full_key is shown once and never stored.
    key_hash is stored and used for lookup.
    key_prefix is stored for display in the UI.
    """
    env_prefix = {"production": "prod", "development": "dev", "staging": "stg"}.get(
        environment, "prod"
    )
    # 32 bytes of randomness
    raw = secrets.token_urlsafe(32)
    full_key = f"vai_{env_prefix}_sk_{raw}"
    key_prefix = full_key[:16]   # first 16 chars shown in UI
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    return full_key, key_prefix, key_hash

async def create_api_key(db: AsyncSession, workspace_id: UUID, user_id: UUID, data: APIKeyCreate) -> tuple[APIKey, str]:
    full_key, key_prefix, key_hash = generate_api_key_params(data.environment)
    
    expires_at = None
    if data.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=data.expires_in_days)
    
    api_key = APIKey(
        workspace_id=workspace_id,
        created_by=user_id,
        name=data.name,
        key_prefix=key_prefix,
        key_hash=key_hash,
        environment=data.environment,
        expires_at=expires_at
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    return api_key, full_key

async def list_api_keys(db: AsyncSession, workspace_id: UUID) -> list[APIKey]:
    result = await db.execute(
        select(APIKey)
        .where(APIKey.workspace_id == workspace_id)
        .order_by(APIKey.created_at.desc())
    )
    return list(result.scalars().all())

async def revoke_api_key(db: AsyncSession, workspace_id: UUID, key_id: UUID) -> APIKey:
    result = await db.execute(
        select(APIKey).where(
            APIKey.id == key_id,
            APIKey.workspace_id == workspace_id
        )
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise NotFoundError("API Key")
    
    api_key.revoked_at = datetime.utcnow()
    await db.commit()
    return api_key

# Webhook Endpoints
async def create_webhook_endpoint(db: AsyncSession, workspace_id: UUID, data: WebhookEndpointCreate) -> WebhookEndpoint:
    # Generate signing secret
    signing_secret = secrets.token_urlsafe(32)
    
    endpoint = WebhookEndpoint(
        workspace_id=workspace_id,
        url=data.url,
        description=data.description,
        signing_secret_enc=signing_secret, # Encrypt in production
        events=data.events,
        max_retries=data.max_retries
    )
    db.add(endpoint)
    await db.commit()
    await db.refresh(endpoint)
    return endpoint

async def get_webhook_endpoint(db: AsyncSession, workspace_id: UUID, endpoint_id: UUID) -> WebhookEndpoint:
    result = await db.execute(
        select(WebhookEndpoint).where(
            WebhookEndpoint.id == endpoint_id,
            WebhookEndpoint.workspace_id == workspace_id
        )
    )
    endpoint = result.scalar_one_or_none()
    if not endpoint:
        raise NotFoundError("Webhook Endpoint")
    return endpoint

async def list_webhook_endpoints(db: AsyncSession, workspace_id: UUID) -> list[WebhookEndpoint]:
    result = await db.execute(
        select(WebhookEndpoint).where(WebhookEndpoint.workspace_id == workspace_id)
    )
    return list(result.scalars().all())

async def update_webhook_endpoint(db: AsyncSession, endpoint: WebhookEndpoint, data: WebhookEndpointCreate) -> WebhookEndpoint:
    endpoint.url = data.url
    endpoint.description = data.description
    endpoint.events = data.events
    endpoint.max_retries = data.max_retries
    await db.commit()
    await db.refresh(endpoint)
    return endpoint

async def delete_webhook_endpoint(db: AsyncSession, endpoint: WebhookEndpoint) -> None:
    await db.delete(endpoint)
    await db.commit()

async def list_webhook_deliveries(
    db: AsyncSession, 
    workspace_id: UUID, 
    endpoint_id: UUID, 
    status: WebhookDeliveryStatus | None = None,
    page: int = 1,
    page_size: int = 50
) -> list[WebhookDelivery]:
    stmt = select(WebhookDelivery).where(
        WebhookDelivery.workspace_id == workspace_id,
        WebhookDelivery.endpoint_id == endpoint_id
    )
    if status:
        stmt = stmt.where(WebhookDelivery.status == status)
    
    stmt = stmt.order_by(WebhookDelivery.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def retry_webhook_delivery(db: AsyncSession, workspace_id: UUID, delivery_id: UUID) -> None:
    from app.background.outgoing_webhooks import deliver_webhook
    
    result = await db.execute(
        select(WebhookDelivery).where(
            WebhookDelivery.id == delivery_id,
            WebhookDelivery.workspace_id == workspace_id
        )
    )
    delivery = result.scalar_one_or_none()
    if not delivery:
        raise NotFoundError("Webhook Delivery")
    
    if delivery.status == WebhookDeliveryStatus.success:
        raise ConflictError("Cannot retry successful delivery")
        
    delivery.status = WebhookDeliveryStatus.pending
    delivery.attempt_number = 1
    await db.commit()
    
    deliver_webhook.delay(str(delivery_id))
