from pydantic import BaseModel, EmailStr, Field
from pydantic.config import ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.enums import UserStatus


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
    token_type: Optional[str] = None  # "access" or "refresh"


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    status: UserStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
