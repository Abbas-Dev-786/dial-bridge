import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, JSON, Enum as SAEnum, Integer, Numeric, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models import AppBase
from app.enums import AgentStatus, LLMProvider, InterruptionSensitivity, ToolType, HttpMethod

class Agent(AppBase):
    __tablename__ = "agents"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    elevenlabs_agent_id: Mapped[str | None] = mapped_column(String)
    
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String)
    status: Mapped[AgentStatus] = mapped_column(
        SAEnum(AgentStatus, name="agent_status"), default=AgentStatus.draft
    )
    
    llm_provider: Mapped[LLMProvider] = mapped_column(
        SAEnum(LLMProvider, name="llm_provider"), default=LLMProvider.openai
    )
    llm_model: Mapped[str] = mapped_column(String, default="gpt-4o")
    llm_custom_endpoint: Mapped[str | None] = mapped_column(String)
    
    system_prompt: Mapped[str | None] = mapped_column(String)
    first_message: Mapped[str | None] = mapped_column(String)
    temperature: Mapped[float] = mapped_column(Numeric(3, 2), default=0.7)
    max_tokens: Mapped[int] = mapped_column(Integer, default=1024)
    
    total_calls: Mapped[int] = mapped_column(Integer, default=0)
    success_rate: Mapped[float | None] = mapped_column(Numeric(5, 2))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    workspace: Mapped["Workspace"] = relationship(back_populates="agents")
    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="agent")
    voice_config: Mapped["AgentVoiceConfig"] = relationship(
        back_populates="agent", uselist=False, cascade="all, delete-orphan"
    )
    conversation_config: Mapped["AgentConversationConfig"] = relationship(
        back_populates="agent", uselist=False, cascade="all, delete-orphan"
    )
    tools: Mapped[list["AgentTool"]] = relationship(
        back_populates="agent", cascade="all, delete-orphan"
    )
    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="agent")

class AgentVoiceConfig(AppBase):
    __tablename__ = "agent_voice_configs"

    agent_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    voice_id: Mapped[str] = mapped_column(String, nullable=False)
    voice_name: Mapped[str | None] = mapped_column(String)
    stability: Mapped[float] = mapped_column(Numeric(5, 2), default=50.0)
    similarity_boost: Mapped[float] = mapped_column(Numeric(5, 2), default=75.0)
    style: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    speed: Mapped[float] = mapped_column(Numeric(5, 2), default=100.0)

    agent: Mapped["Agent"] = relationship(back_populates="voice_config")

class AgentConversationConfig(AppBase):
    __tablename__ = "agent_conversation_configs"

    agent_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    language: Mapped[str] = mapped_column(String, default="en")
    max_duration_seconds: Mapped[int] = mapped_column(Integer, default=300)
    end_call_after_silence_secs: Mapped[int] = mapped_column(Integer, default=30)
    interruption_sensitivity: Mapped[InterruptionSensitivity] = mapped_column(
        SAEnum(InterruptionSensitivity, name="interruption_sensitivity"),
        default=InterruptionSensitivity.medium
    )
    turn_endpoint_delay_ms: Mapped[int] = mapped_column(Integer, default=500)
    enable_backchannel: Mapped[bool] = mapped_column(Boolean, default=True)
    enable_data_collection: Mapped[bool] = mapped_column(Boolean, default=False)
    data_collection_fields: Mapped[dict | None] = mapped_column(JSON)

    agent: Mapped["Agent"] = relationship(back_populates="conversation_config")

class AgentTool(AppBase):
    __tablename__ = "agent_tools"

    agent_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tool_type: Mapped[ToolType] = mapped_column(
        SAEnum(ToolType, name="tool_type"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    url: Mapped[str | None] = mapped_column(String)
    http_method: Mapped[HttpMethod | None] = mapped_column(
        SAEnum(HttpMethod, name="http_method")
    )
    headers: Mapped[dict | None] = mapped_column(JSON)

    agent: Mapped["Agent"] = relationship(back_populates="tools")

    __table_args__ = (
        UniqueConstraint("agent_id", "name", name="uq_agent_tool_name"),
    )
