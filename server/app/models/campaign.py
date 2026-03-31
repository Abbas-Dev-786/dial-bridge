import uuid
from datetime import datetime, date, time
from sqlalchemy import String, DateTime, ForeignKey, JSON, Enum as SAEnum, Integer, Boolean, Index, Date, Time, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql.expression import text

from app.models import AppBase
from app.enums import (
    CampaignStatus, 
    KBSyncStatus, 
    RetryOnOutcome, 
    KBSnapshotTrigger
)

class Campaign(AppBase):
    __tablename__ = "campaigns"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    goal_description: Mapped[str | None] = mapped_column(String)
    status: Mapped[CampaignStatus] = mapped_column(
        SAEnum(CampaignStatus, name="campaign_status"), default=CampaignStatus.draft
    )
    
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agents.id", ondelete="SET NULL"), index=True
    )
    phone_number_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("phone_numbers.id", ondelete="SET NULL"), index=True
    )
    
    kb_sync_status: Mapped[KBSyncStatus] = mapped_column(
        SAEnum(KBSyncStatus, name="kb_sync_status"), default=KBSyncStatus.pending
    )
    kb_last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    
    timezone: Mapped[str] = mapped_column(String, default="US/Eastern")
    schedule_days: Mapped[list[str]] = mapped_column(
        ARRAY(String), default=["Mon", "Tue", "Wed", "Thu", "Fri"]
    )
    schedule_start_time: Mapped[time] = mapped_column(Time, default=time(9, 0))
    schedule_end_time: Mapped[time] = mapped_column(Time, default=time(17, 0))
    
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    
    max_concurrency: Mapped[int] = mapped_column(Integer, default=5)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)
    retry_delay_minutes: Mapped[int] = mapped_column(Integer, default=30)
    retry_on_outcomes: Mapped[list[RetryOnOutcome]] = mapped_column(
        ARRAY(SAEnum(RetryOnOutcome, name="retry_on_outcome")),
        default=[
            RetryOnOutcome.no_answer,
            RetryOnOutcome.busy,
            RetryOnOutcome.voicemail,
        ],
    )
    
    dnc_check_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    record_calls: Mapped[bool] = mapped_column(Boolean, default=True)
    tcpa_mode: Mapped[bool] = mapped_column(Boolean, default=True)
    voicemail_detection: Mapped[bool] = mapped_column(Boolean, default=True)
    leave_voicemail: Mapped[bool] = mapped_column(Boolean, default=False)
    
    caller_id_display_name: Mapped[str | None] = mapped_column(String)
    
    # Stats
    contacts_total: Mapped[int] = mapped_column(Integer, default=0)
    contacts_called: Mapped[int] = mapped_column(Integer, default=0)
    contacts_remaining: Mapped[int] = mapped_column(Integer, default=0)
    calls_successful: Mapped[int] = mapped_column(Integer, default=0)
    calls_failed: Mapped[int] = mapped_column(Integer, default=0)
    total_spend_cents: Mapped[int] = mapped_column(Integer, default=0)
    
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    workspace: Mapped["Workspace"] = relationship(back_populates="campaigns")
    agent: Mapped["Agent | None"] = relationship()
    phone_number: Mapped["PhoneNumber | None"] = relationship()
    
    # These models will be implemented in future phases
    knowledge_documents: Mapped[list["KnowledgeDocument"]] = relationship("KnowledgeDocument", back_populates="campaign")
    kb_snapshots: Mapped[list["CampaignKBSnapshot"]] = relationship(
        "CampaignKBSnapshot", back_populates="campaign", cascade="all, delete-orphan"
    )
    contacts: Mapped[list["Contact"]] = relationship("Contact", back_populates="campaign")
    calls: Mapped[list["Call"]] = relationship("Call", back_populates="campaign")
    integrations: Mapped[list["CampaignIntegration"]] = relationship("CampaignIntegration", back_populates="campaign")

    __table_args__ = (
        Index(
            "idx_campaigns_agent_one_active",
            "agent_id",
            unique=True,
            postgresql_where=text(
                "status IN ('live', 'scheduled') "
                "AND agent_id IS NOT NULL "
                "AND deleted_at IS NULL"
            ),
        ),
    )
