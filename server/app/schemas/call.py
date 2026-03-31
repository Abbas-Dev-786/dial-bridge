from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.enums import CallDirection, CallStatus, TranscriptSpeaker, Sentiment

class CallTranscriptResponse(BaseModel):
    id: UUID
    sequence: int
    speaker: TranscriptSpeaker
    text: str
    timestamp_secs: float | None
    latency_ms: int | None
    tool_name: str | None
    model_config = ConfigDict(from_attributes=True)

class CallEvaluationResponse(BaseModel):
    id: UUID
    criteria: str
    passed: bool
    score: float | None
    rationale: str | None
    evaluated_by: str
    model_config = ConfigDict(from_attributes=True)

class CallCollectedDataResponse(BaseModel):
    field_key: str
    field_value: str | None
    confidence: float | None
    model_config = ConfigDict(from_attributes=True)

class CallListItem(BaseModel):
    id: UUID
    contact_name: str | None = None
    contact_phone: str | None = None
    agent_name: str | None = None
    campaign_name: str | None = None
    direction: CallDirection
    status: CallStatus
    duration_seconds: int | None
    outcome: str | None
    sentiment: Sentiment | None
    total_cost_cents: int = 0
    started_at: datetime | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CallDetailResponse(CallListItem):
    from_number: str
    to_number: str
    recording_url: str | None
    summary: str | None
    is_voicemail: bool
    was_transferred: bool
    transfer_destination: str | None
    cost_telephony_cents: int
    cost_llm_cents: int
    cost_tts_cents: int
    cost_stt_cents: int
    latency_p50_ms: int | None
    latency_p95_ms: int | None
    latency_p99_ms: int | None
    retry_number: int
    error_message: str | None
    transcripts: list[CallTranscriptResponse]
    evaluations: list[CallEvaluationResponse]
    collected_data: list[CallCollectedDataResponse]
    kb_snapshot_id: UUID | None

class CallListResponse(BaseModel):
    items: list[CallListItem]
    total: int
    page: int
    page_size: int
    has_next: bool
