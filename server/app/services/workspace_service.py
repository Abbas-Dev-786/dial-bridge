from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
import secrets
from datetime import datetime, timedelta, timezone
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.models.invitation import Invitation
from app.enums import WorkspaceRole
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceUpdate,
    InviteMemberRequest,
    UpdateMemberRoleRequest,
)
from app.enums import WorkspaceRole


class ConflictError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=409, detail=detail)


class NotFoundError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=404, detail=detail)


class ForbiddenError(HTTPException):
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(status_code=403, detail=detail)


class ValidationError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=400, detail=detail)


async def create_workspace(
    db: AsyncSession, user: User, data: WorkspaceCreate
) -> Workspace:
    # Check slug uniqueness
    result = await db.execute(select(Workspace).where(Workspace.slug == data.slug))
    existing_workspace = result.scalar_one_or_none()
    if existing_workspace:
        raise ConflictError("Slug already taken")

    # Create Workspace row
    workspace = Workspace(
        name=data.name,
        slug=data.slug,
        timezone=data.timezone,
    )
    db.add(workspace)
    await db.flush()
    await db.refresh(workspace)

    # Create WorkspaceMember row with role=owner, accepted_at=now()
    workspace_member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        role=WorkspaceRole.owner,
        accepted_at=datetime.now(timezone.utc),
    )
    db.add(workspace_member)
    await db.flush()

    return workspace


async def get_workspace(db: AsyncSession, workspace_id: str) -> Workspace:
    # Fetch by ID, check deleted_at IS NULL
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id, Workspace.deleted_at.is_(None)
        )
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise NotFoundError("Workspace not found")
    return workspace


async def update_workspace(
    db: AsyncSession, workspace: Workspace, data: WorkspaceUpdate
) -> Workspace:
    # Apply only the non-None fields from data
    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(workspace, field, value)

    db.add(workspace)
    await db.flush()
    await db.refresh(workspace)
    return workspace


async def list_user_workspaces(db: AsyncSession, user: User) -> list[Workspace]:
    # Join WorkspaceMember where user_id = user.id and accepted_at IS NOT NULL
    result = await db.execute(
        select(Workspace)
        .join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
        .where(
            WorkspaceMember.user_id == user.id,
            WorkspaceMember.accepted_at.is_not(None),
            Workspace.deleted_at.is_(None),
        )
    )
    workspaces = result.scalars().all()
    return list(workspaces)


async def invite_member(
    db: AsyncSession, workspace: Workspace, inviter: User, data: InviteMemberRequest
) -> Invitation:
    # Check invitee is not already a member
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id.in_(
                select(User.id).where(User.email == data.email)
            ),
        )
    )
    existing_member = result.scalar_one_or_none()
    if existing_member:
        raise ConflictError("User is already a member of this workspace")

    # Check a pending invitation does not already exist for this email + workspace
    result = await db.execute(
        select(Invitation).where(
            Invitation.workspace_id == workspace.id,
            Invitation.email == data.email,
            Invitation.accepted_at.is_(None),
        )
    )
    existing_invitation = result.scalar_one_or_none()
    if existing_invitation:
        raise ConflictError("Invitation already sent to this email")

    # Generate a secure random token
    token = secrets.token_urlsafe(32)
    # Set expires_at = now() + 7 days
    expires_at = datetime.utcnow() + timedelta(days=7)

    # Create Invitation row
    invitation = Invitation(
        workspace_id=workspace.id,
        invited_by=inviter.id,
        email=data.email,
        role=data.role,
        token=token,
        expires_at=expires_at,
    )
    db.add(invitation)
    await db.flush()
    await db.refresh(invitation)

    # TODO: send invitation email (stub for now — just log the token)
    print(f"Invitation token for {data.email}: {token}")

    return invitation


async def accept_invitation(
    db: AsyncSession, token: str, user: User
) -> WorkspaceMember:
    # Find invitation by token
    result = await db.execute(select(Invitation).where(Invitation.token == token))
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise ValidationError("Invalid invitation token")

    # Check expires_at > now()
    if invitation.expires_at < datetime.now(timezone.utc):
        raise ValidationError("Invitation expired")

    # Check accepted_at IS NULL
    if invitation.accepted_at is not None:
        raise ConflictError("Invitation already used")

    # Check invitation.email == user.email
    if invitation.email != user.email:
        raise ForbiddenError("Invitation email does not match user email")

    # Mark accepted_at = now()
    invitation.accepted_at = datetime.now(timezone.utc)
    db.add(invitation)
    await db.flush()

    # Check if workspace member already exists (edge case)
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == invitation.workspace_id,
            WorkspaceMember.user_id == user.id,
        )
    )
    existing_member = result.scalar_one_or_none()

    if existing_member:
        # Update existing member
        existing_member.accepted_at = datetime.now(timezone.utc)
        existing_member.role = invitation.role
        db.add(existing_member)
        await db.flush()
        await db.refresh(existing_member)
        return existing_member
    else:
        # Create new WorkspaceMember row
        workspace_member = WorkspaceMember(
            workspace_id=invitation.workspace_id,
            user_id=user.id,
            role=invitation.role,
            invited_by=invitation.invited_by,
            accepted_at=datetime.now(timezone.utc),
        )
        db.add(workspace_member)
        await db.flush()
        await db.refresh(workspace_member)
        return workspace_member


async def remove_member(
    db: AsyncSession,
    workspace: Workspace,
    target_user_id: str,
    requesting_member: WorkspaceMember,
) -> None:
    # Only owners and admins can remove members
    if requesting_member.role not in [WorkspaceRole.owner, WorkspaceRole.admin]:
        raise ForbiddenError("Insufficient permissions to remove members")

    # Get target member
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == target_user_id,
            WorkspaceMember.accepted_at.is_not(None),
        )
    )
    target_member = result.scalar_one_or_none()
    if not target_member:
        raise NotFoundError("Member not found in workspace")

    # Owner cannot be removed
    if target_member.role == WorkspaceRole.owner:
        raise ConflictError("Cannot remove workspace owner")

    # Cannot remove yourself if you are the owner (already checked above)
    # But also prevent self-removal for non-owners
    if str(target_member.user_id) == str(requesting_member.user_id):
        raise ConflictError("Cannot remove yourself from workspace")

    # Delete the WorkspaceMember row
    await db.delete(target_member)
    await db.flush()


async def update_member_role(
    db: AsyncSession,
    workspace: Workspace,
    target_user_id: str,
    data: UpdateMemberRoleRequest,
    requesting_member: WorkspaceMember,
) -> WorkspaceMember:
    # Only owners can change roles
    if requesting_member.role != WorkspaceRole.owner:
        raise ForbiddenError("Only workspace owner can change member roles")

    # Get target member
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == target_user_id,
            WorkspaceMember.accepted_at.is_not(None),
        )
    )
    target_member = result.scalar_one_or_none()
    if not target_member:
        raise NotFoundError("Member not found in workspace")

    # Cannot change the workspace owner's role
    if target_member.role == WorkspaceRole.owner:
        raise ConflictError("Cannot change workspace owner's role")

    # Update role
    target_member.role = data.role
    db.add(target_member)
    await db.flush()
    await db.refresh(target_member)
    return target_member
