# tests/test_agent_generation_service.py

import json

import pytest
from app.services.agent_generation_service import (
    _parse_and_validate,
    _parse_goal_improvement,
    build_agent_create,
    DEFAULT_CONFIG,
    GeneratedAgentConfig,
    improve_goal_description,
)

VALID_LLM_RESPONSE = """
{
  "agent_name": "Demo Booking Agent",
  "system_prompt": "You are a friendly sales assistant for Acme Corp. Your goal is to schedule a 15-minute product demo with trial users who haven't booked one yet. Start by asking if they have had a chance to explore the product. If they are interested, offer to book a demo. If they are not interested, thank them and end the call. Always be respectful and concise.",
  "first_message": "Hi {{contact_name}}, this is Alex from Acme Corp. I noticed you recently signed up for our trial and wanted to check in. Have you had a chance to explore the platform yet?",
  "voice_id": "EXAVITQu4vr4xnSDxMaL",
  "language": "en",
  "max_duration_seconds": 300,
  "end_call_after_silence_secs": 20,
  "interruption_sensitivity": "medium",
  "enable_backchannel": true,
  "enable_data_collection": true,
  "data_collection_fields": [
    { "key": "interested", "type": "boolean", "description": "Is the contact interested in a demo?", "options": [] },
    { "key": "preferred_time", "type": "string", "description": "Their preferred time for the demo", "options": [] }
  ],
  "tools": ["end_call", "calendar_booking"],
  "rationale": "Calendar booking tool included because the goal is to schedule demos."
}
"""

RESPONSE_WITH_MARKDOWN = f"```json\n{VALID_LLM_RESPONSE}\n```"
RESPONSE_INVALID_VOICE = VALID_LLM_RESPONSE.replace(
    '"EXAVITQu4vr4xnSDxMaL"', '"non_existent_voice_id_xyz"'
)
# For short prompt test, we need valid JSON but with a short string.
_data = json.loads(VALID_LLM_RESPONSE)
_data["system_prompt"] = "Hi"
RESPONSE_SHORT_PROMPT = json.dumps(_data)

_missing_contact_name = json.loads(VALID_LLM_RESPONSE)
_missing_contact_name["first_message"] = "Hello there, great to connect with you today."
RESPONSE_MISSING_CONTACT_NAME = json.dumps(_missing_contact_name)

_unknown_placeholder = json.loads(VALID_LLM_RESPONSE)
_unknown_placeholder["first_message"] = (
    "Hi {{contact_name}}, I saw your account id {{account_id}} and wanted to follow up."
)
RESPONSE_UNKNOWN_PLACEHOLDER = json.dumps(_unknown_placeholder)

_malformed_placeholder = json.loads(VALID_LLM_RESPONSE)
_malformed_placeholder["first_message"] = "Hi {{contact-name}}, thanks for your time today."
RESPONSE_MALFORMED_PLACEHOLDER = json.dumps(_malformed_placeholder)

_sectioned_prompt = json.loads(VALID_LLM_RESPONSE)
_sectioned_prompt["system_prompt"] = (
    "# Personality\n"
    "You are a friendly outbound specialist.\n\n"
    "# Goal\n"
    "Qualify interest and propose a demo.\n\n"
    "# Guardrails\n"
    "Never guess or fabricate information."
)
RESPONSE_SECTIONED_PROMPT = json.dumps(_sectioned_prompt)

VALID_GOAL_IMPROVEMENT_RESPONSE = json.dumps({
    "improved_goal_description": (
        "Call recently signed-up trial users who have not booked a demo yet, "
        "identify interest, and convert qualified prospects into a scheduled 15-minute product walkthrough."
    )
})

class TestParseAndValidate:
    def test_valid_response(self):
        config = _parse_and_validate(VALID_LLM_RESPONSE)
        assert config.agent_name == "Demo Booking Agent"
        assert "{{contact_name}}" in config.first_message
        assert "end_call" in config.tools
        assert "calendar_booking" in config.tools
        assert config.enable_data_collection is True
        assert len(config.data_collection_fields) == 2

    def test_strips_markdown_fences(self):
        config = _parse_and_validate(RESPONSE_WITH_MARKDOWN)
        assert config.agent_name == "Demo Booking Agent"

    def test_sectioned_system_prompt_is_allowed(self):
        config = _parse_and_validate(RESPONSE_SECTIONED_PROMPT)
        assert "# Guardrails" in config.system_prompt

    def test_invalid_voice_id_falls_back_to_sarah(self):
        config = _parse_and_validate(RESPONSE_INVALID_VOICE)
        assert config.voice_id == "EXAVITQu4vr4xnSDxMaL"

    def test_system_prompt_too_short_raises(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            _parse_and_validate(RESPONSE_SHORT_PROMPT)

    def test_unknown_tool_raises(self):
        bad = VALID_LLM_RESPONSE.replace(
            '"end_call", "calendar_booking"', '"end_call", "send_email"'
        )
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            _parse_and_validate(bad)

    def test_missing_contact_name_placeholder_raises(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            _parse_and_validate(RESPONSE_MISSING_CONTACT_NAME)

    def test_unknown_placeholder_raises(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            _parse_and_validate(RESPONSE_UNKNOWN_PLACEHOLDER)

    def test_malformed_placeholder_raises(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            _parse_and_validate(RESPONSE_MALFORMED_PLACEHOLDER)


class TestBuildAgentCreate:
    def test_tools_are_mapped_correctly(self):
        from app.enums import ToolType
        config = _parse_and_validate(VALID_LLM_RESPONSE)
        agent_create = build_agent_create(config, "Q1 Campaign")
        tool_names = [t.name for t in agent_create.tools]
        assert "end_call" in tool_names
        assert "calendar_booking" in tool_names
        end_call = next(t for t in agent_create.tools if t.name == "end_call")
        assert end_call.tool_type == ToolType.system
        calendar = next(t for t in agent_create.tools if t.name == "calendar_booking")
        assert calendar.tool_type == ToolType.client

    def test_description_includes_campaign_name(self):
        config = _parse_and_validate(VALID_LLM_RESPONSE)
        agent_create = build_agent_create(config, "Q1 Campaign")
        assert "Q1 Campaign" in agent_create.description

    def test_voice_config_populated(self):
        config = _parse_and_validate(VALID_LLM_RESPONSE)
        agent_create = build_agent_create(config, "Test")
        assert agent_create.voice_config.voice_id == "EXAVITQu4vr4xnSDxMaL"

    def test_data_collection_fields_passed_through(self):
        config = _parse_and_validate(VALID_LLM_RESPONSE)
        agent_create = build_agent_create(config, "Test")
        fields = agent_create.conversation_config.data_collection_fields
        assert fields is not None
        assert any(f["key"] == "interested" for f in fields)


class TestGenerateAgentConfig:
    """Integration-level tests — mock the LLM API call."""

    @pytest.mark.asyncio
    async def test_returns_default_when_no_api_key(self, monkeypatch):
        monkeypatch.setattr("app.services.agent_generation_service.groq_client", None)
        from app.services.agent_generation_service import generate_agent_config
        config, was_generated = await generate_agent_config("Test goal", "Acme")
        assert was_generated is False
        assert config.agent_name == DEFAULT_CONFIG.agent_name

    @pytest.mark.asyncio
    async def test_returns_default_on_api_failure(self, monkeypatch):
        async def mock_call(*args, **kwargs):
            raise Exception("API error")
        monkeypatch.setattr(
            "app.services.agent_generation_service._call_llm", mock_call
        )
        monkeypatch.setattr("app.services.agent_generation_service.groq_client", "fake-client")
        from app.services.agent_generation_service import generate_agent_config
        config, was_generated = await generate_agent_config("Test goal", "Acme")
        assert was_generated is False

    @pytest.mark.asyncio
    async def test_returns_generated_config_on_success(self, monkeypatch):
        async def mock_call(*args, **kwargs):
            return VALID_LLM_RESPONSE
        monkeypatch.setattr(
            "app.services.agent_generation_service._call_llm", mock_call
        )
        monkeypatch.setattr("app.services.agent_generation_service.groq_client", "fake-client")
        from app.services.agent_generation_service import generate_agent_config
        config, was_generated = await generate_agent_config("Book demos", "Acme")
        assert was_generated is True
        assert config.agent_name == "Demo Booking Agent"


class TestImproveGoalDescription:
    def test_parse_goal_improvement_response(self):
        improved = _parse_goal_improvement(VALID_GOAL_IMPROVEMENT_RESPONSE)
        assert "trial users" in improved
        assert len(improved) <= 500

    @pytest.mark.asyncio
    async def test_improve_goal_returns_original_when_no_api_key(self, monkeypatch):
        monkeypatch.setattr("app.services.agent_generation_service.groq_client", None)
        improved, was_improved, warning = await improve_goal_description("Book more demos quickly.", "Acme")
        assert improved == "Book more demos quickly."
        assert was_improved is False
        assert warning is not None

    @pytest.mark.asyncio
    async def test_improve_goal_returns_ai_output_on_success(self, monkeypatch):
        async def mock_call(*args, **kwargs):
            return VALID_GOAL_IMPROVEMENT_RESPONSE

        monkeypatch.setattr(
            "app.services.agent_generation_service._call_goal_improvement_llm", mock_call
        )
        monkeypatch.setattr("app.services.agent_generation_service.groq_client", "fake-client")

        improved, was_improved, warning = await improve_goal_description(
            "Call customers.",
            "Acme",
        )
        assert "trial users" in improved
        assert was_improved is True
        assert warning is None
