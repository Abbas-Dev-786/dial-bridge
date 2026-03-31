import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, Boolean, Index, SmallInteger, func, Enum as SAEnum, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB

from app.models import AppBase
from app.enums import ContactStatus

class Contact(AppBase):
    __tablename__ = "contacts"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str] = mapped_column(String, nullable=False, index=True) # E.164
    email: Mapped[str | None] = mapped_column(String)
    company: Mapped[str | None] = mapped_column(String)
    notes: Mapped[str | None] = mapped_column(String)
    
    custom_fields: Mapped[dict | None] = mapped_column(JSONB)
    
    status: Mapped[ContactStatus] = mapped_column(
        SAEnum(ContactStatus, name="contact_status"), default=ContactStatus.pending, nullable=False
    )

    retry_count: Mapped[int] = mapped_column(SmallInteger, default=0)
    last_called_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    opted_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    
    is_dnc: Mapped[bool] = mapped_column(Boolean, default=False)
    last_outcome: Mapped[str | None] = mapped_column(String)
    
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    campaign: Mapped["Campaign"] = relationship(back_populates="contacts")
    calls: Mapped[list["Call"]] = relationship(back_populates="contact")

    __table_args__ = (
        Index(
            "idx_contacts_search",
            "full_name",
            "phone",
            postgresql_using="gin",
            postgresql_ops={
                "full_name": "gin_trgm_ops",
                "phone": "gin_trgm_ops"
            }
        ),
        # Ensure phone is unique per campaign
        Index(
            "idx_contacts_campaign_phone_unique",
            "campaign_id",
            "phone",
            unique=True,
            postgresql_where=text("deleted_at IS NULL")
        )
    )
