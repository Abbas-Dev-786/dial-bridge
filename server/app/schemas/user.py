from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.enums import UserStatus

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    avatar_url: str | None
    status: UserStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TokenPayload(BaseModel):
    sub: str | None = None
    exp: datetime | None = None
    token_type: str | None = None
