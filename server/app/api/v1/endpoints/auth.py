from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core import security
from app.core.config import settings
from app.crud import user as crud_user
from app.schemas.user import UserCreate, User, ForgotPassword, ResetPassword
from app.schemas.auth import Token
from app.core.database import get_db
import secrets

router = APIRouter()


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user.
    """
    user = crud_user.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    user = crud_user.create_user(db, user_in)
    return user


@router.post("/login", response_model=Token)
def login(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    OAuth2 compatible token login, get an access and refresh token.
    """
    user = crud_user.authenticate_user(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not crud_user.is_active(user):
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)

    access_token = security.create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    refresh_token = security.create_refresh_token(
        subject=user.id, expires_delta=refresh_token_expires
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh-token", response_model=Token)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """
    Get a new access token using a refresh token.
    """
    try:
        payload = security.decode_token(refresh_token)
        if payload.token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        user_id = payload.sub
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
    except (security.JWTError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    user = crud_user.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    elif not crud_user.is_active(user):
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)

    access_token = security.create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    new_refresh_token = security.create_refresh_token(
        subject=user.id, expires_delta=refresh_token_expires
    )

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(forgot_password: ForgotPassword, db: Session = Depends(get_db)):
    """
    Handle forgot password request.
    In a real application, you would send an email with a reset token.
    For this example, we'll just generate a token and return it (for demonstration only).
    """
    user = crud_user.get_user_by_email(db, email=forgot_password.email)
    if not user:
        # For security, we don't reveal if the email exists or not
        return {"message": "If the email exists, a reset link has been sent."}

    # Generate a reset token (in practice, you would store this in the DB and send via email)
    reset_token = secrets.token_urlsafe(32)
    # In a real app, you would save the token hash in the user record and set an expiry
    # For now, we just return it (NOT FOR PRODUCTION)
    return {
        "message": "If the email exists, a reset link has been sent.",
        "reset_token": reset_token,  # Remove this in production!
    }


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(reset_password: ResetPassword, db: Session = Depends(get_db)):
    """
    Handle password reset.
    In a real application, you would validate the token from the email.
    For this example, we'll just decode the token and update the password.
    """
    try:
        payload = security.decode_token(reset_password.token)
        if (
            payload.token_type != "refresh"
        ):  # We are using the same token type for simplicity, but you might want a separate reset token type
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token type",
            )
        user_id = payload.sub
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not validate credentials",
            )
    except (security.JWTError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token",
        )

    user = crud_user.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Update password
    hashed_password = security.get_password_hash(reset_password.new_password)
    user.hashed_password = hashed_password
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Password has been reset successfully"}
