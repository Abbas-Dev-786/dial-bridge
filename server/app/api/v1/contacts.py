import uuid
import io
import csv
from fastapi import APIRouter, Depends, UploadFile, File, Form, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db, get_current_user, get_workspace_member, require_role
from app.models.user import User
from app.models.workspace import WorkspaceMember, Workspace
from app.enums import WorkspaceRole, ContactStatus
from app.schemas.contact import (
    ContactCreate, 
    ContactUpdate, 
    ContactResponse, 
    ContactListResponse, 
    CSVImportResult
)
from app.services import contact_service, campaign_service

router = APIRouter()

@router.get("/{workspace_id}/campaigns/{campaign_id}/contacts", response_model=ContactListResponse)
async def list_contacts(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = None,
    status_filter: list[ContactStatus] | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """List contacts for a campaign with search and pagination."""
    return await contact_service.list_contacts(db, campaign_id, page, page_size, search, status_filter)

@router.post("/{workspace_id}/campaigns/{campaign_id}/contacts", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    data: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Add a single contact to a campaign."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    return await contact_service.create_contact(db, campaign, current_user.id, data)

@router.post("/{workspace_id}/campaigns/{campaign_id}/contacts/import-csv", response_model=CSVImportResult, status_code=status.HTTP_201_CREATED)
async def import_contacts_csv(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """
    Bulk import contacts from a CSV file.
    Max 50,000 rows. Max 10MB file size.
    """
    if not file.filename.endswith(".csv"):
        from app.exceptions import ValidationError
        raise ValidationError("Only CSV files are supported.")
        
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    csv_bytes = await file.read()
    return await contact_service.bulk_import_csv(db, campaign, csv_bytes, current_user.id)

@router.get("/{workspace_id}/campaigns/{campaign_id}/contacts/export")
async def export_contacts(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """Export all contacts for a campaign as a CSV file."""
    # Since we need to stream, we use a generator
    async def generate_csv():
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            "full_name", "phone", "email", "company", "status", 
            "last_outcome", "last_called_at", "retry_count", "is_dnc"
        ])
        writer.writeheader()
        yield output.getvalue()
        output.truncate(0)
        output.seek(0)
        
        # Paginate the DB query to avoid huge memory usage
        page = 1
        page_size = 1000
        while True:
             response = await contact_service.list_contacts(db, campaign_id, page=page, page_size=page_size)
             if not response.items:
                 break
             
             for contact in response.items:
                 writer.writerow({
                     "full_name": contact.full_name,
                     "phone": contact.phone,
                     "email": contact.email,
                     "company": contact.company,
                     "status": contact.status.value,
                     "last_outcome": contact.last_outcome,
                     "last_called_at": contact.last_called_at.isoformat() if contact.last_called_at else None,
                     "retry_count": contact.retry_count,
                     "is_dnc": contact.is_dnc
                 })
                 yield output.getvalue()
                 output.truncate(0)
                 output.seek(0)
             
             if not response.has_next:
                 break
             page += 1
             
    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=contacts_{campaign_id}.csv"}
    )

@router.get("/{workspace_id}/campaigns/{campaign_id}/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """Get a specific contact."""
    return await contact_service.get_contact(db, campaign_id, contact_id)

@router.patch("/{workspace_id}/campaigns/{campaign_id}/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    contact_id: uuid.UUID,
    data: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Update a contact's details."""
    contact = await contact_service.get_contact(db, campaign_id, contact_id)
    return await contact_service.update_contact(db, contact, data)

@router.delete("/{workspace_id}/campaigns/{campaign_id}/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Remove a contact from the campaign."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    contact = await contact_service.get_contact(db, campaign_id, contact_id)
    await contact_service.delete_contact(db, campaign, contact)

@router.post("/{workspace_id}/campaigns/{campaign_id}/contacts/{contact_id}/mark-dnc", response_model=ContactResponse)
async def mark_contact_dnc(
    workspace_id: uuid.UUID,
    campaign_id: uuid.UUID,
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.editor, WorkspaceRole.admin, WorkspaceRole.owner)),
):
    """Manually mark a contact as Do Not Call."""
    campaign = await campaign_service.get_campaign(db, workspace_id, campaign_id)
    contact = await contact_service.get_contact(db, campaign_id, contact_id)
    return await contact_service.mark_dnc(db, campaign, contact)
