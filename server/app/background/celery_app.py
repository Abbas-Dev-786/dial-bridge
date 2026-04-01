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
    # Acknowledge task only after it finishes
    task_acks_late=True,
    # One task at a time per worker process
    worker_prefetch_multiplier=1,
    # Route tasks to specific queues
    task_routes={
        "app.background.dialer.feed_campaign_contacts":     {"queue": "feeders"},
        "app.background.dialer.dispatch_call":              {"queue": "calls"},
        "app.background.dialer.recover_orphaned_feeders":   {"queue": "default"},
        "app.background.outgoing_webhooks.deliver_webhook": {"queue": "webhooks"},
        "app.background.kb_sync.*":                         {"queue": "default"},
        "app.background.stats.*":                           {"queue": "default"},
    },
)

# Periodic tasks
celery_app.conf.beat_schedule = {
    # Safety net to restart feeders if a worker dies
    "recover-orphaned-feeders": {
        "task": "app.background.dialer.recover_orphaned_feeders",
        "schedule": 120.0,
    },
    # Check for pending KB syncs every 5 minutes
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
