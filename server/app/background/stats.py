import asyncio
import logging
from datetime import date, timedelta
from sqlalchemy import text
from app.background.celery_app import celery_app
from app.background.utils import async_task
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

@celery_app.task(name="app.background.stats.reconcile_yesterday_stats", queue="default")
@async_task
async def reconcile_yesterday_stats():
    """Daily task to reconcile stats for all campaigns in all workspaces."""
    yesterday = date.today() - timedelta(days=1)
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("""
            INSERT INTO campaign_daily_stats (
                workspace_id, campaign_id, agent_id, stat_date,
                calls_total, calls_completed, calls_failed,
                calls_no_answer, calls_busy, calls_voicemail, calls_transferred,
                total_duration_seconds, avg_duration_seconds,
                cost_telephony_cents, cost_llm_cents, cost_tts_cents, cost_stt_cents,
                avg_latency_p50_ms, avg_latency_p95_ms,
                outcome_booked_demo, outcome_interested,
                outcome_not_interested, outcome_callback,
                sentiment_positive, sentiment_neutral, sentiment_negative,
                contacts_called
            )
            SELECT
                workspace_id, campaign_id, agent_id,
                DATE(started_at),
                COUNT(*),
                COUNT(*) FILTER (WHERE status = 'completed'),
                COUNT(*) FILTER (WHERE status = 'failed'),
                COUNT(*) FILTER (WHERE status = 'no_answer'),
                COUNT(*) FILTER (WHERE status = 'busy'),
                COUNT(*) FILTER (WHERE status = 'voicemail'),
                COUNT(*) FILTER (WHERE was_transferred IS TRUE),
                COALESCE(SUM(duration_seconds), 0),
                AVG(duration_seconds)::NUMERIC(8,2),
                COALESCE(SUM(cost_telephony_cents), 0),
                COALESCE(SUM(cost_llm_cents), 0),
                COALESCE(SUM(cost_tts_cents), 0),
                COALESCE(SUM(cost_stt_cents), 0),
                AVG(latency_p50_ms)::INTEGER,
                AVG(latency_p95_ms)::INTEGER,
                COUNT(*) FILTER (WHERE outcome = 'booked_demo'),
                COUNT(*) FILTER (WHERE outcome = 'interested'),
                COUNT(*) FILTER (WHERE outcome = 'not_interested'),
                COUNT(*) FILTER (WHERE outcome = 'callback_requested'),
                COUNT(*) FILTER (WHERE sentiment = 'positive'),
                COUNT(*) FILTER (WHERE sentiment = 'neutral'),
                COUNT(*) FILTER (WHERE sentiment = 'negative'),
                COUNT(DISTINCT contact_id)
            FROM calls
            WHERE DATE(started_at) = :yesterday
              AND started_at IS NOT NULL
            GROUP BY workspace_id, campaign_id, agent_id, DATE(started_at)
            ON CONFLICT (campaign_id, stat_date) DO UPDATE SET
                calls_total             = EXCLUDED.calls_total,
                calls_completed         = EXCLUDED.calls_completed,
                calls_failed            = EXCLUDED.calls_failed,
                calls_no_answer         = EXCLUDED.calls_no_answer,
                calls_busy              = EXCLUDED.calls_busy,
                calls_voicemail         = EXCLUDED.calls_voicemail,
                calls_transferred       = EXCLUDED.calls_transferred,
                total_duration_seconds  = EXCLUDED.total_duration_seconds,
                avg_duration_seconds    = EXCLUDED.avg_duration_seconds,
                cost_telephony_cents    = EXCLUDED.cost_telephony_cents,
                cost_llm_cents          = EXCLUDED.cost_llm_cents,
                cost_tts_cents          = EXCLUDED.cost_tts_cents,
                cost_stt_cents          = EXCLUDED.cost_stt_cents,
                avg_latency_p50_ms      = EXCLUDED.avg_latency_p50_ms,
                avg_latency_p95_ms      = EXCLUDED.avg_latency_p95_ms,
                outcome_booked_demo     = EXCLUDED.outcome_booked_demo,
                outcome_interested      = EXCLUDED.outcome_interested,
                outcome_not_interested  = EXCLUDED.outcome_not_interested,
                outcome_callback        = EXCLUDED.outcome_callback,
                sentiment_positive      = EXCLUDED.sentiment_positive,
                sentiment_neutral       = EXCLUDED.sentiment_neutral,
                sentiment_negative      = EXCLUDED.sentiment_negative,
                contacts_called         = EXCLUDED.contacts_called,
                updated_at              = NOW()
            """),
            {"yesterday": yesterday},
        )
        await db.commit()
    logger.info(f"Nightly stats reconciliation complete for {yesterday}")
