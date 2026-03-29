from uuid import UUID
from fastapi import APIRouter, Depends, status, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import AsyncSessionLocal
from app.dependencies import get_db, get_current_user, get_workspace_member, require_role
from app.models.workspace import WorkspaceMember
from app.enums import WorkspaceRole, PhoneNumberStatus
from app.schemas.phone_number import (
    PhoneNumberResponse, PhoneNumberImportFromEL, SIPTrunkCreate,
    PhoneNumberUpdate, ElevenLabsAvailableNumber
)
from app.services import phone_number_service

router = APIRouter()

@router.get("/{workspace_id}/phone-numbers", response_model=List[PhoneNumberResponse])
async def list_phone_numbers(
    workspace_id: UUID,
    status: Optional[PhoneNumberStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """List all phone numbers in the workspace."""
    return await phone_number_service.list_phone_numbers(db, workspace_id, status)

@router.get("/{workspace_id}/phone-numbers/elevenlabs-available", response_model=List[ElevenLabsAvailableNumber])
async def list_available_elevenlabs_numbers(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """List phone numbers available on the ElevenLabs account for import."""
    return await phone_number_service.list_elevenlabs_available_numbers(db, member.workspace)

@router.post("/{workspace_id}/phone-numbers/import-elevenlabs", response_model=PhoneNumberResponse, status_code=status.HTTP_201_CREATED)
async def import_from_elevenlabs(
    workspace_id: UUID,
    data: PhoneNumberImportFromEL,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.editor)),
):
    """Import a phone number from the ElevenLabs account into the workspace."""
    return await phone_number_service.import_from_elevenlabs(db, member.workspace, data)

@router.post("/{workspace_id}/phone-numbers/import-sip", response_model=PhoneNumberResponse, status_code=status.HTTP_201_CREATED)
async def import_sip_trunk(
    workspace_id: UUID,
    data: SIPTrunkCreate,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.editor)),
):
    """Import a phone number via SIP trunk credentials."""
    return await phone_number_service.import_sip_trunk(db, member.workspace, data)

@router.get("/{workspace_id}/phone-numbers/{phone_number_id}", response_model=PhoneNumberResponse)
async def get_phone_number(
    workspace_id: UUID,
    phone_number_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """Get details for a specific phone number."""
    return await phone_number_service.get_phone_number(db, workspace_id, phone_number_id)

@router.patch("/{workspace_id}/phone-numbers/{phone_number_id}", response_model=PhoneNumberResponse)
async def update_phone_number(
    workspace_id: UUID,
    phone_number_id: UUID,
    data: PhoneNumberUpdate,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.editor)),
):
    """Update phone number metadata."""
    phone_number = await phone_number_service.get_phone_number(db, workspace_id, phone_number_id)
    return await phone_number_service.update_phone_number(db, phone_number, data)

@router.delete("/{workspace_id}/phone-numbers/{phone_number_id}", status_code=status.HTTP_204_NO_CONTENT)
async def release_phone_number(
    workspace_id: UUID,
    phone_number_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.editor)),
):
    """Mark a phone number as released."""
    phone_number = await phone_number_service.get_phone_number(db, workspace_id, phone_number_id)
    await phone_number_service.release_phone_number(db, phone_number)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
