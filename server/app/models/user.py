from datetime import datetime
from sqlalchemy import String, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models import AppBase
from app.enums import UserStatus

class User(AppBase):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String)
    password_hash: Mapped[str | None] = mapped_column(String)
    status: Mapped[UserStatus] = mapped_column(
        SAEnum(UserStatus, name="user_status"), default=UserStatus.active
    )
    last_sign_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Password Reset
    reset_password_token: Mapped[str | None] = mapped_column(String, index=True)
    reset_password_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # relationships
    workspace_memberships: Mapped[list["WorkspaceMember"]] = relationship(
        back_populates="user", 
        cascade="all, delete-orphan",
        foreign_keys="WorkspaceMember.user_id"
    )
    oauth_accounts: Mapped[list["OAuthAccount"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
