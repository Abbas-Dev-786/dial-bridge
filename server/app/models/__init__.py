import uuid
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

class UUIDMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

class AppBase(UUIDMixin, TimestampMixin, Base):
    __abstract__ = True

# Re-export models for Alembic discovery
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, Invitation, OAuthAccount
from app.models.agent import Agent, AgentVoiceConfig, AgentConversationConfig, AgentTool
from app.models.phone_number import PhoneNumber
from app.models.campaign import Campaign
from app.models.knowledge import KnowledgeDocument, CampaignKBSnapshot
from app.models.contact import Contact
