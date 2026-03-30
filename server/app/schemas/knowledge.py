from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, HttpUrl
from app.enums import DocType, DocStatus, KBSyncStatus, KBSnapshotTrigger, CampaignStatus

class KBDocumentAddURL(BaseModel):
    name: str
    source_url: HttpUrl
    doc_type: DocType = DocType.url_scrape

class KBDocumentResponse(BaseModel):
    id: UUID
    campaign_id: UUID
    name: str
    doc_type: DocType
    status: DocStatus
    elevenlabs_kb_id: str | None
    source_url: str | None
    file_size_bytes: int | None
    page_count: int | None
    chunk_count: int | None
    error_message: str | None
    last_synced_at: datetime | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class KBSyncStatusResponse(BaseModel):
    campaign_id: UUID
    kb_sync_status: KBSyncStatus
    kb_last_synced_at: datetime | None
    pending_docs: int      # docs with status != 'ready'
    total_docs: int

class KBSnapshotResponse(BaseModel):
    id: UUID
    campaign_id: UUID
    triggered_by: KBSnapshotTrigger
    documents: list[dict]
    elevenlabs_agent_id: str | None
    campaign_status_at_snapshot: CampaignStatus
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
