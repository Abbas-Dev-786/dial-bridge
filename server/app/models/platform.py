import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, JSON, Enum as SAEnum, DateTime, Boolean, Text, SmallInteger, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY, INET, UUID as PG_UUID
from app.models import AppBase
from app.enums import WebhookDeliveryStatus

class APIKey(AppBase):
    __tablename__ = "api_keys"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(16), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    environment: Mapped[str] = mapped_column(String(20), default="production")
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    
    # We use explicit created_at from AppBase (UUIDMixin/TimestampMixin)
    
    workspace: Mapped["Workspace"] = relationship()

class WebhookEndpoint(AppBase):
    __tablename__ = "webhook_endpoints"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String)
    signing_secret_enc: Mapped[str | None] = mapped_column(String)
    events: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)
    max_retries: Mapped[int] = mapped_column(SmallInteger, default=3)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    workspace: Mapped["Workspace"] = relationship()
    deliveries: Mapped[list["WebhookDelivery"]] = relationship(
        back_populates="endpoint", cascade="all, delete-orphan"
    )

class WebhookDelivery(AppBase):
    __tablename__ = "webhook_deliveries"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    endpoint_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("webhook_endpoints.id", ondelete="CASCADE"), nullable=False, index=True
    )
    call_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("calls.id", ondelete="SET NULL"), nullable=True
    )
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    status: Mapped[WebhookDeliveryStatus] = mapped_column(
        SAEnum(WebhookDeliveryStatus, name="webhook_delivery_status"), default=WebhookDeliveryStatus.pending
    )
    attempt_number: Mapped[int] = mapped_column(SmallInteger, default=1)
    http_status_code: Mapped[int | None] = mapped_column(SmallInteger)
    response_body: Mapped[str | None] = mapped_column(Text)
    duration_ms: Mapped[int | None] = mapped_column(SmallInteger)
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    endpoint: Mapped["WebhookEndpoint"] = relationship(back_populates="deliveries")
    call: Mapped["Call | None"] = relationship()

class NotificationPreference(AppBase):
    __tablename__ = "notification_preferences"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    channel_email: Mapped[bool] = mapped_column(Boolean, default=False)
    channel_slack: Mapped[bool] = mapped_column(Boolean, default=False)
    channel_webhook: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", "event_type", name="uq_notification_preference"),
    )

class AuditLog(AppBase):
    __tablename__ = "audit_logs"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    actor_type: Mapped[str] = mapped_column(String(20), default="user") # 'user' | 'system' | 'api_key'
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    diff: Mapped[dict | None] = mapped_column(JSON)
    ip_address: Mapped[str | None] = mapped_column(INET)
    user_agent: Mapped[str | None] = mapped_column(Text)
