import pytest
import uuid
from datetime import datetime, date, time
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import AsyncMock, patch, MagicMock

from app.models.campaign import Campaign
from app.models.agent import Agent
from app.models.workspace import Workspace
from app.models.user import User
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignStatusTransition
from app.enums import CampaignStatus, KBSyncStatus, LLMProvider, ToolType, PhoneNumberStatus
from app.services import campaign_service
from app.exceptions import ValidationError, ConflictError
from app.services.agent_generation_service import GeneratedAgentConfig

@pytest.fixture
def mock_workspace():
    ws = Workspace(id=uuid.uuid4(), name="Test Workspace")
    return ws

@pytest.fixture
def mock_user():
    u = User(id=uuid.uuid4(), email="test@example.com")
    return u

@pytest.fixture
def mock_generated_config():
    return GeneratedAgentConfig(
        agent_name="Generated Agent",
        system_prompt="You are a professional voice assistant. Be helpful.",
        first_message="Hello, how can I help you today?",
        voice_id="EXAVITQu4vr4xnSDxMaL",
        tools=["end_call"],
        rationale="Test rationale"
    )

@pytest.mark.asyncio
async def test_create_campaign_automated(mock_workspace, mock_user, mock_generated_config):
    """Test that creating a campaign automatically generates an agent."""
    campaign_data = CampaignCreate(
        name="Test Campaign",
        goal_description="Book more demos for our software."
    )

    # Mock DB Session
    mock_db = AsyncMock(spec=AsyncSession)

    # Mock AI and Agent Creation
    with patch("app.services.agent_generation_service.generate_agent_config", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = (mock_generated_config, True)
        
        with patch("app.services.agent_service.create_agent", new_callable=AsyncMock) as mock_create_agent:
            mock_agent = Agent(
                id=uuid.uuid4(), 
                name="Generated Agent",
                workspace_id=mock_workspace.id
            )
            mock_create_agent.return_value = mock_agent

            campaign = await campaign_service.create_campaign(
                mock_db, mock_workspace, mock_user, campaign_data
            )

            assert campaign.name == "Test Campaign"
            assert campaign.agent_id == mock_agent.id
            assert campaign.agent_was_generated is True
            assert campaign.agent_generation_failed is False
            assert campaign.status == CampaignStatus.draft
            
            # Verify DB interactions
            assert mock_db.add.called
            assert mock_db.commit.called

@pytest.mark.asyncio
async def test_transition_to_live_validations(mock_workspace):
    """Test validations before a campaign can go live."""
    campaign = Campaign(
        id=uuid.uuid4(),
        workspace_id=mock_workspace.id,
        name="Test",
        status=CampaignStatus.draft,
        contacts_total=0 # No contacts
    )
    
    # Mock DB Session
    mock_db = AsyncMock(spec=AsyncSession)

    with pytest.raises(ValidationError) as exc:
        await campaign_service.transition_status(mock_db, campaign, CampaignStatus.live, mock_workspace)
    assert "An agent must be assigned before going live" in str(exc.value)

@pytest.mark.asyncio
async def test_build_campaign_response(mock_workspace):
    """Test manual response builder for the API."""
    from app.models.agent import AgentVoiceConfig
    
    agent = Agent(
        id=uuid.uuid4(),
        name="Test Agent",
        system_prompt="Short prompt",
        first_message="Hi"
    )
    agent.voice_config = AgentVoiceConfig(voice_name="Sarah")
    agent.tools = []
    
    campaign = Campaign(
        id=uuid.uuid4(),
        workspace_id=mock_workspace.id,
        name="Test Campaign",
        status=CampaignStatus.draft,
        agent=agent,
        agent_was_generated=True,
        agent_generation_failed=False,
        kb_sync_status=KBSyncStatus.pending,
        timezone="US/Eastern",
        schedule_days=["Mon", "Tue", "Wed", "Thu", "Fri"],
        schedule_start_time=time(9, 0),
        schedule_end_time=time(17, 0),
        max_concurrency=5,
        max_retries=3,
        retry_delay_minutes=30,
        retry_on_outcomes=[],
        dnc_check_enabled=True,
        record_calls=True,
        tcpa_mode=True,
        voicemail_detection=True,
        leave_voicemail=False,
        contacts_total=0,
        contacts_called=0,
        contacts_remaining=0,
        calls_successful=0,
        calls_failed=0,
        total_spend_cents=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    response = campaign_service.build_campaign_response(campaign)
    assert response.agent_name == "Test Agent"
    assert response.agent_generation is not None
    assert response.agent_generation.was_generated is True
    assert response.agent_generation.system_prompt_preview == "Short prompt"
