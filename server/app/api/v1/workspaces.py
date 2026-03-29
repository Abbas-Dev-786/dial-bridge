from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.core.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceUpdate,
    WorkspaceResponse,
    MemberResponse,
    InviteMemberRequest,
    UpdateMemberRoleRequest,
)
from app.services.workspace_service import (
    create_workspace,
    get_workspace,
    update_workspace,
    list_user_workspaces,
    invite_member,
    accept_invitation,
    remove_member,
    update_member_role,
)
from app.dependencies import get_current_user, get_workspace_member, require_role
from app.enums import WorkspaceRole


router = APIRouter()


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace_endpoint(
    workspace_in: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new workspace and set the creator as owner.
    """
    workspace = await create_workspace(db, current_user, workspace_in)
    return workspace


@router.get("", response_model=list[WorkspaceResponse])
async def list_workspaces(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """
    List all workspaces the current user belongs to.
    """
    workspaces = await list_user_workspaces(db, current_user)
    return workspaces


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace_endpoint(
    workspace_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific workspace by ID.
    """
    workspace = await get_workspace(db, str(workspace_id))
    # Check if user is a member (get_workspace_member will raise ForbiddenError if not)
    await get_workspace_member(str(workspace_id), current_user, db)
    return workspace


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace_endpoint(
    workspace_id: UUID,
    workspace_in: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a workspace. Only owner can update.
    """
    workspace = await get_workspace(db, str(workspace_id))
    member = await get_workspace_member(str(workspace_id), current_user, db)
    # Only owner can update workspace
    if member.role != WorkspaceRole.owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner can update workspace",
        )
    updated_workspace = await update_workspace(db, workspace, workspace_in)
    return updated_workspace


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_endpoint(
    workspace_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a workspace (soft delete). Only owner can delete.
    """
    workspace = await get_workspace(db, str(workspace_id))
    member = await get_workspace_member(str(workspace_id), current_user, db)
    # Only owner can delete workspace
    if member.role != WorkspaceRole.owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner can delete workspace",
        )
    workspace.deleted_at = datetime.utcnow()
    db.add(workspace)
    await db.flush()
    return None


@router.get("/{workspace_id}/members", response_model=list[MemberResponse])
async def list_workspace_members(
    workspace_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all members of a workspace.
    """
    # Check if user is a member (get_workspace_member will raise ForbiddenError if not)
    await get_workspace_member(str(workspace_id), current_user, db)
    # TODO: Implement actual listing of members
    # For now, return empty list
    return []


@router.post("/{workspace_id}/members/invite", status_code=status.HTTP_201_CREATED)
async def invite_workspace_member(
    workspace_id: UUID,
    invite_in: InviteMemberRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Invite a member to the workspace. Only owners and admins can invite.
    """
    workspace = await get_workspace(db, str(workspace_id))
    member = await get_workspace_member(str(workspace_id), current_user, db)
    # Only owners and admins can invite
    if member.role not in [WorkspaceRole.owner, WorkspaceRole.admin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can invite members",
        )
    invitation = await invite_member(db, workspace, current_user, invite_in)
    return None  # 201 Created


@router.delete(
    "/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def remove_workspace_member(
    workspace_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove a member from the workspace. Only owners and admins can remove.
    """
    workspace = await get_workspace(db, str(workspace_id))
    requesting_member = await get_workspace_member(str(workspace_id), current_user, db)
    # Only owners and admins can remove members
    if requesting_member.role not in [WorkspaceRole.owner, WorkspaceRole.admin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can remove members",
        )
    await remove_member(db, workspace, str(user_id), requesting_member)
    return None  # 204 No Content


@router.patch("/{workspace_id}/members/{user_id}", response_model=MemberResponse)
async def update_workspace_member_role(
    workspace_id: UUID,
    user_id: UUID,
    role_in: UpdateMemberRoleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a member's role. Only owner can change roles.
    """
    workspace = await get_workspace(db, str(workspace_id))
    requesting_member = await get_workspace_member(str(workspace_id), current_user, db)
    # Only owner can change roles
    if requesting_member.role != WorkspaceRole.owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner can change member roles",
        )
    updated_member = await update_member_role(
        db, workspace, str(user_id), role_in, requesting_member
    )
    return updated_member


@router.post("/invitations/accept/{token}", response_model=MemberResponse)
async def accept_invitation_endpoint(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Accept an invitation to join a workspace.
    """
    member = await accept_invitation(db, token, current_user)
    return member
