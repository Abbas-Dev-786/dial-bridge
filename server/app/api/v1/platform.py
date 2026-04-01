from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, Query, status, Request
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_workspace_member, require_role
from app.models.platform import AuditLog, NotificationPreference
from app.models.workspace import WorkspaceMember
from app.schemas.platform import (
    APIKeyCreate, APIKeyCreateResponse, APIKeyResponse,
    WebhookEndpointCreate, WebhookEndpointResponse, WebhookDeliveryResponse,
    NotificationPreferenceUpsert, NotificationPreferenceResponse,
    AuditLogResponse, AuditLogListResponse
)
from app.services import platform_service
from app.enums import WorkspaceRole, WebhookDeliveryStatus
from app.utils.audit import log_action

router = APIRouter()

# --- API Keys ---

@router.get("/{workspace_id}/api-keys", response_model=list[APIKeyResponse])
async def list_api_keys(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """Any member can list API keys for the workspace."""
    return await platform_service.list_api_keys(db, workspace_id)

@router.post("/{workspace_id}/api-keys", response_model=APIKeyCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    workspace_id: UUID,
    data: APIKeyCreate,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin)),
):
    """Only owners and admins can create API keys."""
    api_key, full_key = await platform_service.create_api_key(db, workspace_id, member.user_id, data)
    
    await log_action(
        db, workspace_id, "api_key.created", "api_key", api_key.id, actor_user_id=member.user_id,
        diff={"name": api_key.name, "environment": api_key.environment}
    )
    await db.commit()
    
    # We must construct the response carefully to include full_key
    return APIKeyCreateResponse(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        full_key=full_key,
        environment=api_key.environment,
        expires_at=api_key.expires_at,
        created_at=api_key.created_at
    )

@router.delete("/{workspace_id}/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    workspace_id: UUID,
    key_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin)),
):
    """Revoking an API key is a soft-delete (sets revoked_at)."""
    api_key = await platform_service.revoke_api_key(db, workspace_id, key_id)
    
    await log_action(
        db, workspace_id, "api_key.revoked", "api_key", api_key.id, actor_user_id=member.user_id
    )
    await db.commit()

# --- Webhook Endpoints ---

@router.get("/{workspace_id}/webhook-endpoints", response_model=list[WebhookEndpointResponse])
async def list_webhook_endpoints(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin)),
):
    return await platform_service.list_webhook_endpoints(db, workspace_id)

@router.post("/{workspace_id}/webhook-endpoints", response_model=WebhookEndpointResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook_endpoint(
    workspace_id: UUID,
    data: WebhookEndpointCreate,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin)),
):
    endpoint = await platform_service.create_webhook_endpoint(db, workspace_id, data)
    
    await log_action(
        db, workspace_id, "webhook_endpoint.created", "webhook_endpoint", endpoint.id, actor_user_id=member.user_id,
        diff={"url": endpoint.url, "events": endpoint.events}
    )
    await db.commit()
    return endpoint

@router.get("/{workspace_id}/webhook-endpoints/{endpoint_id}", response_model=WebhookEndpointResponse)
async def get_webhook_endpoint(
    workspace_id: UUID,
    endpoint_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin)),
):
    return await platform_service.get_webhook_endpoint(db, workspace_id, endpoint_id)

@router.patch("/{workspace_id}/webhook-endpoints/{endpoint_id}", response_model=WebhookEndpointResponse)
async def update_webhook_endpoint(
    workspace_id: UUID,
    endpoint_id: UUID,
    data: WebhookEndpointCreate,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin)),
):
    endpoint = await platform_service.get_webhook_endpoint(db, workspace_id, endpoint_id)
    updated = await platform_service.update_webhook_endpoint(db, endpoint, data)
    
    await log_action(
        db, workspace_id, "webhook_endpoint.updated", "webhook_endpoint", endpoint.id, actor_user_id=member.user_id
    )
    await db.commit()
    return updated

@router.delete("/{workspace_id}/webhook-endpoints/{endpoint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook_endpoint(
    workspace_id: UUID,
    endpoint_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin)),
):
    endpoint = await platform_service.get_webhook_endpoint(db, workspace_id, endpoint_id)
    await platform_service.delete_webhook_endpoint(db, endpoint)
    
    await log_action(
        db, workspace_id, "webhook_endpoint.deleted", "webhook_endpoint", endpoint_id, actor_user_id=member.user_id
    )
    await db.commit()

@router.get("/{workspace_id}/webhook-endpoints/{endpoint_id}/deliveries", response_model=list[WebhookDeliveryResponse])
async def list_webhook_deliveries(
    workspace_id: UUID,
    endpoint_id: UUID,
    status: WebhookDeliveryStatus | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin)),
):
    return await platform_service.list_webhook_deliveries(db, workspace_id, endpoint_id, status, page, page_size)

@router.post("/{workspace_id}/webhook-endpoints/{endpoint_id}/deliveries/{delivery_id}/retry", status_code=status.HTTP_202_ACCEPTED)
async def retry_webhook_delivery(
    workspace_id: UUID,
    endpoint_id: UUID,
    delivery_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin)),
):
    await platform_service.retry_webhook_delivery(db, workspace_id, delivery_id)
    return {"status": "enqueued"}

# --- Notification Preferences ---

@router.get("/{workspace_id}/notifications/preferences", response_model=list[NotificationPreferenceResponse])
async def list_notification_preferences(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """Get notification preferences for the current member."""
    stmt = select(NotificationPreference).where(
        and_(
            NotificationPreference.workspace_id == workspace_id,
            NotificationPreference.user_id == member.user_id
        )
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())

@router.put("/{workspace_id}/notifications/preferences/{event_type}", response_model=NotificationPreferenceResponse)
async def upsert_notification_preference(
    workspace_id: UUID,
    event_type: str,
    data: NotificationPreferenceUpsert,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """Upsert a preference for an event type."""
    stmt = select(NotificationPreference).where(
        and_(
            NotificationPreference.workspace_id == workspace_id,
            NotificationPreference.user_id == member.user_id,
            NotificationPreference.event_type == event_type
        )
    )
    result = await db.execute(stmt)
    pref = result.scalar_one_or_none()
    
    if pref:
        pref.channel_email = data.channel_email
        pref.channel_slack = data.channel_slack
        pref.channel_webhook = data.channel_webhook
    else:
        # data object might have event_type that doesn't match the path, we trust the path
        pref = NotificationPreference(
            workspace_id=workspace_id,
            user_id=member.user_id,
            event_type=event_type,
            **data.model_dump(exclude={"event_type"})
        )
        db.add(pref)
        
    await db.commit()
    await db.refresh(pref)
    return pref

# --- Audit Logs ---

@router.get("/{workspace_id}/audit-logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    workspace_id: UUID,
    resource_type: str | None = Query(None),
    resource_id: UUID | None = Query(None),
    actor_user_id: UUID | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin)),
):
    """Searchable, paginated audit log access for admins/owners."""
    stmt = select(AuditLog).where(AuditLog.workspace_id == workspace_id)
    
    if resource_type:
        stmt = stmt.where(AuditLog.resource_type == resource_type)
    if resource_id:
        stmt = stmt.where(AuditLog.resource_id == resource_id)
    if actor_user_id:
        stmt = stmt.where(AuditLog.actor_user_id == actor_user_id)
    if date_from:
        stmt = stmt.where(AuditLog.created_at >= date_from)
    if date_to:
        stmt = stmt.where(AuditLog.created_at <= date_to)
        
    # Count total for pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await db.execute(count_stmt)
    total_count = total.scalar() or 0
    
    stmt = stmt.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    items = list(result.scalars().all())
    
    return {
        "items": items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "has_next": total_count > (page * page_size)
    }
