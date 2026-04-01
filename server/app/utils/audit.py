from uuid import UUID
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.platform import AuditLog

async def log_action(
    db: AsyncSession,
    workspace_id: UUID,
    action: str,
    resource_type: str,
    resource_id: UUID | None = None,
    actor_user_id: UUID | None = None,
    actor_type: str = "user",
    diff: dict | None = None,
    request: Request | None = None,
) -> None:
    """
    Append-only audit log entries for key workspace actions.
    Does not commit — caller must commit the transaction.
    """
    log = AuditLog(
        workspace_id=workspace_id,
        actor_user_id=actor_user_id,
        actor_type=actor_type,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        diff=diff,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(log)
