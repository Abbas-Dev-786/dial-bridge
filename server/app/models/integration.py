import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Boolean, JSON, Enum as SAEnum, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY

from app.models import AppBase
from app.enums import AuthMethod, IntegrationStatus

class IntegrationProvider(AppBase):
    __tablename__ = "integration_providers"

    key: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    icon_url: Mapped[str | None] = mapped_column(String)
    auth_method: Mapped[AuthMethod] = mapped_column(
        SAEnum(AuthMethod, name="auth_method"), nullable=False
    )
    category: Mapped[str] = mapped_column(String, nullable=False)
    oauth_scopes: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    workspace_integrations: Mapped[list["WorkspaceIntegration"]] = relationship(
        back_populates="provider", cascade="all, delete-orphan"
    )

class WorkspaceIntegration(AppBase):
    __tablename__ = "workspace_integrations"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("integration_providers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[IntegrationStatus] = mapped_column(
        SAEnum(IntegrationStatus, name="integration_status"), default=IntegrationStatus.inactive
    )
    
    access_token_enc: Mapped[str | None] = mapped_column(String)
    refresh_token_enc: Mapped[str | None] = mapped_column(String)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    api_key_enc: Mapped[str | None] = mapped_column(String)
    endpoint_url: Mapped[str | None] = mapped_column(String)
    signing_secret_enc: Mapped[str | None] = mapped_column(String)
    
    config: Mapped[dict] = mapped_column(JSON, default={})
    installed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    connected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(String)

    # Relationships
    workspace: Mapped["Workspace"] = relationship(back_populates="integrations")
    provider: Mapped["IntegrationProvider"] = relationship(back_populates="workspace_integrations")
    campaign_integrations: Mapped[list["CampaignIntegration"]] = relationship(
        back_populates="workspace_integration", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("workspace_id", "provider_id", name="uq_workspace_provider"),
    )

class CampaignIntegration(AppBase):
    __tablename__ = "campaign_integrations"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workspace_integration_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspace_integrations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    config: Mapped[dict] = mapped_column(JSON, default={})

    # Relationships
    campaign: Mapped["Campaign"] = relationship(back_populates="integrations")
    workspace_integration: Mapped["WorkspaceIntegration"] = relationship(back_populates="campaign_integrations")

    __table_args__ = (
        UniqueConstraint("campaign_id", "workspace_integration_id", name="uq_campaign_workspace_integration"),
    )
