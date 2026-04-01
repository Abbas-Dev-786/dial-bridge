from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, field_validator, Field
from app.enums import WebhookDeliveryStatus

# API Keys
class APIKeyCreate(BaseModel):
    name: str
    environment: str = "production"    # 'production' | 'development' | 'staging'
    expires_in_days: int | None = None # None = never expires

class APIKeyCreateResponse(BaseModel):
    """Returned ONCE at creation — full key is never shown again."""
    id: UUID
    name: str
    key_prefix: str
    full_key: str       # e.g. "vai_prod_sk_a1b2c3d4e5f6..."
    environment: str
    expires_at: datetime | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class APIKeyResponse(BaseModel):
    """All subsequent reads — full key is NOT included."""
    id: UUID
    name: str
    key_prefix: str
    environment: str
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    revoked_at: datetime | None = None
    created_at: datetime
    
    @property
    def is_active(self) -> bool:
        now = datetime.utcnow()
        return self.revoked_at is None and (self.expires_at is None or self.expires_at > now)

    model_config = ConfigDict(from_attributes=True)

# Webhook Endpoints
class WebhookEndpointCreate(BaseModel):
    url: str
    description: str | None = None
    events: list[str] = ["call.completed"]
    max_retries: int = 3

    @field_validator("events")
    @classmethod
    def validate_events(cls, v):
        allowed = {
            "call.completed", "call.failed", "call.voicemail",
            "campaign.completed", "campaign.paused",
            "contact.opted_out", "kb.sync_failed",
        }
        invalid = set(v) - allowed
        if invalid:
            raise ValueError(f"Unknown event types: {invalid}")
        return v

class WebhookEndpointResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    url: str
    description: str | None = None
    events: list[str]
    max_retries: int
    is_active: bool
    created_at: datetime
    # Never expose signing_secret_enc
    model_config = ConfigDict(from_attributes=True)

class WebhookDeliveryResponse(BaseModel):
    id: UUID
    endpoint_id: UUID
    call_id: UUID | None = None
    event_type: str
    status: WebhookDeliveryStatus
    attempt_number: int
    http_status_code: int | None = None
    duration_ms: int | None = None
    delivered_at: datetime | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Notifications
class NotificationPreferenceUpsert(BaseModel):
    event_type: str
    channel_email: bool = False
    channel_slack: bool = False
    channel_webhook: bool = False

class NotificationPreferenceResponse(BaseModel):
    event_type: str
    channel_email: bool
    channel_slack: bool
    channel_webhook: bool
    model_config = ConfigDict(from_attributes=True)

# Audit Log
class AuditLogResponse(BaseModel):
    id: UUID
    actor_user_id: UUID | None = None
    actor_type: str
    action: str
    resource_type: str
    resource_id: UUID | None = None
    diff: dict | None = None
    ip_address: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
