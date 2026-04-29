import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import HttpMethod, InterruptionSensitivity, ToolType
from app.models.agent import Agent, AgentConversationConfig, AgentTool, AgentVoiceConfig
from app.models.workspace import Workspace
from app.schemas.agent import AgentToolCreate, AgentUpdate, ConversationConfigCreate, VoiceConfigCreate
from app.services import agent_service


def test_build_elevenlabs_agent_payload_maps_turn_and_interruption_settings():
    agent = Agent(
        id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        name="Outbound Agent",
        llm_model="gemini-2.5-flash",
        system_prompt="Stay concise and helpful.",
        first_message="Hi {{contact_name}}, thanks for taking the call.",
        temperature=0.3,
        max_tokens=1024,
    )
    voice_config = AgentVoiceConfig(
        agent_id=agent.id,
        voice_id="voice-123",
        stability=45,
        similarity_boost=82,
        style=10,
        speed=95,
    )
    conversation_config = AgentConversationConfig(
        agent_id=agent.id,
        language="en",
        max_duration_seconds=420,
        end_call_after_silence_secs=18,
        interruption_sensitivity=InterruptionSensitivity.medium,
        turn_endpoint_delay_ms=250,
        enable_backchannel=True,
        enable_data_collection=False,
    )
    tools = [
        AgentTool(
            agent_id=agent.id,
            tool_type=ToolType.server,
            name="crm_lookup",
            description="Look up the caller in CRM.",
            is_enabled=True,
            url="https://example.com/crm",
            http_method=HttpMethod.POST,
            headers={"Authorization": "Bearer token"},
        )
    ]

    payload = agent_service.build_elevenlabs_agent_payload(
        agent=agent,
        voice_config=voice_config,
        conversation_config=conversation_config,
        tools=tools,
        workspace_id=agent.workspace_id,
        knowledge_documents=[],
    )

    assert payload["conversation_config"]["turn"] == {
        "mode": "turn",
        "silence_end_call_timeout": 18,
        "turn_eagerness": "eager",
    }
    assert payload["conversation_config"]["conversation"]["client_events"] == [
        "audio",
        "agent_response",
        "user_transcript",
        "interruption",
    ]
    assert payload["conversation_config"]["agent"]["prompt"]["llm"] == "gemini-2.5-flash"
    assert payload["conversation_config"]["tts"]["voice_id"] == "voice-123"
    assert payload["conversation_config"]["agent"]["prompt"]["tools"][0]["name"] == "crm_lookup"


@pytest.mark.asyncio
async def test_update_agent_persists_nested_configs_and_replaces_tools():
    workspace = Workspace(id=uuid.uuid4(), name="Test Workspace")
    agent = Agent(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        name="Original Agent",
        llm_model="gemini-2.5-flash",
        system_prompt="Original prompt",
        first_message="Hi {{contact_name}}",
        temperature=0.7,
        max_tokens=1024,
    )
    agent.voice_config = AgentVoiceConfig(
        agent_id=agent.id,
        voice_id="voice-old",
        stability=50,
        similarity_boost=75,
        style=0,
        speed=100,
    )
    agent.conversation_config = AgentConversationConfig(
        agent_id=agent.id,
        language="en",
        max_duration_seconds=300,
        end_call_after_silence_secs=30,
        interruption_sensitivity=InterruptionSensitivity.medium,
        turn_endpoint_delay_ms=500,
        enable_backchannel=True,
        enable_data_collection=False,
        data_collection_fields=[],
    )
    agent.tools = [
        AgentTool(
            agent_id=agent.id,
            tool_type=ToolType.server,
            name="old_tool",
            description="Old tool",
            is_enabled=True,
            url="https://example.com/old",
            http_method=HttpMethod.POST,
            headers={"X-Test": "old"},
        )
    ]

    update = AgentUpdate(
        name="Updated Agent",
        system_prompt="Updated prompt that is long enough for validation and clearly instructs the agent.",
        first_message="Hello {{contact_name}}, I can help with your account today.",
        temperature=0.4,
        max_tokens=2048,
        voice_config=VoiceConfigCreate(
            voice_id="voice-new",
            stability=62,
            similarity_boost=88,
            style=12,
            speed=92,
        ),
        conversation_config=ConversationConfigCreate(
            language="en",
            max_duration_seconds=540,
            end_call_after_silence_secs=20,
            interruption_sensitivity=InterruptionSensitivity.low,
            turn_endpoint_delay_ms=950,
            enable_backchannel=False,
            enable_data_collection=True,
            data_collection_fields=[
                {
                    "identifier": "email",
                    "type": "string",
                    "description": "Customer email address.",
                }
            ],
        ),
        tools=[
            AgentToolCreate(
                tool_type=ToolType.server,
                name="crm_lookup",
                description="Find the lead in CRM.",
                is_enabled=True,
                url="https://example.com/crm",
                http_method=HttpMethod.POST,
                headers={"Authorization": "Bearer token"},
            )
        ],
    )

    db = AsyncMock(spec=AsyncSession)
    kb_result = MagicMock()
    kb_result.scalars.return_value.all.return_value = []
    db.execute.return_value = kb_result

    mock_client = MagicMock()
    mock_client.update_agent = AsyncMock()
    mock_context_manager = MagicMock()
    mock_context_manager.__aenter__ = AsyncMock(return_value=mock_client)
    mock_context_manager.__aexit__ = AsyncMock(return_value=None)

    with patch("app.services.agent_service.get_active_campaign", new=AsyncMock(return_value=None)):
        with patch("app.services.elevenlabs_client.ElevenLabsClient", return_value=mock_context_manager):
            with patch("app.services.agent_service.log_action", new=AsyncMock()):
                result = await agent_service.update_agent(db, workspace, agent, update)

    assert result.name == "Updated Agent"
    assert agent.voice_config.voice_id == "voice-new"
    assert agent.voice_config.speed == 92
    assert agent.conversation_config.end_call_after_silence_secs == 20
    assert agent.conversation_config.turn_endpoint_delay_ms == 950
    assert agent.conversation_config.enable_backchannel is False
    assert len(agent.tools) == 1
    assert agent.tools[0].name == "crm_lookup"

    mock_client.update_agent.assert_awaited_once()
    _, payload = mock_client.update_agent.await_args.args
    assert payload["conversation_config"]["turn"]["silence_end_call_timeout"] == 20
    assert payload["conversation_config"]["turn"]["turn_eagerness"] == "patient"
    assert payload["conversation_config"]["conversation"]["client_events"] == [
        "audio",
        "agent_response",
        "user_transcript",
    ]
    db.commit.assert_awaited()
