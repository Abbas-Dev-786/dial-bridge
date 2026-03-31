import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, JSON, Enum as SAEnum, DateTime, Boolean, Text, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY
from app.models import AppBase
from app.enums import WebhookDeliveryStatus

class WorkspaceWebhookEndpoint(AppBase):
    __tablename__ = "workspace_webhook_endpoints"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String)
    events: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)
    signing_secret_enc: Mapped[str | None] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    max_retries: Mapped[int] = mapped_column(SmallInteger, default=3)

    workspace: Mapped["Workspace"] = relationship()

class WebhookDelivery(AppBase):
    __tablename__ = "webhook_deliveries"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    endpoint_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspace_webhook_endpoints.id", ondelete="CASCADE"), nullable=False, index=True
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
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    endpoint: Mapped["WorkspaceWebhookEndpoint"] = relationship()
