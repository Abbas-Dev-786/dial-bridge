from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "dialbridge",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.background.dialer",
        "app.background.kb_sync",
        "app.background.stats",
        "app.background.outgoing_webhooks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,           # acknowledge after task completes
    worker_prefetch_multiplier=1,  # one task at a time per worker
)

# Periodic tasks schedule
celery_app.conf.beat_schedule = {
    # Run the dialer tick every 30 seconds
    "dialer-tick": {
        "task": "app.background.dialer.dialer_tick",
        "schedule": 30.0,
        "options": {"queue": "dialer"},
    },
    # Check for stale KB syncs every 5 minutes
    "kb-sync-check": {
        "task": "app.background.kb_sync.check_pending_kb_syncs",
        "schedule": 300.0,
    },
    # Nightly stats reconciliation at 01:00 UTC
    "nightly-stats": {
        "task": "app.background.stats.reconcile_yesterday_stats",
        "schedule": crontab(hour=1, minute=0),
    },
}

# Optional: define queues if we want to separate workloads
# celery_app.conf.task_routes = {
#     "app.background.dialer.*": {"queue": "dialer"},
#     "app.background.outgoing_webhooks.*": {"queue": "webhooks"},
# }
