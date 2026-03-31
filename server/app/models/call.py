import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum, Integer, Boolean, Numeric, SmallInteger as SmallINT, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models import AppBase
from app.enums import CallDirection, CallStatus, TranscriptSpeaker, Sentiment

class Call(AppBase):
    __tablename__ = "calls"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agents.id", ondelete="SET NULL"), nullable=True, index=True
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    phone_number_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("phone_numbers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    elevenlabs_conversation_id: Mapped[str | None] = mapped_column(
        String, nullable=True, unique=True, index=True
    )
    kb_snapshot_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("campaign_kb_snapshots.id", ondelete="SET NULL"), nullable=True
    )
    direction: Mapped[CallDirection] = mapped_column(
        SAEnum(CallDirection, name="call_direction"), default=CallDirection.outbound
    )
    from_number: Mapped[str] = mapped_column(String)
    to_number: Mapped[str] = mapped_column(String)
    status: Mapped[CallStatus] = mapped_column(
        SAEnum(CallStatus, name="call_status"), default=CallStatus.queued
    )
    queued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    outcome: Mapped[str | None] = mapped_column(String)
    sentiment: Mapped[Sentiment | None] = mapped_column(
        SAEnum(Sentiment, name="sentiment")
    )
    is_voicemail: Mapped[bool] = mapped_column(Boolean, default=False)
    was_transferred: Mapped[bool] = mapped_column(Boolean, default=False)
    transfer_destination: Mapped[str | None] = mapped_column(String)
    recording_url: Mapped[str | None] = mapped_column(String)
    summary: Mapped[str | None] = mapped_column(String)
    cost_telephony_cents: Mapped[int] = mapped_column(Integer, default=0)
    cost_llm_cents: Mapped[int] = mapped_column(Integer, default=0)
    cost_tts_cents: Mapped[int] = mapped_column(Integer, default=0)
    cost_stt_cents: Mapped[int] = mapped_column(Integer, default=0)
    latency_p50_ms: Mapped[int | None] = mapped_column(Integer)
    latency_p95_ms: Mapped[int | None] = mapped_column(Integer)
    latency_p99_ms: Mapped[int | None] = mapped_column(Integer)
    retry_number: Mapped[int] = mapped_column(SmallINT, default=0)
    error_code: Mapped[str | None] = mapped_column(String)
    error_message: Mapped[str | None] = mapped_column(String)
    raw_provider_payload: Mapped[dict | None] = mapped_column(JSONB)

    # Relationships
    workspace: Mapped["Workspace"] = relationship(back_populates="calls")
    campaign: Mapped["Campaign | None"] = relationship(back_populates="calls")
    agent: Mapped["Agent | None"] = relationship()
    contact: Mapped["Contact | None"] = relationship(back_populates="calls")
    phone_number: Mapped["PhoneNumber | None"] = relationship()
    kb_snapshot: Mapped["CampaignKBSnapshot | None"] = relationship()
    
    transcripts: Mapped[list["CallTranscript"]] = relationship(
        "CallTranscript", back_populates="call", cascade="all, delete-orphan"
    )
    evaluations: Mapped[list["CallEvaluation"]] = relationship(
        "CallEvaluation", back_populates="call", cascade="all, delete-orphan"
    )
    collected_data: Mapped[list["CallCollectedData"]] = relationship(
        "CallCollectedData", back_populates="call", cascade="all, delete-orphan"
    )

class CallTranscript(AppBase):
    __tablename__ = "call_transcripts"

    call_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sequence: Mapped[int] = mapped_column(SmallINT, nullable=False)
    speaker: Mapped[TranscriptSpeaker] = mapped_column(
        SAEnum(TranscriptSpeaker, name="transcript_speaker"), nullable=False
    )
    text: Mapped[str] = mapped_column(String, nullable=False)
    timestamp_secs: Mapped[float | None] = mapped_column(Numeric(8, 2))
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    tool_name: Mapped[str | None] = mapped_column(String)
    tool_payload: Mapped[dict | None] = mapped_column(JSONB)

    call: Mapped["Call"] = relationship(back_populates="transcripts")

    __table_args__ = (
        UniqueConstraint("call_id", "sequence", name="uq_call_transcripts_sequence"),
    )

class CallEvaluation(AppBase):
    __tablename__ = "call_evaluations"

    call_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, index=True
    )
    criteria: Mapped[str] = mapped_column(String, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    score: Mapped[float | None] = mapped_column(Numeric(4, 2))
    rationale: Mapped[str | None] = mapped_column(String)
    evaluated_by: Mapped[str] = mapped_column(String, default="llm")

    call: Mapped["Call"] = relationship(back_populates="evaluations")

class CallCollectedData(AppBase):
    __tablename__ = "call_collected_data"

    call_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, index=True
    )
    field_key: Mapped[str] = mapped_column(String, nullable=False)
    field_value: Mapped[str | None] = mapped_column(String)
    confidence: Mapped[float | None] = mapped_column(Numeric(4, 2))

    call: Mapped["Call"] = relationship(back_populates="collected_data")
