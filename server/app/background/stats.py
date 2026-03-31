from datetime import date, timedelta
from sqlalchemy import text
from app.background.celery_app import celery_app
from app.background.utils import async_task
from app.database import AsyncSessionLocal
from app.models.call import Call
from app.enums import CallStatus

@celery_app.task
@async_task
async def reconcile_yesterday_stats():
    """Nightly task to reconcile stats from the previous day."""
    yesterday = date.today() - timedelta(days=1)
    
    async with AsyncSessionLocal() as db:
        sql = """
            INSERT INTO campaign_daily_stats (
                workspace_id, campaign_id, agent_id, stat_date,
                calls_total, calls_completed, calls_failed,
                calls_no_answer, calls_busy, calls_voicemail,
                calls_transferred, total_duration_seconds,
                avg_duration_seconds, cost_telephony_cents,
                cost_llm_cents, cost_tts_cents, cost_stt_cents,
                avg_latency_p50_ms, avg_latency_p95_ms,
                outcome_booked_demo, outcome_interested,
                outcome_not_interested, outcome_callback,
                sentiment_positive, sentiment_neutral, sentiment_negative,
                contacts_called
            )
            SELECT
                workspace_id,
                campaign_id,
                agent_id,
                DATE(started_at AT TIME ZONE 'UTC') as stat_date,
                COUNT(*) as calls_total,
                COUNT(*) FILTER (WHERE status = 'completed') as calls_completed,
                COUNT(*) FILTER (WHERE status = 'failed') as calls_failed,
                COUNT(*) FILTER (WHERE status = 'no_answer') as calls_no_answer,
                COUNT(*) FILTER (WHERE status = 'busy') as calls_busy,
                COUNT(*) FILTER (WHERE status = 'voicemail') as calls_voicemail,
                COUNT(*) FILTER (WHERE was_transferred = TRUE) as calls_transferred,
                SUM(COALESCE(duration_seconds, 0)) as total_duration_seconds,
                AVG(duration_seconds)::NUMERIC(8,2) as avg_duration_seconds,
                SUM(cost_telephony_cents) as cost_telephony_cents,
                SUM(cost_llm_cents) as cost_llm_cents,
                SUM(cost_tts_cents) as cost_tts_cents,
                SUM(cost_stt_cents) as cost_stt_cents,
                AVG(latency_p50_ms)::INTEGER as avg_latency_p50_ms,
                AVG(latency_p95_ms)::INTEGER as avg_latency_p95_ms,
                COUNT(*) FILTER (WHERE outcome = 'booked_demo') as outcome_booked_demo,
                COUNT(*) FILTER (WHERE outcome = 'interested') as outcome_interested,
                COUNT(*) FILTER (WHERE outcome = 'not_interested') as outcome_not_interested,
                COUNT(*) FILTER (WHERE outcome = 'callback_requested') as outcome_callback,
                COUNT(*) FILTER (WHERE sentiment = 'positive') as sentiment_positive,
                COUNT(*) FILTER (WHERE sentiment = 'neutral') as sentiment_neutral,
                COUNT(*) FILTER (WHERE sentiment = 'negative') as sentiment_negative,
                COUNT(DISTINCT contact_id) as contacts_called
            FROM calls
            WHERE DATE(started_at AT TIME ZONE 'UTC') = :yesterday
              AND started_at IS NOT NULL
              AND campaign_id IS NOT NULL
            GROUP BY workspace_id, campaign_id, agent_id, DATE(started_at AT TIME ZONE 'UTC')
            ON CONFLICT (campaign_id, stat_date) DO UPDATE SET
                calls_total = EXCLUDED.calls_total,
                calls_completed = EXCLUDED.calls_completed,
                calls_failed = EXCLUDED.calls_failed,
                calls_no_answer = EXCLUDED.calls_no_answer,
                calls_busy = EXCLUDED.calls_busy,
                calls_voicemail = EXCLUDED.calls_voicemail,
                calls_transferred = EXCLUDED.calls_transferred,
                total_duration_seconds = EXCLUDED.total_duration_seconds,
                avg_duration_seconds = EXCLUDED.avg_duration_seconds,
                cost_telephony_cents = EXCLUDED.cost_telephony_cents,
                cost_llm_cents = EXCLUDED.cost_llm_cents,
                cost_tts_cents = EXCLUDED.cost_tts_cents,
                cost_stt_cents = EXCLUDED.cost_stt_cents,
                avg_latency_p50_ms = EXCLUDED.avg_latency_p50_ms,
                avg_latency_p95_ms = EXCLUDED.avg_latency_p95_ms,
                outcome_booked_demo = EXCLUDED.outcome_booked_demo,
                outcome_interested = EXCLUDED.outcome_interested,
                outcome_not_interested = EXCLUDED.outcome_not_interested,
                outcome_callback = EXCLUDED.outcome_callback,
                sentiment_positive = EXCLUDED.sentiment_positive,
                sentiment_neutral = EXCLUDED.sentiment_neutral,
                sentiment_negative = EXCLUDED.sentiment_negative,
                contacts_called = EXCLUDED.contacts_called,
                updated_at = NOW()
        """
        await db.execute(text(sql), {"yesterday": yesterday})
        await db.commit()

async def increment_daily_stats(db, call: Call) -> None:
    """Helper to incrementally update stats for the current day."""
    if not call.campaign_id:
        return
        
    sql = """
        INSERT INTO campaign_daily_stats (
            workspace_id, campaign_id, agent_id, stat_date,
            calls_total, calls_completed, calls_failed,
            calls_no_answer, calls_busy, calls_voicemail,
            calls_transferred, total_duration_seconds,
            cost_telephony_cents, cost_llm_cents, 
            cost_tts_cents, cost_stt_cents,
            contacts_called
        ) VALUES (
            :workspace_id, :campaign_id, :agent_id, CURRENT_DATE,
            1, :is_completed, :is_failed,
            :is_no_answer, :is_busy, :is_voicemail,
            :is_transferred, :duration,
            :cost_tel, :cost_llm, 
            :cost_tts, :cost_stt,
            1
        )
        ON CONFLICT (campaign_id, stat_date) DO UPDATE SET
            calls_total = campaign_daily_stats.calls_total + 1,
            calls_completed = campaign_daily_stats.calls_completed + EXCLUDED.calls_completed,
            calls_failed = campaign_daily_stats.calls_failed + EXCLUDED.calls_failed,
            calls_no_answer = campaign_daily_stats.calls_no_answer + EXCLUDED.calls_no_answer,
            calls_busy = campaign_daily_stats.calls_busy + EXCLUDED.calls_busy,
            calls_voicemail = campaign_daily_stats.calls_voicemail + EXCLUDED.calls_voicemail,
            calls_transferred = campaign_daily_stats.calls_transferred + EXCLUDED.calls_transferred,
            total_duration_seconds = campaign_daily_stats.total_duration_seconds + EXCLUDED.total_duration_seconds,
            cost_telephony_cents = campaign_daily_stats.cost_telephony_cents + EXCLUDED.cost_telephony_cents,
            cost_llm_cents = campaign_daily_stats.cost_llm_cents + EXCLUDED.cost_llm_cents,
            cost_tts_cents = campaign_daily_stats.cost_tts_cents + EXCLUDED.cost_tts_cents,
            cost_stt_cents = campaign_daily_stats.cost_stt_cents + EXCLUDED.cost_stt_cents,
            updated_at = NOW()
    """
    params = {
        "workspace_id": call.workspace_id,
        "campaign_id": call.campaign_id,
        "agent_id": call.agent_id,
        "is_completed": 1 if call.status == CallStatus.completed else 0,
        "is_failed": 1 if call.status == CallStatus.failed else 0,
        "is_no_answer": 1 if call.status == CallStatus.no_answer else 0,
        "is_busy": 1 if call.status == CallStatus.busy else 0,
        "is_voicemail": 1 if call.is_voicemail or call.status == CallStatus.voicemail else 0,
        "is_transferred": 1 if call.was_transferred else 0,
        "duration": call.duration_seconds or 0,
        "cost_tel": call.cost_telephony_cents or 0,
        "cost_llm": call.cost_llm_cents or 0,
        "cost_tts": call.cost_tts_cents or 0,
        "cost_stt": call.cost_stt_cents or 0,
    }
    await db.execute(text(sql), params)
