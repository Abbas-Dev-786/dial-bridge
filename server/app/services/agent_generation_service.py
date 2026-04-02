import json
import logging
from typing import Any, Literal

import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from pydantic import BaseModel, Field, field_validator
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import google.api_core.exceptions as google_exceptions

from app.config import settings
from app.enums import (
    LLMProvider, InterruptionSensitivity, ToolType
)
from app.schemas.agent import (
    AgentCreate, VoiceConfigCreate, ConversationConfigCreate, AgentToolCreate
)

logger = logging.getLogger(__name__)

# Configure the Gemini client once at module load
if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)

# ── Voice Options Catalogue ───────────────────────────────────────────────────

VOICE_OPTIONS = [
    {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Sarah",   "gender": "female", "tone": "warm, professional"},
    {"id": "CwhRBWXzGAHq8TQ4Fs17", "name": "Roger",   "gender": "male",   "tone": "confident, direct"},
    {"id": "FGY2WhTYpPnrIDTdsKH5", "name": "Laura",   "gender": "female", "tone": "friendly, energetic"},
    {"id": "JBFqnCBsd6RMkjVDRZzb", "name": "George",  "gender": "male",   "tone": "authoritative, calm"},
    {"id": "TX3LPaxmHKxFdv7VOQHJ", "name": "Liam",    "gender": "male",   "tone": "casual, approachable"},
    {"id": "Xb7hH8MSUJpSbSDYk0k2", "name": "Alice",   "gender": "female", "tone": "clear, professional"},
    {"id": "nPczCjzI2devNBz1zQrb", "name": "Brian",   "gender": "male",   "tone": "warm, trustworthy"},
    {"id": "pFZP5JQG7iQjIQuC4Bku", "name": "Lily",    "gender": "female", "tone": "cheerful, conversational"},
]

# ── Structured Output Schema ──────────────────────────────────────────────────

class GeneratedDataCollectionField(BaseModel):
    key: str
    type: str                   # 'string', 'boolean', 'number', 'enum'
    description: str
    options: list[str] = []     # only for type='enum'


class GeneratedAgentConfig(BaseModel):
    """
    Validated output from Gemini. Every field must be present and valid
    before we use it. If Gemini returns anything unexpected, Pydantic raises
    a ValidationError and we fall back to defaults.
    """
    agent_name: str = Field(min_length=2, max_length=80)
    system_prompt: str = Field(min_length=50)
    first_message: str = Field(min_length=10)
    voice_id: str
    language: str = "en"
    max_duration_seconds: int = Field(ge=60, le=1800, default=300)
    end_call_after_silence_secs: int = Field(ge=5, le=120, default=20)
    interruption_sensitivity: Literal["low", "medium", "high"] = "medium"
    enable_backchannel: bool = True
    enable_data_collection: bool = False
    data_collection_fields: list[GeneratedDataCollectionField] = []
    # System tools to enable (subset of known tool names)
    tools: list[Literal["end_call", "transfer_call", "calendar_booking", "crm_lookup"]] = ["end_call"]
    # Short rationale explaining why these choices were made.
    # Stored in agent.description so users understand the generation.
    rationale: str = ""

    @field_validator("voice_id")
    @classmethod
    def validate_voice_id(cls, v: str) -> str:
        valid_ids = {opt["id"] for opt in VOICE_OPTIONS}
        if v not in valid_ids:
            # If Gemini hallucinates a voice ID, use a safe default
            return "EXAVITQu4vr4xnSDxMaL"   # Sarah
        return v

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        # Normalise to lowercase two-letter code
        return v.lower()[:2]

# ── Gemini Prompt ─────────────────────────────────────────────────────────────

SYSTEM_INSTRUCTION = """\
You are an expert at configuring AI voice calling agents for outbound sales \
and support campaigns.

Given a campaign goal, you generate a complete agent configuration optimised \
for natural, effective phone conversations.

Rules you must follow:
- System prompts must be written for VOICE, not text. Short sentences. \
  No bullet points. No markdown. Conversational tone.
- The system prompt must tell the agent exactly what to do, how to handle \
  objections, and when to end the call.
- The first message must always start with a greeting and use {{contact_name}} \
  to address the contact by name.
- The first message must sound natural when spoken aloud — no formal salutations.
- Choose a voice that matches the campaign's tone (sales = confident, \
  support = warm, survey = friendly).
- Only enable data_collection if the goal implies collecting specific information.
- Only include calendar_booking tool if the goal is to schedule meetings.
- Only include crm_lookup if the agent needs to look up account information.
- end_call must always be included.
- Do not invent tools that are not in the allowed list.
- Return ONLY valid JSON. No explanation. No markdown code blocks. \
  No preamble. Raw JSON only.
"""

def build_user_prompt(goal: str, workspace_name: str) -> str:
    voice_list = "\n".join(
        f"  - id: {v['id']} | name: {v['name']} | gender: {v['gender']} | tone: {v['tone']}"
        for v in VOICE_OPTIONS
    )
    return f"""\
Campaign goal: {goal}

Company / workspace name: {workspace_name}

Available voice IDs (choose the most appropriate one):
{voice_list}

Generate the agent configuration JSON now.\
"""

# ── Default fallback config ───────────────────────────────────────────────────
# Used when Gemini fails or returns invalid output.

DEFAULT_CONFIG = GeneratedAgentConfig(
    agent_name="Voice Agent",
    system_prompt=(
        "You are a professional voice assistant. "
        "Greet the contact warmly, explain the purpose of your call, "
        "and answer any questions they have. "
        "Be concise and respectful of their time. "
        "End the call politely when the conversation is complete."
    ),
    first_message="Hi {{contact_name}}, how are you doing today?",
    voice_id="EXAVITQu4vr4xnSDxMaL",   # Sarah
    tools=["end_call"],
    rationale="Default configuration — AI generation was unavailable.",
)

# ── Main generation function ──────────────────────────────────────────────────

async def generate_agent_config(
    goal: str,
    workspace_name: str,
) -> tuple[GeneratedAgentConfig, bool]:
    """
    Calls Gemini and returns a validated GeneratedAgentConfig.

    Returns:
        (config, was_generated) where was_generated=False means we fell
        back to defaults. The caller uses this to set a warning on the campaign.
    """
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY not configured — using default agent config")
        return DEFAULT_CONFIG, False

    try:
        raw = await _call_gemini(goal, workspace_name)
        config = _parse_and_validate(raw)
        logger.info(f"Agent config generated successfully for goal: {goal[:60]}...")
        return config, True

    except Exception as exc:
        logger.error(f"Agent generation failed: {exc} — falling back to defaults")
        return DEFAULT_CONFIG, False


@retry(
    retry=retry_if_exception_type((
        google_exceptions.ServiceUnavailable,
        google_exceptions.DeadlineExceeded,
        google_exceptions.ResourceExhausted,
    )),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
async def _call_gemini(goal: str, workspace_name: str) -> str:
    """
    Makes the actual Gemini API call.
    Returns the raw text response.
    Raises on any API error.
    """
    model = genai.GenerativeModel(
        model_name=settings.gemini_model,
        system_instruction=SYSTEM_INSTRUCTION,
        generation_config=GenerationConfig(
            temperature=0.4,          # low — we want consistent, reliable output
            response_mime_type="application/json",
        ),
    )

    prompt = build_user_prompt(goal, workspace_name)
    response = await model.generate_content_async(prompt)

    if not response.text:
        raise ValueError("Gemini returned an empty response")

    return response.text


def _parse_and_validate(raw: str) -> GeneratedAgentConfig:
    """
    Parses the raw Gemini response and validates it against GeneratedAgentConfig.
    Strips any accidental markdown code fences before parsing.
    Raises ValidationError if the structure is wrong.
    """
    # Strip markdown fences if Gemini wrapped the JSON despite being told not to
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Keep lines between fences
        if lines[0].startswith("```") and lines[-1].startswith("```"):
            cleaned = "\n".join(lines[1:-1])
        elif lines[0].startswith("```"):
             cleaned = "\n".join(lines[1:])

    data = json.loads(cleaned)
    return GeneratedAgentConfig.model_validate(data)


# ── Converter: GeneratedAgentConfig → AgentCreate ────────────────────────────

TOOL_NAME_TO_TYPE = {
    "end_call":          ToolType.system,
    "transfer_call":     ToolType.system,
    "calendar_booking":  ToolType.client,
    "crm_lookup":        ToolType.client,
}

TOOL_DESCRIPTIONS = {
    "end_call":         "End the call when the conversation is complete",
    "transfer_call":    "Transfer the call to a human agent when requested",
    "calendar_booking": "Book a meeting or demo in the contact's calendar",
    "crm_lookup":       "Look up the contact's account information",
}


def build_agent_create(
    config: GeneratedAgentConfig,
    campaign_name: str,
) -> AgentCreate:
    """
    Converts a GeneratedAgentConfig into the AgentCreate schema
    that agent_service.create_agent() expects.
    """
    tools = [
        AgentToolCreate(
            tool_type=TOOL_NAME_TO_TYPE.get(tool_name, ToolType.system),
            name=tool_name,
            description=TOOL_DESCRIPTIONS.get(tool_name, ""),
            is_enabled=True,
        )
        for tool_name in config.tools
    ]

    return AgentCreate(
        name=config.agent_name,
        # Store the AI rationale in description so users understand
        # why the agent was configured this way.
        description=(
            f"Auto-generated for campaign: {campaign_name}. "
            + (config.rationale if config.rationale else "")
        ),
        llm_provider=LLMProvider.openai,
        llm_model="gpt-4o",
        system_prompt=config.system_prompt,
        first_message=config.first_message,
        temperature=0.7,
        max_tokens=1024,
        voice_config=VoiceConfigCreate(
            voice_id=config.voice_id,
            stability=50,
            similarity_boost=75,
            style=0,
            speed=100,
        ),
        conversation_config=ConversationConfigCreate(
            language=config.language,
            max_duration_seconds=config.max_duration_seconds,
            end_call_after_silence_secs=config.end_call_after_silence_secs,
            interruption_sensitivity=InterruptionSensitivity(
                config.interruption_sensitivity
            ),
            enable_backchannel=config.enable_backchannel,
            enable_data_collection=config.enable_data_collection,
            data_collection_fields=[
                {
                    "key":         f.key,
                    "type":        f.type,
                    "description": f.description,
                    "options":     f.options,
                }
                for f in config.data_collection_fields
            ] or None,
        ),
        tools=tools,
    )
