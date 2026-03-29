from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, validator
import re
from app.enums import PhoneProvider, PhoneNumberType, PhoneNumberStatus

class PhoneNumberImportFromEL(BaseModel):
    """
    Import a number that already exists on the ElevenLabs account.
    """
    elevenlabs_number_id: str
    friendly_name: str | None = None

class SIPTrunkCreate(BaseModel):
    """Import a number via SIP trunk credentials."""
    number: str                 # E.164 format
    friendly_name: str | None = None
    sip_server: str
    sip_username: str
    sip_password: str           # will be encrypted before storage
    sip_port: int = 5060

    @validator("number")
    def validate_e164(cls, v):
        if not re.match(r"^\+[1-9]\d{1,14}$", v):
            raise ValueError("Phone number must be in E.164 format (e.g. +1234567890)")
        return v

class PhoneNumberUpdate(BaseModel):
    friendly_name: str | None = None
    display_name: str | None = None  # CNAM

class PhoneNumberResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    number: str
    friendly_name: str | None = None
    provider: PhoneProvider
    elevenlabs_number_id: str | None = None
    number_type: PhoneNumberType
    status: PhoneNumberStatus
    display_name: str | None = None
    cnam_registered: bool
    calls_made: int
    monthly_cost_cents: int
    # Derived — whether this number is currently assigned to an active campaign
    active_campaign_id: UUID | None = None
    active_campaign_name: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ElevenLabsAvailableNumber(BaseModel):
    """Shape of a number returned by GET /convai/phone-numbers on EL."""
    elevenlabs_number_id: str
    number: str
    label: str | None = None
    assigned_agent_id: str | None = None
    is_imported: bool = False   # True if already in our DB
