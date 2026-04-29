from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.enums import AgentStatus, CampaignStatus, LLMProvider, InterruptionSensitivity, ToolType, HttpMethod
from app.utils.prompt_validation import validate_first_message_text, validate_system_prompt_text

# Voice config
class VoiceConfigCreate(BaseModel):
    voice_id: str
    voice_name: str | None = None
    stability: float = 50.0        # 0-100
    similarity_boost: float = 75.0
    style: float = 0.0
    speed: float = 100.0           # 70-120

class VoiceConfigResponse(VoiceConfigCreate):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

# Conversation config
class ConversationConfigCreate(BaseModel):
    language: str = "en"
    max_duration_seconds: int = 300
    end_call_after_silence_secs: int = 30
    interruption_sensitivity: InterruptionSensitivity = InterruptionSensitivity.medium
    turn_endpoint_delay_ms: int = 500
    enable_backchannel: bool = True
    enable_data_collection: bool = False
    data_collection_fields: list[dict] | None = None

class ConversationConfigResponse(ConversationConfigCreate):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

# Tool
class AgentToolCreate(BaseModel):
    tool_type: ToolType
    name: str
    description: str | None = None
    is_enabled: bool = True
    url: str | None = None
    http_method: HttpMethod | None = None
    headers: dict | None = None

class AgentToolResponse(AgentToolCreate):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

# Agent
class AgentCreate(BaseModel):
    name: str
    description: str | None = None
    llm_provider: LLMProvider = LLMProvider.google
    llm_model: str = "gemini-2.5-flash"
    llm_custom_endpoint: str | None = None
    system_prompt: str | None = None
    first_message: str | None = None
    temperature: float = 0.7
    max_tokens: int = 1024
    voice_config: VoiceConfigCreate
    conversation_config: ConversationConfigCreate = Field(default_factory=ConversationConfigCreate)
    tools: list[AgentToolCreate] = []

    @field_validator("system_prompt")
    @classmethod
    def validate_system_prompt(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return validate_system_prompt_text(v, field_name="system_prompt")

    @field_validator("first_message")
    @classmethod
    def validate_first_message(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return validate_first_message_text(v, field_name="first_message")

class AgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    llm_provider: LLMProvider | None = None
    llm_model: str | None = None
    llm_custom_endpoint: str | None = None
    system_prompt: str | None = None
    first_message: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    voice_config: VoiceConfigCreate | None = None
    conversation_config: ConversationConfigCreate | None = None
    tools: list[AgentToolCreate] | None = None

    @field_validator("system_prompt")
    @classmethod
    def validate_system_prompt(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return validate_system_prompt_text(v, field_name="system_prompt")

    @field_validator("first_message")
    @classmethod
    def validate_first_message(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return validate_first_message_text(v, field_name="first_message")

class AgentResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    elevenlabs_agent_id: str | None = None
    name: str
    description: str | None = None
    status: AgentStatus
    llm_provider: LLMProvider
    llm_model: str
    system_prompt: str | None = None
    first_message: str | None = None
    temperature: float
    max_tokens: int
    total_calls: int
    success_rate: float | None = None
    voice_config: VoiceConfigResponse | None = None
    conversation_config: ConversationConfigResponse | None = None
    tools: list[AgentToolResponse] = []
    created_at: datetime
    updated_at: datetime
    # Derived field — whether this agent is blocked by an active campaign
    active_campaign_id: UUID | None = None
    active_campaign_name: str | None = None
    assigned_campaign_id: UUID | None = None
    assigned_campaign_name: str | None = None
    assigned_campaign_status: CampaignStatus | None = None
    model_config = ConfigDict(from_attributes=True)

class AgentListResponse(BaseModel):
    id: UUID
    name: str
    status: AgentStatus
    llm_model: str
    total_calls: int
    success_rate: float | None = None
    active_campaign_id: UUID | None = None
    active_campaign_name: str | None = None
    assigned_campaign_id: UUID | None = None
    assigned_campaign_name: str | None = None
    assigned_campaign_status: CampaignStatus | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AgentTestCallRequest(BaseModel):
    to_number: str = Field(..., description="The phone number to call")
    phone_number_id: UUID = Field(..., description="The ID of the phone number to use as Caller ID")

