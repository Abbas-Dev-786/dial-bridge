from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError

from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, GoogleLoginRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.exceptions import ConflictError, NotFoundError, ForbiddenError
from app.enums import UserStatus
from app.config import settings
from app.services.mail_service import mail_service
from google.oauth2 import id_token
from google.auth.transport import requests
import secrets
from datetime import timedelta

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

async def login_with_google(db: AsyncSession, data: GoogleLoginRequest) -> TokenResponse:
    """Verifies Google ID token and returns application tokens."""
    try:
        # Verify the id_token with Google
        idinfo = id_token.verify_oauth2_token(
            data.id_token, 
            requests.Request(), 
            settings.google_oauth_client_id
        )
        
        # ID token is valid, get properties
        email = idinfo["email"]
        full_name = idinfo.get("name", email.split("@")[0])
        avatar_url = idinfo.get("picture")
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )

    # Find or create user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        # Create new user
        user = User(
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
            status=UserStatus.active,
            email_verified_at=datetime.utcnow()
        )
        db.add(user)
        await db.flush()
    else:
        # Check status
        if user.status == UserStatus.deleted or user.status == UserStatus.suspended:
            raise ForbiddenError("Account is suspended or deleted")
        
        # Update details if changed
        user.full_name = full_name
        user.avatar_url = avatar_url
        user.last_sign_in_at = datetime.utcnow()
        await db.flush()

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )

async def forgot_password(db: AsyncSession, data: ForgotPasswordRequest):
    """Generates a reset token and sends an email."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    # We return success even if user doesn't exist for security reasons (email enumeration)
    if not user or user.status != UserStatus.active:
        return {"message": "If this email is registered, you will receive a reset link shortly."}
    
    # Generate token
    token = secrets.token_urlsafe(32)
    user.reset_password_token = token
    user.reset_password_expires_at = datetime.utcnow() + timedelta(hours=1)
    
    await db.flush()
    
    # Send email
    await mail_service.send_password_reset_email(user.email, token)
    
    return {"message": "If this email is registered, you will receive a reset link shortly."}

async def reset_password(db: AsyncSession, data: ResetPasswordRequest):
    """Verifies token and updates password."""
    result = await db.execute(
        select(User).where(
            User.reset_password_token == data.token,
            User.reset_password_expires_at > datetime.utcnow()
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update password and clear token
    user.password_hash = hash_password(data.new_password)
    user.reset_password_token = None
    user.reset_password_expires_at = None
    
    await db.flush()
    
    return {"message": "Password updated successfully"}
