import uuid
from datetime import date
from sqlalchemy import String, Date, ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models import AppBase

class CampaignDailyStats(AppBase):
    __tablename__ = "campaign_daily_stats"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agents.id", ondelete="SET NULL"), index=True
    )
    stat_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Call Counts
    calls_total: Mapped[int] = mapped_column(Integer, default=0)
    calls_completed: Mapped[int] = mapped_column(Integer, default=0)
    calls_failed: Mapped[int] = mapped_column(Integer, default=0)
    calls_no_answer: Mapped[int] = mapped_column(Integer, default=0)
    calls_busy: Mapped[int] = mapped_column(Integer, default=0)
    calls_voicemail: Mapped[int] = mapped_column(Integer, default=0)
    calls_transferred: Mapped[int] = mapped_column(Integer, default=0)

    # Duration & Latency
    total_duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    avg_duration_seconds: Mapped[float | None] = mapped_column(Numeric(8, 2))
    avg_latency_p50_ms: Mapped[int | None] = mapped_column(Integer)
    avg_latency_p95_ms: Mapped[int | None] = mapped_column(Integer)

    # Costs (in cents)
    cost_telephony_cents: Mapped[int] = mapped_column(Integer, default=0)
    cost_llm_cents: Mapped[int] = mapped_column(Integer, default=0)
    cost_tts_cents: Mapped[int] = mapped_column(Integer, default=0)
    cost_stt_cents: Mapped[int] = mapped_column(Integer, default=0)

    # Outbound Outcomes (custom mapping)
    outcome_booked_demo: Mapped[int] = mapped_column(Integer, default=0)
    outcome_interested: Mapped[int] = mapped_column(Integer, default=0)
    outcome_not_interested: Mapped[int] = mapped_column(Integer, default=0)
    outcome_callback: Mapped[int] = mapped_column(Integer, default=0)

    # Sentiment
    sentiment_positive: Mapped[int] = mapped_column(Integer, default=0)
    sentiment_neutral: Mapped[int] = mapped_column(Integer, default=0)
    sentiment_negative: Mapped[int] = mapped_column(Integer, default=0)

    # Contacts
    contacts_called: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    workspace: Mapped["Workspace"] = relationship()
    campaign: Mapped["Campaign"] = relationship()
    agent: Mapped["Agent | None"] = relationship()

    __table_args__ = (
        UniqueConstraint("campaign_id", "stat_date", name="uq_campaign_daily_stats"),
    )
