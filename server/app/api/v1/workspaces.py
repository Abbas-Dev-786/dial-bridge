from uuid import UUID
from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user, get_workspace_member, require_role
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse, MemberResponse, InviteMemberRequest, UpdateMemberRoleRequest
from app.services import workspace_service
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.enums import WorkspaceRole

router = APIRouter()

@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(data: WorkspaceCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await workspace_service.create_workspace(db, current_user, data)

@router.get("", response_model=list[WorkspaceResponse])
async def list_workspaces(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await workspace_service.list_user_workspaces(db, current_user)

@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(workspace_id: UUID, member: WorkspaceMember = Depends(get_workspace_member), db: AsyncSession = Depends(get_db)):
    return await workspace_service.get_workspace(db, workspace_id)

@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(workspace_id: UUID, data: WorkspaceUpdate, member: WorkspaceMember = Depends(get_workspace_member), db: AsyncSession = Depends(get_db)):
    if member.role != WorkspaceRole.owner:
        from app.exceptions import ForbiddenError
        raise ForbiddenError("Only owners can update workspace settings")
    workspace = await workspace_service.get_workspace(db, workspace_id)
    return await workspace_service.update_workspace(db, workspace, data)

@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(workspace_id: UUID, member: WorkspaceMember = Depends(get_workspace_member), db: AsyncSession = Depends(get_db)):
    if member.role != WorkspaceRole.owner:
        from app.exceptions import ForbiddenError
        raise ForbiddenError("Only owners can delete workspaces")
    workspace = await workspace_service.get_workspace(db, workspace_id)
    from datetime import datetime
    workspace.deleted_at = datetime.utcnow()
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# Member management
@router.get("/{workspace_id}/members", response_model=list[MemberResponse])
async def list_members(workspace_id: UUID, member: WorkspaceMember = Depends(get_workspace_member), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models.workspace import WorkspaceMember as WMember
    result = await db.execute(select(WMember).where(WMember.workspace_id == workspace_id))
    return list(result.scalars().all())

@router.post("/{workspace_id}/members/invite", status_code=status.HTTP_201_CREATED)
async def invite_member(workspace_id: UUID, data: InviteMemberRequest, current_user: User = Depends(get_current_user), member: WorkspaceMember = Depends(require_role(WorkspaceRole.admin, WorkspaceRole.owner)), db: AsyncSession = Depends(get_db)):
    workspace = await workspace_service.get_workspace(db, workspace_id)
    await workspace_service.invite_member(db, workspace, current_user, data)
    return {"message": "Invitation sent"}

@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(workspace_id: UUID, user_id: UUID, requesting_member: WorkspaceMember = Depends(get_workspace_member), db: AsyncSession = Depends(get_db)):
    workspace = await workspace_service.get_workspace(db, workspace_id)
    await workspace_service.remove_member(db, workspace, user_id, requesting_member)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.patch("/{workspace_id}/members/{user_id}", response_model=MemberResponse)
async def update_member_role(workspace_id: UUID, user_id: UUID, data: UpdateMemberRoleRequest, requesting_member: WorkspaceMember = Depends(get_workspace_member), db: AsyncSession = Depends(get_db)):
    workspace = await workspace_service.get_workspace(db, workspace_id)
    return await workspace_service.update_member_role(db, workspace, user_id, data, requesting_member)

# Invitation acceptance
@router.post("/invitations/accept/{token}", response_model=MemberResponse)
async def accept_invitation(token: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await workspace_service.accept_invitation(db, token, current_user)

@router.get("/{workspace_id}/settings/elevenlabs-status")
async def get_elevenlabs_status(workspace_id: UUID, member: WorkspaceMember = Depends(get_workspace_member)):
    """
    Returns platform-level ElevenLabs status. 
    Since keys are now platform-wide, this just confirms the platform key is active.
    """
    from app.config import settings
    return {
        "is_configured": bool(settings.elevenlabs_api_key),
        "api_base_url": settings.elevenlabs_base_url,
        "uses_platform_account": True,
        "webhook_secret_configured": bool(settings.elevenlabs_webhook_secret),
    }
