from typing import AsyncGenerator
from uuid import UUID
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.enums import WorkspaceRole
from app.exceptions import ForbiddenError


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    from app.services.auth_service import get_current_user as _get_current_user
    return await _get_current_user(db, credentials.credentials)

async def get_workspace_member(
    workspace_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceMember:
    """
    Verifies the current user is a member of the workspace.
    Returns the WorkspaceMember row (which contains their role).
    Raises ForbiddenError if not a member.
    """
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id,
            WorkspaceMember.accepted_at.is_not(None),
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise ForbiddenError()
    return member

def require_role(*roles: WorkspaceRole):
    """
    Factory that returns a dependency requiring the member to have
    one of the specified roles.
    Usage:  Depends(require_role(WorkspaceRole.admin, WorkspaceRole.owner))
    """
    async def _check(member: WorkspaceMember = Depends(get_workspace_member)):
        if member.role not in roles:
            raise ForbiddenError("Insufficient permissions for this action")
        return member
    return _check
