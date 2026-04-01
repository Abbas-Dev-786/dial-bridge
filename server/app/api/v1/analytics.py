import asyncio
from datetime import date, timedelta
from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_workspace_member
from app.models.analytics import CampaignDailyStats
from app.models.campaign import Campaign
from app.services import campaign_service
from app.schemas.analytics import (
    DateRangeParams,
    AnalyticsOverview,
    DailyVolumePoint,
    DailyCostPoint,
    DailyLatencyPoint,
    OutcomeDistribution,
    SentimentDistribution,
    VolumeChartResponse,
    CostChartResponse,
    LatencyChartResponse,
    FullAnalyticsResponse,
)

router = APIRouter()

# --- Helpers ---

async def query_daily_stats(
    db: AsyncSession,
    workspace_id: UUID,
    date_from: date,
    date_to: date,
    campaign_id: UUID | None = None,
) -> List[CampaignDailyStats]:
    filters = [
        CampaignDailyStats.workspace_id == workspace_id,
        CampaignDailyStats.stat_date >= date_from,
        CampaignDailyStats.stat_date <= date_to,
    ]
    if campaign_id:
        filters.append(CampaignDailyStats.campaign_id == campaign_id)

    result = await db.execute(
        select(CampaignDailyStats)
        .where(and_(*filters))
        .order_by(CampaignDailyStats.stat_date.asc())
    )
    return list(result.scalars().all())

def period_length_days(date_from: date, date_to: date) -> int:
    return (date_to - date_from).days + 1

def previous_period(date_from: date, date_to: date) -> tuple[date, date]:
    days = period_length_days(date_from, date_to)
    prev_to = date_from - timedelta(days=1)
    prev_from = prev_to - timedelta(days=days - 1)
    return prev_from, prev_to

def delta_pct(current: float, previous: float) -> float | None:
    if previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 1)

# --- Aggregate Builders ---

def build_overview(
    rows: List[CampaignDailyStats], 
    prev_rows: List[CampaignDailyStats],
    campaign: Campaign | None = None
) -> AnalyticsOverview:
    total_calls = sum(r.calls_total for r in rows)
    total_calls_prev = sum(r.calls_total for r in prev_rows)
    
    completed = sum(r.calls_completed for r in rows)
    completed_prev = sum(r.calls_completed for r in prev_rows)
    
    success_rate = (completed / total_calls * 100) if total_calls > 0 else 0
    success_rate_prev = (completed_prev / total_calls_prev * 100) if total_calls_prev > 0 else 0
    
    total_cost = sum(
        r.cost_telephony_cents + r.cost_llm_cents + r.cost_tts_cents + r.cost_stt_cents
        for r in rows
    )
    total_cost_prev = sum(
        r.cost_telephony_cents + r.cost_llm_cents + r.cost_tts_cents + r.cost_stt_cents
        for r in prev_rows
    )

    # Average duration (weighted)
    total_duration = sum(r.total_duration_seconds for r in rows)
    avg_duration = (total_duration / completed) if completed > 0 else None

    # Latency (simple average of daily averages for now, or we could weight by calls)
    latency_rows = [r.avg_latency_p50_ms for r in rows if r.avg_latency_p50_ms is not None]
    avg_latency = int(sum(latency_rows) / len(latency_rows)) if latency_rows else None

    # Contacts
    contacts_called = sum(r.contacts_called for r in rows)

    return AnalyticsOverview(
        total_calls=total_calls,
        total_calls_delta_pct=delta_pct(total_calls, total_calls_prev),
        success_rate=round(success_rate, 1),
        success_rate_delta_pct=delta_pct(success_rate, success_rate_prev),
        avg_duration_seconds=round(float(avg_duration), 1) if avg_duration is not None else None,
        total_cost_cents=total_cost,
        total_cost_delta_pct=delta_pct(total_cost, total_cost_prev),
        avg_latency_p50_ms=avg_latency,
        contacts_called=contacts_called,
        contacts_remaining=campaign.contacts_remaining if campaign else None,
    )


def build_volume_chart(rows: List[CampaignDailyStats], date_from: date, date_to: date) -> VolumeChartResponse:
    # Map rows to dates
    data_map = {r.stat_date: r for r in rows}
    points = []
    
    curr = date_from
    total_calls = 0
    total_completed = 0
    
    while curr <= date_to:
        row = data_map.get(curr)
        if row:
            points.append(DailyVolumePoint(
                date=curr,
                calls_total=row.calls_total,
                calls_completed=row.calls_completed,
                calls_failed=row.calls_failed,
                calls_voicemail=row.calls_voicemail,
            ))
            total_calls += row.calls_total
            total_completed += row.calls_completed
        else:
            points.append(DailyVolumePoint(
                date=curr,
                calls_total=0,
                calls_completed=0,
                calls_failed=0,
                calls_voicemail=0,
            ))
        curr += timedelta(days=1)
        
    return VolumeChartResponse(
        data=points,
        total_calls=total_calls,
        total_completed=total_completed,
    )

def build_cost_chart(rows: List[CampaignDailyStats], date_from: date, date_to: date) -> CostChartResponse:
    data_map = {r.stat_date: r for r in rows}
    points = []
    curr = date_from
    grand_total = 0
    
    while curr <= date_to:
        row = data_map.get(curr)
        if row:
            total = row.cost_telephony_cents + row.cost_llm_cents + row.cost_tts_cents + row.cost_stt_cents
            points.append(DailyCostPoint(
                date=curr,
                cost_telephony_cents=row.cost_telephony_cents,
                cost_llm_cents=row.cost_llm_cents,
                cost_tts_cents=row.cost_tts_cents,
                total_cost_cents=total,
            ))
            grand_total += total
        else:
            points.append(DailyCostPoint(date=curr, cost_telephony_cents=0, cost_llm_cents=0, cost_tts_cents=0, total_cost_cents=0))
        curr += timedelta(days=1)
        
    return CostChartResponse(data=points, total_cost_cents=grand_total)

def build_latency_chart(rows: List[CampaignDailyStats], date_from: date, date_to: date) -> LatencyChartResponse:
    data_map = {r.stat_date: r for r in rows}
    points = []
    curr = date_from
    
    while curr <= date_to:
        row = data_map.get(curr)
        if row:
            points.append(DailyLatencyPoint(
                date=curr,
                avg_latency_p50_ms=row.avg_latency_p50_ms,
                avg_latency_p95_ms=row.avg_latency_p95_ms,
            ))
        else:
            points.append(DailyLatencyPoint(date=curr, avg_latency_p50_ms=None, avg_latency_p95_ms=None))
        curr += timedelta(days=1)
        
    p50_vals = [r.avg_latency_p50_ms for r in rows if r.avg_latency_p50_ms is not None]
    p95_vals = [r.avg_latency_p95_ms for r in rows if r.avg_latency_p95_ms is not None]
    
    return LatencyChartResponse(
        data=points,
        overall_avg_p50_ms=int(sum(p50_vals)/len(p50_vals)) if p50_vals else None,
        overall_avg_p95_ms=int(sum(p95_vals)/len(p95_vals)) if p95_vals else None,
    )

def build_outcomes(rows: List[CampaignDailyStats]) -> OutcomeDistribution:
    return OutcomeDistribution(
        booked_demo=sum(r.outcome_booked_demo for r in rows),
        interested=sum(r.outcome_interested for r in rows),
        not_interested=sum(r.outcome_not_interested for r in rows),
        callback_requested=sum(r.outcome_callback for r in rows),
        voicemail=sum(r.calls_voicemail for r in rows),
        no_answer=sum(r.calls_no_answer for r in rows),
        failed=sum(r.calls_failed for r in rows),
    )

def build_sentiment(rows: List[CampaignDailyStats]) -> SentimentDistribution:
    # Calculate unknown sentiment by subtracting known sentiments from total completed calls
    completed = sum(r.calls_completed for r in rows)
    pos = sum(r.sentiment_positive for r in rows)
    neu = sum(r.sentiment_neutral for r in rows)
    neg = sum(r.sentiment_negative for r in rows)
    unknown = max(0, completed - (pos + neu + neg))
    
    return SentimentDistribution(
        positive=pos,
        neutral=neu,
        negative=neg,
        unknown=unknown,
    )

# --- Routes ---

@router.get("/{workspace_id}/analytics", response_model=FullAnalyticsResponse)
async def get_full_analytics(
    workspace_id: UUID,
    params: DateRangeParams = Depends(),
    db: AsyncSession = Depends(get_db),
    member = Depends(get_workspace_member),
):
    prev_from, prev_to = previous_period(params.date_from, params.date_to)
    
    # Fetch campaign metadata if campaign_id is provided
    campaign = None
    if params.campaign_id:
        campaign = await campaign_service.get_campaign(db, workspace_id, params.campaign_id)

    rows, prev_rows = await asyncio.gather(
        query_daily_stats(db, workspace_id, params.date_from, params.date_to, params.campaign_id),
        query_daily_stats(db, workspace_id, prev_from, prev_to, params.campaign_id),
    )

    return FullAnalyticsResponse(
        overview=build_overview(rows, prev_rows, campaign),
        volume=build_volume_chart(rows, params.date_from, params.date_to),
        cost=build_cost_chart(rows, params.date_from, params.date_to),
        latency=build_latency_chart(rows, params.date_from, params.date_to),
        outcomes=build_outcomes(rows),
        sentiment=build_sentiment(rows),
        date_from=params.date_from,
        date_to=params.date_to,
    )

@router.get("/{workspace_id}/analytics/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(
    workspace_id: UUID,
    params: DateRangeParams = Depends(),
    db: AsyncSession = Depends(get_db),
    member = Depends(get_workspace_member),
):
    prev_from, prev_to = previous_period(params.date_from, params.date_to)
    
    campaign = None
    if params.campaign_id:
        campaign = await campaign_service.get_campaign(db, workspace_id, params.campaign_id)
        
    rows, prev_rows = await asyncio.gather(
        query_daily_stats(db, workspace_id, params.date_from, params.date_to, params.campaign_id),
        query_daily_stats(db, workspace_id, prev_from, prev_to, params.campaign_id),
    )
    return build_overview(rows, prev_rows, campaign)

@router.get("/{workspace_id}/analytics/volume", response_model=VolumeChartResponse)
async def get_analytics_volume(
    workspace_id: UUID,
    params: DateRangeParams = Depends(),
    db: AsyncSession = Depends(get_db),
    member = Depends(get_workspace_member),
):
    rows = await query_daily_stats(db, workspace_id, params.date_from, params.date_to, params.campaign_id)
    return build_volume_chart(rows, params.date_from, params.date_to)

@router.get("/{workspace_id}/analytics/cost", response_model=CostChartResponse)
async def get_analytics_cost(
    workspace_id: UUID,
    params: DateRangeParams = Depends(),
    db: AsyncSession = Depends(get_db),
    member = Depends(get_workspace_member),
):
    rows = await query_daily_stats(db, workspace_id, params.date_from, params.date_to, params.campaign_id)
    return build_cost_chart(rows, params.date_from, params.date_to)

@router.get("/{workspace_id}/analytics/latency", response_model=LatencyChartResponse)
async def get_analytics_latency(
    workspace_id: UUID,
    params: DateRangeParams = Depends(),
    db: AsyncSession = Depends(get_db),
    member = Depends(get_workspace_member),
):
    rows = await query_daily_stats(db, workspace_id, params.date_from, params.date_to, params.campaign_id)
    return build_latency_chart(rows, params.date_from, params.date_to)

@router.get("/{workspace_id}/analytics/outcomes", response_model=OutcomeDistribution)
async def get_analytics_outcomes(
    workspace_id: UUID,
    params: DateRangeParams = Depends(),
    db: AsyncSession = Depends(get_db),
    member = Depends(get_workspace_member),
):
    rows = await query_daily_stats(db, workspace_id, params.date_from, params.date_to, params.campaign_id)
    return build_outcomes(rows)

@router.get("/{workspace_id}/analytics/sentiment", response_model=SentimentDistribution)
async def get_analytics_sentiment(
    workspace_id: UUID,
    params: DateRangeParams = Depends(),
    db: AsyncSession = Depends(get_db),
    member = Depends(get_workspace_member),
):
    rows = await query_daily_stats(db, workspace_id, params.date_from, params.date_to, params.campaign_id)
    return build_sentiment(rows)

@router.get("/{workspace_id}/campaigns/{campaign_id}/analytics", response_model=FullAnalyticsResponse)
async def get_campaign_analytics(
    workspace_id: UUID,
    campaign_id: UUID,
    params: DateRangeParams = Depends(),
    db: AsyncSession = Depends(get_db),
    member = Depends(get_workspace_member),
):
    # Ensure campaign belongs to workspace and fetch it
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    
    params.campaign_id = campaign_id
    prev_from, prev_to = previous_period(params.date_from, params.date_to)
    
    rows, prev_rows = await asyncio.gather(
        query_daily_stats(db, workspace_id, params.date_from, params.date_to, params.campaign_id),
        query_daily_stats(db, workspace_id, prev_from, prev_to, params.campaign_id),
    )

    return FullAnalyticsResponse(
        overview=build_overview(rows, prev_rows, campaign),
        volume=build_volume_chart(rows, params.date_from, params.date_to),
        cost=build_cost_chart(rows, params.date_from, params.date_to),
        latency=build_latency_chart(rows, params.date_from, params.date_to),
        outcomes=build_outcomes(rows),
        sentiment=build_sentiment(rows),
        date_from=params.date_from,
        date_to=params.date_to,
    )

