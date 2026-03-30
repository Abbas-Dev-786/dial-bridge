import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, SmallInteger, Boolean, UniqueConstraint, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models import AppBase
from app.enums import PhoneProvider, PhoneNumberType, PhoneNumberStatus

class PhoneNumber(AppBase):
    __tablename__ = "phone_numbers"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    number: Mapped[str] = mapped_column(String, nullable=False)
    friendly_name: Mapped[str | None] = mapped_column(String)
    provider: Mapped[PhoneProvider] = mapped_column(
        SAEnum(PhoneProvider, name="phone_provider"), nullable=False
    )
    
    elevenlabs_number_id: Mapped[str | None] = mapped_column(String)
    provider_sid: Mapped[str | None] = mapped_column(String)
    
    number_type: Mapped[PhoneNumberType] = mapped_column(
        SAEnum(PhoneNumberType, name="phone_number_type"), default=PhoneNumberType.local
    )
    status: Mapped[PhoneNumberStatus] = mapped_column(
        SAEnum(PhoneNumberStatus, name="phone_number_status"), default=PhoneNumberStatus.active
    )
    
    sip_server: Mapped[str | None] = mapped_column(String)
    sip_username: Mapped[str | None] = mapped_column(String)
    sip_password_enc: Mapped[str | None] = mapped_column(String)
    sip_port: Mapped[int] = mapped_column(SmallInteger, default=5060)
    
    display_name: Mapped[str | None] = mapped_column(String)
    cnam_registered: Mapped[bool] = mapped_column(Boolean, default=False)
    
    calls_made: Mapped[int] = mapped_column(Integer, default=0)
    monthly_cost_cents: Mapped[int] = mapped_column(Integer, default=0)
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    workspace: Mapped["Workspace"] = relationship(back_populates="phone_numbers")
    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="phone_number")
    # campaigns: Mapped[list["Campaign"]] = relationship(back_populates="phone_number")

    __table_args__ = (
        UniqueConstraint("workspace_id", "number", name="uq_workspace_phone_number"),
    )
