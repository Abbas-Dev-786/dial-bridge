from sqlalchemy import Column, DateTime, Enum as SAEnum, String, Text, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

from app.core.database import Base
from app.enums import (
    PlanName,
    BillingInterval,
    SubscriptionStatus,
    AgentStatus,
    LLMProvider,
    InterruptionSensitivity,
    ToolType,
    HttpMethod,
    PhoneNumberType,
    PhoneProvider,
    PhoneNumberStatus,
    CampaignStatus,
    KbSyncStatus,
    DocType,
    DocStatus,
    ContactStatus,
    CallDirection,
    CallStatus,
    TranscriptSpeaker,
    Sentiment,
    RetryOnOutcome,
    IntegrationStatus,
    AuthMethod,
    WebhookDeliveryStatus,
    KbSnapshotTrigger,
    UserStatus,
    WorkspaceRole,
)


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True, index=True)
    logo_url = Column(String, nullable=True)
    timezone = Column(String, nullable=False, default="UTC")
    default_language = Column(String, nullable=False, default="en")
    elevenlabs_api_key_enc = Column(
        Text, nullable=True
    )  # Encrypted at application layer
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
