from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.enums import WorkspaceRole
from app.schemas.user import UserResponse

class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    slug: str = Field(..., min_length=2, max_length=40, pattern=r"^[a-z0-9-]+$")
    timezone: str = "UTC"

class WorkspaceUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=80)
    timezone: str | None = None
    logo_url: str | None = None

class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    logo_url: str | None
    timezone: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class MemberResponse(BaseModel):
    id: UUID
    user: UserResponse
    role: WorkspaceRole
    accepted_at: datetime | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: WorkspaceRole = WorkspaceRole.viewer

class UpdateMemberRoleRequest(BaseModel):
    role: WorkspaceRole
