from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from app.enums import ContactStatus

class ContactCreate(BaseModel):
    full_name: str
    phone: str
    email: EmailStr | None = None
    company: str | None = None
    notes: str | None = None
    custom_fields: dict | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Must start with + and contain only digits after
        import re
        if not re.match(r"^\+[1-9]\d{6,14}$", v):
            raise ValueError("Phone must be in E.164 format (e.g. +15551234567)")
        return v

class ContactUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    company: str | None = None
    notes: str | None = None
    custom_fields: dict | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if v is None:
            return v
        import re
        if not re.match(r"^\+[1-9]\d{6,14}$", v):
            raise ValueError("Phone must be in E.164 format (e.g. +15551234567)")
        return v

class ContactResponse(BaseModel):
    id: UUID
    campaign_id: UUID
    full_name: str
    phone: str
    email: str | None
    company: str | None
    notes: str | None
    custom_fields: dict | None
    status: ContactStatus
    retry_count: int
    last_called_at: datetime | None
    next_retry_at: datetime | None
    opted_out_at: datetime | None
    is_dnc: bool
    last_outcome: str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ContactListResponse(BaseModel):
    items: list[ContactResponse]
    total: int
    page: int
    page_size: int
    has_next: bool

class CSVImportResult(BaseModel):
    total_rows: int
    imported: int
    skipped_invalid: int
    skipped_duplicate: int
    errors: list[dict]  # [{ "row": int, "phone": str, "reason": str }]

class ContactStatusUpdate(BaseModel):
    is_dnc: bool | None = None
    status: ContactStatus | None = None
