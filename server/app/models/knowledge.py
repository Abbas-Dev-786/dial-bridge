import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum, Integer, BigInteger, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB

from app.models import AppBase, UUIDMixin
from app.database import Base
from app.enums import (
    DocType, 
    DocStatus, 
    KBSnapshotTrigger, 
    CampaignStatus
)

class KnowledgeDocument(AppBase):
    __tablename__ = "knowledge_documents"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    
    name: Mapped[str] = mapped_column(String, nullable=False)
    doc_type: Mapped[DocType] = mapped_column(
        SAEnum(DocType, name="doc_type"), nullable=False
    )
    status: Mapped[DocStatus] = mapped_column(
        SAEnum(DocStatus, name="doc_status"), default=DocStatus.pending
    )
    
    elevenlabs_kb_id: Mapped[str | None] = mapped_column(String)
    source_url: Mapped[str | None] = mapped_column(String)
    
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    page_count: Mapped[int | None] = mapped_column(Integer)
    chunk_count: Mapped[int | None] = mapped_column(Integer)
    
    chunk_size_tokens: Mapped[int] = mapped_column(Integer, default=512)
    overlap_tokens: Mapped[int] = mapped_column(Integer, default=50)
    embedding_model: Mapped[str] = mapped_column(String, default="text-embedding-3-small")
    
    error_message: Mapped[str | None] = mapped_column(String)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    campaign: Mapped["Campaign"] = relationship(back_populates="knowledge_documents")
    uploaded_by_user: Mapped["User"] = relationship()

class CampaignKBSnapshot(UUIDMixin, Base):
    __tablename__ = "campaign_kb_snapshots"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    triggered_by: Mapped[KBSnapshotTrigger] = mapped_column(
        SAEnum(KBSnapshotTrigger, name="kb_snapshot_trigger"), nullable=False
    )
    documents: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    elevenlabs_agent_id: Mapped[str | None] = mapped_column(String)
    campaign_status_at_snapshot: Mapped[CampaignStatus] = mapped_column(
        SAEnum(CampaignStatus, name="campaign_status"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    campaign: Mapped["Campaign"] = relationship(back_populates="kb_snapshots")
    # calls: Mapped[list["Call"]] = relationship(back_populates="kb_snapshot")
