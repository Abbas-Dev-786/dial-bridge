from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

from app.enums import CampaignStatus
from app.exceptions import ConflictError
from app.models.agent import Agent
from app.models.campaign import Campaign
from app.models.workspace import Workspace
from app.services import agent_service


class ScalarOneResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class ScalarsResult:
    def __init__(self, values):
        self._values = values

    def scalars(self):
        return self

    def all(self):
        return self._values

    def first(self):
        return self._values[0] if self._values else None


def _dt(hours_ago: int) -> datetime:
    return datetime.now(UTC) - timedelta(hours=hours_ago)


@pytest.mark.asyncio
async def test_list_agents_prefers_active_campaign_for_assignment():
    agent = Agent(id=uuid4(), workspace_id=uuid4(), name="Agent One")
    historical_campaign = Campaign(
        id=uuid4(),
        agent_id=agent.id,
        name="Paused Campaign",
        status=CampaignStatus.paused,
        created_at=_dt(3),
        updated_at=_dt(1),
    )
    active_campaign = Campaign(
        id=uuid4(),
        agent_id=agent.id,
        name="Live Campaign",
        status=CampaignStatus.live,
        created_at=_dt(5),
        updated_at=_dt(4),
    )

    db = AsyncMock()
    db.execute.side_effect = [
        ScalarsResult([agent]),
        ScalarsResult([historical_campaign, active_campaign]),
    ]

    agents = await agent_service.list_agents(db, agent.workspace_id)

    assert len(agents) == 1
    assert agents[0].active_campaign_id == active_campaign.id
    assert agents[0].active_campaign_name == "Live Campaign"
    assert agents[0].assigned_campaign_id == active_campaign.id
    assert agents[0].assigned_campaign_name == "Live Campaign"
    assert agents[0].assigned_campaign_status == CampaignStatus.live


@pytest.mark.asyncio
async def test_get_agent_falls_back_to_latest_historical_campaign_and_ignores_deleted():
    workspace_id = uuid4()
    agent = Agent(id=uuid4(), workspace_id=workspace_id, name="Agent Two")
    paused_campaign = Campaign(
        id=uuid4(),
        agent_id=agent.id,
        name="Paused Campaign",
        status=CampaignStatus.paused,
        created_at=_dt(6),
        updated_at=_dt(5),
    )
    completed_campaign = Campaign(
        id=uuid4(),
        agent_id=agent.id,
        name="Completed Campaign",
        status=CampaignStatus.completed,
        created_at=_dt(4),
        updated_at=_dt(2),
    )
    deleted_campaign = Campaign(
        id=uuid4(),
        agent_id=agent.id,
        name="Deleted Campaign",
        status=CampaignStatus.live,
        created_at=_dt(2),
        updated_at=_dt(1),
        deleted_at=_dt(1),
    )

    db = AsyncMock()
    db.execute.side_effect = [
        ScalarOneResult(agent),
        ScalarsResult([deleted_campaign, completed_campaign, paused_campaign]),
    ]

    result = await agent_service.get_agent(db, workspace_id, agent.id)

    assert result.active_campaign_id is None
    assert result.active_campaign_name is None
    assert result.assigned_campaign_id == completed_campaign.id
    assert result.assigned_campaign_name == "Completed Campaign"
    assert result.assigned_campaign_status == CampaignStatus.completed


@pytest.mark.asyncio
async def test_delete_agent_blocks_only_for_active_campaigns():
    workspace = Workspace(id=uuid4(), name="Workspace")
    blocked_agent = Agent(id=uuid4(), workspace_id=workspace.id, name="Blocked Agent")
    blocking_campaign = Campaign(
        id=uuid4(),
        agent_id=blocked_agent.id,
        name="Scheduled Campaign",
        status=CampaignStatus.scheduled,
    )

    blocking_db = AsyncMock()
    with patch.object(
        agent_service,
        "get_active_campaign",
        AsyncMock(return_value=blocking_campaign),
    ):
        with pytest.raises(ConflictError):
            await agent_service.delete_agent(blocking_db, workspace, blocked_agent)

    free_agent = Agent(id=uuid4(), workspace_id=workspace.id, name="Free Agent")
    free_db = AsyncMock()
    with patch.object(
        agent_service,
        "get_active_campaign",
        AsyncMock(return_value=None),
    ):
        with patch.object(agent_service, "log_action", AsyncMock()):
            await agent_service.delete_agent(free_db, workspace, free_agent)

    assert free_agent.deleted_at is not None
    free_db.commit.assert_awaited_once()
