from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.user import User
from app.models.workspace_member import WorkspaceMember
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
)
from app.utils.security import create_access_token, create_refresh_token, decode_token
from app.core.security import get_password_hash, verify_password
from datetime import datetime, timezone
from jose import JWTError
from app.enums import UserStatus
from uuid import UUID


class ConflictError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=409, detail=detail)


class NotFoundError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=404, detail=detail)


class ForbiddenError(HTTPException):
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(status_code=403, detail=detail)


async def register(db: AsyncSession, data: RegisterRequest) -> User:
    # Check email is not already taken
    result = await db.execute(select(User).where(User.email == data.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise ConflictError("Email already registered")

    # Hash password
    hashed_password = get_password_hash(data.password)

    # Create User row
    user = User(
        email=data.email,
        full_name=data.full_name,
        password_hash=hashed_password,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def login(db: AsyncSession, data: LoginRequest) -> TokenResponse:
    # Fetch user by email
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")

    # Check user status
    if user.status == "deleted":
        raise ForbiddenError("User account has been deleted")

    # Verify password
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    # Update last sign in
    user.last_sign_in_at = datetime.now(timezone.utc)
    db.add(user)
    await db.flush()

    # Return tokens
    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    return TokenResponse(
        access_token=access_token, refresh_token=refresh_token, token_type="bearer"
    )


async def refresh(db: AsyncSession, data: RefreshRequest) -> TokenResponse:
    # Decode the refresh token
    try:
        payload = decode_token(data.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(
                status_code=401, detail="Could not validate credentials"
            )
        try:
            user_id = UUID(user_id_str)
        except ValueError:
            raise HTTPException(
                status_code=401, detail="Could not validate credentials"
            )
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    # Fetch the user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or user.status == UserStatus.deleted:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    # Return new access + refresh tokens
    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    return TokenResponse(
        access_token=access_token, refresh_token=refresh_token, token_type="bearer"
    )


async def get_current_user(db: AsyncSession, token: str) -> User:
    # Decode access token
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(
                status_code=401, detail="Could not validate credentials"
            )
        try:
            user_id = UUID(user_id_str)
        except ValueError:
            raise HTTPException(
                status_code=401, detail="Could not validate credentials"
            )
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    # Fetch user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or user.status in [UserStatus.suspended, UserStatus.deleted]:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    return user
