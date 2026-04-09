import pytest
from pydantic import ValidationError

from app.schemas.agent import AgentCreate, AgentUpdate

VALID_SYSTEM_PROMPT = (
    "You are a concise outbound assistant. Keep calls respectful and practical. "
    "Use the campaign context to qualify interest and close politely."
)
VALID_FIRST_MESSAGE = "Hi {{contact_name}}, thanks for taking my call today."


def _build_agent_create(**overrides) -> AgentCreate:
    payload = {
        "name": "Validation Agent",
        "system_prompt": VALID_SYSTEM_PROMPT,
        "first_message": VALID_FIRST_MESSAGE,
        "voice_config": {"voice_id": "EXAVITQu4vr4xnSDxMaL"},
    }
    payload.update(overrides)
    return AgentCreate(**payload)


def test_agent_create_rejects_unknown_placeholder_in_first_message():
    with pytest.raises(ValidationError):
        _build_agent_create(
            first_message="Hi {{contact_name}}, I reviewed {{account_id}} before calling."
        )


def test_agent_create_rejects_markdown_in_system_prompt():
    with pytest.raises(ValidationError):
        _build_agent_create(
            system_prompt=(
                "# Call Policy\n"
                "- Greet the prospect\n"
                "- Ask qualifying questions\n"
                "- End politely"
            )
        )


def test_agent_update_rejects_missing_contact_name_placeholder():
    with pytest.raises(ValidationError):
        AgentUpdate(first_message="Hello there, thanks for answering this call.")


def test_agent_update_allows_custom_placeholders():
    update = AgentUpdate(
        system_prompt=(
            "You are a professional caller. Mention {{custom_interest_level}} only when needed "
            "and keep the conversation natural."
        ),
        first_message="Hello {{contact_name}}, I noticed your {{custom_interest_level}} interest.",
    )
    assert "{{custom_interest_level}}" in (update.system_prompt or "")
