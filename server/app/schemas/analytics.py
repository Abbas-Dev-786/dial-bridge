from datetime import date, timedelta
from uuid import UUID
from pydantic import BaseModel, model_validator

class DateRangeParams(BaseModel):
    """Query params for date-range filtering."""
    date_from: date | None = None   # defaults to 30 days ago
    date_to: date | None = None     # defaults to today
    campaign_id: UUID | None = None # if None, aggregate all campaigns

    @model_validator(mode="after")
    def apply_defaults(self):
        if not self.date_from:
            self.date_from = date.today() - timedelta(days=29)
        if not self.date_to:
            self.date_to = date.today()
        if self.date_from > self.date_to:
            raise ValueError("date_from must be before date_to")
        # Max range: 365 days
        if (self.date_to - self.date_from).days > 365:
            raise ValueError("Date range cannot exceed 365 days")
        return self

# Overview KPI cards
class AnalyticsOverview(BaseModel):
    total_calls: int
    total_calls_delta_pct: float | None    # vs previous period
    success_rate: float                    # percentage
    success_rate_delta_pct: float | None
    avg_duration_seconds: float | None
    total_cost_cents: int
    total_cost_delta_pct: float | None
    avg_latency_p50_ms: int | None
    contacts_called: int
    contacts_remaining: int | None

# Time-series charts
class DailyVolumePoint(BaseModel):
    date: date
    calls_total: int
    calls_completed: int
    calls_failed: int
    calls_voicemail: int

class DailyCostPoint(BaseModel):
    date: date
    cost_telephony_cents: int
    cost_llm_cents: int
    cost_tts_cents: int
    total_cost_cents: int

class DailyLatencyPoint(BaseModel):
    date: date
    avg_latency_p50_ms: int | None
    avg_latency_p95_ms: int | None

# Distributions
class OutcomeDistribution(BaseModel):
    booked_demo: int
    interested: int
    not_interested: int
    callback_requested: int
    voicemail: int
    no_answer: int
    failed: int

class SentimentDistribution(BaseModel):
    positive: int
    neutral: int
    negative: int
    unknown: int   # calls with no sentiment data

# Aggregated responses
class VolumeChartResponse(BaseModel):
    data: list[DailyVolumePoint]
    total_calls: int
    total_completed: int

class CostChartResponse(BaseModel):
    data: list[DailyCostPoint]
    total_cost_cents: int

class LatencyChartResponse(BaseModel):
    data: list[DailyLatencyPoint]
    overall_avg_p50_ms: int | None
    overall_avg_p95_ms: int | None

class FullAnalyticsResponse(BaseModel):
    overview: AnalyticsOverview
    volume: VolumeChartResponse
    cost: CostChartResponse
    latency: LatencyChartResponse
    outcomes: OutcomeDistribution
    sentiment: SentimentDistribution
    date_from: date
    date_to: date
