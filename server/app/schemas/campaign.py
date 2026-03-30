from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field
from app.enums import CampaignStatus, KBSyncStatus, RetryOnOutcome

class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    goal_description: str | None = None
    agent_id: UUID | None = None
    phone_number_id: UUID | None = None
    timezone: str = "US/Eastern"
    schedule_days: list[str] = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    schedule_start_time: str = "09:00"  # HH:MM
    schedule_end_time: str = "17:00"
    start_date: date | None = None
    end_date: date | None = None
    max_concurrency: int = 5
    max_retries: int = 3
    retry_delay_minutes: int = 30
    retry_on_outcomes: list[RetryOnOutcome] = [
        RetryOnOutcome.no_answer,
        RetryOnOutcome.busy,
        RetryOnOutcome.voicemail,
    ]
    dnc_check_enabled: bool = True
    record_calls: bool = True
    tcpa_mode: bool = True
    voicemail_detection: bool = True
    leave_voicemail: bool = False
    caller_id_display_name: str | None = None

class CampaignUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=80)
    goal_description: str | None = None
    timezone: str | None = None
    schedule_days: list[str] | None = None
    schedule_start_time: str | None = None
    schedule_end_time: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    max_concurrency: int | None = None
    max_retries: int | None = None
    retry_delay_minutes: int | None = None
    retry_on_outcomes: list[RetryOnOutcome] | None = None
    dnc_check_enabled: bool | None = None
    record_calls: bool | None = None
    tcpa_mode: bool | None = None
    voicemail_detection: bool | None = None
    leave_voicemail: bool | None = None
    caller_id_display_name: str | None = None

class CampaignAssignAgent(BaseModel):
    agent_id: UUID

class CampaignAssignPhoneNumber(BaseModel):
    phone_number_id: UUID

class CampaignStatusTransition(BaseModel):
    status: CampaignStatus
    # Only valid values to set via API: scheduled, live, paused, completed, archived
    # draft → cannot be set via API (campaigns start as draft)

class CampaignResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    goal_description: str | None
    status: CampaignStatus
    agent_id: UUID | None
    agent_name: str | None = None        # denormalized for UI
    phone_number_id: UUID | None
    phone_number: str | None = None      # denormalized for UI
    kb_sync_status: KBSyncStatus
    kb_last_synced_at: datetime | None
    timezone: str
    schedule_days: list[str]
    schedule_start_time: str
    schedule_end_time: str
    max_concurrency: int
    max_retries: int
    retry_delay_minutes: int
    retry_on_outcomes: list[RetryOnOutcome]
    dnc_check_enabled: bool
    record_calls: bool
    tcpa_mode: bool
    voicemail_detection: bool
    leave_voicemail: bool
    contacts_total: int
    contacts_called: int
    contacts_remaining: int
    calls_successful: int
    calls_failed: int
    total_spend_cents: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CampaignListItem(BaseModel):
    id: UUID
    name: str
    status: CampaignStatus
    agent_name: str | None = None
    contacts_total: int
    contacts_called: int
    calls_successful: int
    total_spend_cents: int
    kb_sync_status: KBSyncStatus
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
