from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse
from app.services.auth_service import register, login, refresh
from app.dependencies import get_current_user


router = APIRouter()


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def register_user(user_in: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Register a new user.
    """
    user = await register(db, user_in)
    return user


@router.post("/login", response_model=TokenResponse)
async def login_user(login_in: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Login user and return access and refresh tokens.
    """
    return await login(db, login_in)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_in: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """
    Refresh access token using refresh token.
    """
    return await refresh(db, refresh_in)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user information.
    """
    return current_user
