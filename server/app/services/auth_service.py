from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError

from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.exceptions import ConflictError, NotFoundError, ForbiddenError
from app.enums import UserStatus

async def register(db: AsyncSession, data: RegisterRequest) -> User:
    # Check if email is already taken
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise ConflictError("Email already registered")
    
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        status=UserStatus.active
    )
    db.add(user)
    await db.flush()
    return user

async def login(db: AsyncSession, data: LoginRequest) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise NotFoundError("User")
    
    if user.status == UserStatus.deleted or user.status == UserStatus.suspended:
        raise ForbiddenError("Account is suspended or deleted")
    
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user.last_sign_in_at = datetime.utcnow()
    
    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )

async def refresh(db: AsyncSession, data: RefreshRequest) -> TokenResponse:
    try:
        payload = decode_token(data.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or user.status == UserStatus.deleted:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or deleted")
    
    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )

async def get_current_user(db: AsyncSession, token: str) -> User:
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    if user.status == UserStatus.suspended or user.status == UserStatus.deleted:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is suspended or deleted")
    
    return user
