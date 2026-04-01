import secrets
from datetime import datetime, timedelta
from uuid import UUID
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, Invitation
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, InviteMemberRequest, UpdateMemberRoleRequest
from app.enums import WorkspaceRole
from app.exceptions import ConflictError, NotFoundError, ForbiddenError, ValidationError
from app.utils.audit import log_action

async def create_workspace(db: AsyncSession, user: User, data: WorkspaceCreate) -> Workspace:
    # Check slug uniqueness
    result = await db.execute(select(Workspace).where(Workspace.slug == data.slug))
    if result.scalar_one_or_none():
        raise ConflictError("Slug already taken")
    
    workspace = Workspace(
        name=data.name,
        slug=data.slug,
        timezone=data.timezone
    )
    db.add(workspace)
    await db.flush()
    
    # Create WorkspaceMember row as owner
    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        role=WorkspaceRole.owner,
        accepted_at=datetime.utcnow()
    )
    db.add(member)
    
    await log_action(
        db, workspace.id, "workspace.created", "workspace", workspace.id, actor_user_id=user.id
    )
    
    return workspace

async def get_workspace(db: AsyncSession, workspace_id: UUID) -> Workspace:
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id, Workspace.deleted_at.is_(None)))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise NotFoundError("Workspace")
    return workspace

async def update_workspace(db: AsyncSession, workspace: Workspace, data: WorkspaceUpdate) -> Workspace:
    if data.name is not None:
        workspace.name = data.name
    if data.timezone is not None:
        workspace.timezone = data.timezone
    if data.logo_url is not None:
        workspace.logo_url = data.logo_url
    return workspace

async def list_user_workspaces(db: AsyncSession, user: User) -> list[Workspace]:
    result = await db.execute(
        select(Workspace)
        .join(WorkspaceMember)
        .where(
            WorkspaceMember.user_id == user.id,
            WorkspaceMember.accepted_at.is_not(None),
            Workspace.deleted_at.is_(None)
        )
    )
    return list(result.scalars().all())

async def invite_member(db: AsyncSession, workspace: Workspace, inviter: User, data: InviteMemberRequest) -> Invitation:
    # Check if already a member
    result = await db.execute(
        select(WorkspaceMember).join(User).where(
            WorkspaceMember.workspace_id == workspace.id,
            User.email == data.email,
            WorkspaceMember.accepted_at.is_not(None)
        )
    )
    if result.scalar_one_or_none():
        raise ConflictError("User is already a member of this workspace")
    
    # Check for pending invitation
    result = await db.execute(
        select(Invitation).where(
            Invitation.workspace_id == workspace.id,
            Invitation.email == data.email,
            Invitation.accepted_at.is_(None),
            Invitation.expires_at > datetime.utcnow()
        )
    )
    if result.scalar_one_or_none():
        raise ConflictError("A pending invitation already exists for this email")
    
    invitation = Invitation(
        workspace_id=workspace.id,
        email=data.email,
        role=data.role,
        token=secrets.token_urlsafe(32),
        invited_by=inviter.id,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invitation)
    
    await log_action(
        db, workspace.id, "workspace.member_invited", "invitation", invitation.id, actor_user_id=inviter.id,
        diff={"email": data.email, "role": data.role}
    )
    
    # Stub for sending email
    print(f"Invitation token for {data.email}: {invitation.token}")
    return invitation

async def accept_invitation(db: AsyncSession, token: str, user: User) -> WorkspaceMember:
    result = await db.execute(select(Invitation).where(Invitation.token == token))
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise NotFoundError("Invitation")
    
    if invitation.expires_at < datetime.utcnow():
        raise ValidationError("Invitation expired")
    
    if invitation.accepted_at is not None:
        raise ConflictError("Invitation already used")
    
    if invitation.email != user.email:
        raise ForbiddenError("This invitation was sent to a different email address")
    
    invitation.accepted_at = datetime.utcnow()
    
    # Check if membership already exists (e.g. from a previous invitation or being added manually)
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == invitation.workspace_id,
            WorkspaceMember.user_id == user.id
        )
    )
    member = result.scalar_one_or_none()
    
    if member:
        member.role = invitation.role
        member.accepted_at = datetime.utcnow()
    else:
        member = WorkspaceMember(
            workspace_id=invitation.workspace_id,
            user_id=user.id,
            role=invitation.role,
            accepted_at=datetime.utcnow()
        )
        db.add(member)
    
    return member

async def remove_member(db: AsyncSession, workspace: Workspace, target_user_id: UUID, requesting_member: WorkspaceMember):
    if requesting_member.role not in [WorkspaceRole.owner, WorkspaceRole.admin]:
        raise ForbiddenError("Only owners and admins can remove members")
    
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == target_user_id
        )
    )
    target_member = result.scalar_one_or_none()
    if not target_member:
        raise NotFoundError("Member")
    
    if target_member.role == WorkspaceRole.owner:
        raise ForbiddenError("The workspace owner cannot be removed")
        
    await db.delete(target_member)
    
    await log_action(
        db, workspace.id, "workspace.member_removed", "user", target_user_id, actor_user_id=requesting_member.user_id
    )

async def update_member_role(db: AsyncSession, workspace: Workspace, target_user_id: UUID, data: UpdateMemberRoleRequest, requesting_member: WorkspaceMember) -> WorkspaceMember:
    if requesting_member.role != WorkspaceRole.owner:
        raise ForbiddenError("Only owners can change member roles")
    
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == target_user_id
        )
    )
    target_member = result.scalar_one_or_none()
    if not target_member:
        raise NotFoundError("Member")
        
    if target_member.role == WorkspaceRole.owner:
        raise ForbiddenError("Cannot change the workspace owner's role")
        
    target_member.role = data.role
    return target_member
