import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, JSON, Enum as SAEnum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models import AppBase
from app.enums import WorkspaceRole, PhoneProvider, PhoneNumberStatus, CampaignStatus

class Workspace(AppBase):
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(80), nullable=False)
    slug: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    logo_url: Mapped[str | None] = mapped_column(String)
    timezone: Mapped[str] = mapped_column(String, default="UTC")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    elevenlabs_api_key_enc: Mapped[str | None] = mapped_column(String)

    # relationships
    members: Mapped[list["WorkspaceMember"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    agents: Mapped[list["Agent"]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    phone_numbers: Mapped[list["PhoneNumber"]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    integrations: Mapped[list["WorkspaceIntegration"]] = relationship(back_populates="workspace", cascade="all, delete-orphan")

class WorkspaceMember(AppBase):
    __tablename__ = "workspace_members"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[WorkspaceRole] = mapped_column(
        SAEnum(WorkspaceRole, name="workspace_role"), default=WorkspaceRole.viewer
    )
    invited_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    workspace: Mapped["Workspace"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(
        back_populates="workspace_memberships",
        foreign_keys=[user_id]
    )

class Invitation(AppBase):
    __tablename__ = "invitations"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[WorkspaceRole] = mapped_column(
        SAEnum(WorkspaceRole, name="workspace_role"), default=WorkspaceRole.viewer
    )
    token: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    invited_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

class OAuthAccount(AppBase):
    __tablename__ = "oauth_accounts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String, nullable=False)
    provider_uid: Mapped[str] = mapped_column(String, nullable=False)
    access_token: Mapped[str] = mapped_column(String, nullable=False)
    refresh_token: Mapped[str | None] = mapped_column(String)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    raw_profile: Mapped[dict | None] = mapped_column(JSON)

    user: Mapped["User"] = relationship(back_populates="oauth_accounts")
