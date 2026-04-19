from uuid import UUID
from datetime import datetime
from urllib.parse import urlparse
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.models.agent import Agent, AgentVoiceConfig, AgentConversationConfig, AgentTool
from app.models.campaign import Campaign
from app.models.workspace import Workspace
from app.models.user import User
from app.schemas.agent import AgentCreate, AgentUpdate, VoiceConfigCreate, ConversationConfigCreate, AgentToolCreate
from app.enums import AgentStatus, CampaignStatus, ToolType
from app.exceptions import NotFoundError, ConflictError
from app.utils.audit import log_action

ACTIVE_CAMPAIGN_STATUSES = {CampaignStatus.live, CampaignStatus.scheduled}

def build_elevenlabs_agent_payload(
    agent: Agent,
    voice_config: AgentVoiceConfig,
    conversation_config: AgentConversationConfig,
    tools: list[AgentTool],
    workspace_id: UUID,
    knowledge_documents: list = None,
) -> dict:
    """
    Builds the JSON payload for ElevenLabs POST/PATCH /convai/agents.
    Reference: https://elevenlabs.io/docs/conversational-ai/api-reference
    """
    payload = {
        "name": f"[{str(workspace_id)[:8]}] {agent.name}",
        "conversation_config": {
            "agent": {
                "prompt": {
                    "prompt": agent.system_prompt or "",
                    "llm": agent.llm_model,
                    "temperature": float(agent.temperature),
                    "max_tokens": agent.max_tokens,
                    "knowledge_base": [
                        {
                            "id": doc.elevenlabs_kb_id,
                            "type": "url" if str(doc.doc_type) == "url_scrape" else "file",
                            "name": doc.name
                        }
                        for doc in (knowledge_documents or [])
                        if doc.elevenlabs_kb_id
                    ]
                },
                "first_message": agent.first_message or "",
                "language": conversation_config.language,
            },
            "tts": {
                "voice_id": voice_config.voice_id,
                "stability": float(voice_config.stability) / 100,
                "similarity_boost": float(voice_config.similarity_boost) / 100,
                "style": float(voice_config.style) / 100,
                "speed": float(voice_config.speed) / 100,
            },
            "turn": {
                "turn_timeout": conversation_config.end_call_after_silence_secs,
                "mode": "turn",
            },
            "conversation": {
                "max_duration_seconds": conversation_config.max_duration_seconds,
            },
            "post_call_webhook_url": f"{settings.base_url}/api/v1/webhooks/elevenlabs/post-call",
            "conversation_initiation_url": f"{settings.base_url}/api/v1/webhooks/elevenlabs/initiation",
        },
    }

    # Add enabled server tools
    server_tools = [
        {
            "type": "webhook",
            "name": t.name,
            "description": t.description or "",
            "url": t.url,
            "method": t.http_method,
            "headers": t.headers or {},
        }
        for t in tools
        if t.tool_type == ToolType.server and t.is_enabled and t.url
    ]
    if server_tools:
        payload["conversation_config"]["agent"]["prompt"]["tools"] = server_tools

    # Add security settings to allow the current frontend origin
    frontend_hostname = urlparse(settings.frontend_url).netloc
    if frontend_hostname:
        payload["platform_settings"] = {
            "auth": {
                "allowlist": [{"hostname": frontend_hostname}]
            }
        }

    return payload

async def get_active_campaign(db: AsyncSession, agent: Agent):
    """
    Query campaigns where agent_id = agent.id AND status IN ('live','scheduled') AND deleted_at IS NULL
    Returns None if agent is free.
    """
    stmt = (
        select(Campaign)
        .where(
            Campaign.agent_id == agent.id,
            Campaign.deleted_at.is_(None),
            Campaign.status.in_(list(ACTIVE_CAMPAIGN_STATUSES)),
        )
        .order_by(Campaign.updated_at.desc(), Campaign.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().first()

async def create_agent(db: AsyncSession, workspace: Workspace, user: User, data: AgentCreate) -> Agent:
    # 1. Create Agent row in DB
    agent = Agent(
        workspace_id=workspace.id,
        created_by=user.id,
        name=data.name,
        description=data.description,
        llm_provider=data.llm_provider,
        llm_model=data.llm_model,
        llm_custom_endpoint=data.llm_custom_endpoint,
        system_prompt=data.system_prompt,
        first_message=data.first_message,
        temperature=data.temperature,
        max_tokens=data.max_tokens,
        status=AgentStatus.draft
    )
    db.add(agent)
    await db.flush()

    # 2. Create AgentVoiceConfig row
    v_config = AgentVoiceConfig(
        agent_id=agent.id,
        voice_id=data.voice_config.voice_id,
        voice_name=data.voice_config.voice_name,
        stability=data.voice_config.stability,
        similarity_boost=data.voice_config.similarity_boost,
        style=data.voice_config.style,
        speed=data.voice_config.speed
    )
    db.add(v_config)

    # 3. Create AgentConversationConfig row
    c_config = AgentConversationConfig(
        agent_id=agent.id,
        language=data.conversation_config.language,
        max_duration_seconds=data.conversation_config.max_duration_seconds,
        end_call_after_silence_secs=data.conversation_config.end_call_after_silence_secs,
        interruption_sensitivity=data.conversation_config.interruption_sensitivity,
        turn_endpoint_delay_ms=data.conversation_config.turn_endpoint_delay_ms,
        enable_backchannel=data.conversation_config.enable_backchannel,
        enable_data_collection=data.conversation_config.enable_data_collection,
        data_collection_fields=data.conversation_config.data_collection_fields
    )
    db.add(c_config)

    # 4. Create AgentTool rows
    tools = []
    for t_data in data.tools:
        tool = AgentTool(
            agent_id=agent.id,
            tool_type=t_data.tool_type,
            name=t_data.name,
            description=t_data.description,
            is_enabled=t_data.is_enabled,
            url=t_data.url,
            http_method=t_data.http_method,
            headers=t_data.headers
        )
        db.add(tool)
        tools.append(tool)

    await db.flush()
    await db.refresh(agent, ["voice_config", "conversation_config", "tools"])

    # 5. Build ElevenLabs payload & Call
    # For now, a new agent has no docs attached yet.
    payload = build_elevenlabs_agent_payload(
        agent, agent.voice_config, agent.conversation_config, agent.tools,
        workspace_id=workspace.id,
        knowledge_documents=[]
    )
    
    try:
        from app.services.elevenlabs_client import ElevenLabsClient
        async with ElevenLabsClient() as client:
            resp = await client.create_agent(payload)
            agent.elevenlabs_agent_id = resp["agent_id"]
            agent.status = AgentStatus.live
            
            await log_action(
                db, workspace.id, "agent.created", "agent", agent.id, actor_user_id=user.id
            )
            
            await db.commit()
    except Exception as e:
        await db.rollback()
        raise e

    return agent

async def get_agent(db: AsyncSession, workspace_id: UUID, agent_id: UUID) -> Agent:
    stmt = (
        select(Agent)
        .where(
            Agent.id == agent_id,
            Agent.workspace_id == workspace_id,
            Agent.deleted_at.is_(None)
        )
        .options(
            selectinload(Agent.voice_config),
            selectinload(Agent.conversation_config),
            selectinload(Agent.tools)
        )
    )
    result = await db.execute(stmt)
    agent = result.scalar_one_or_none()
    if not agent:
        raise NotFoundError("Agent", str(agent_id))
    await _attach_agent_assignment_fields(db, [agent])
    return agent

async def list_agents(db: AsyncSession, workspace_id: UUID) -> list[Agent]:
    stmt = (
        select(Agent)
        .where(
            Agent.workspace_id == workspace_id,
            Agent.deleted_at.is_(None)
        )
        .order_by(Agent.created_at.desc())
    )
    result = await db.execute(stmt)
    agents = list(result.scalars().all())
    await _attach_agent_assignment_fields(db, agents)
    return agents

async def update_agent(db: AsyncSession, workspace: Workspace, agent: Agent, data: AgentUpdate) -> Agent:
    campaign = await get_active_campaign(db, agent)
    if campaign:
        raise ConflictError(f"Cannot edit agent while it is active in '{campaign.name}'. Pause the campaign first.")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(agent, field, value)

    await db.flush()
    
    # Sync to ElevenLabs
    from app.models.knowledge import KnowledgeDocument
    from app.models.campaign import Campaign
    kb_stmt = select(KnowledgeDocument).join(Campaign).where(Campaign.agent_id == agent.id)
    kb_docs = (await db.execute(kb_stmt)).scalars().all()

    payload = build_elevenlabs_agent_payload(
        agent, agent.voice_config, agent.conversation_config, agent.tools,
        workspace_id=workspace.id,
        knowledge_documents=kb_docs
    )
    
    from app.services.elevenlabs_client import ElevenLabsClient
    async with ElevenLabsClient() as client:
        await client.update_agent(agent.elevenlabs_agent_id, payload)
    
    await log_action(
        db, workspace.id, "agent.updated", "agent", agent.id, actor_user_id=None # Add actor_user_id if service signature updated
    )
    
    await db.commit()
    await db.refresh(agent)
    return agent

async def update_voice_config(db: AsyncSession, workspace: Workspace, agent: Agent, data: VoiceConfigCreate) -> AgentVoiceConfig:
    campaign = await get_active_campaign(db, agent)
    if campaign:
        raise ConflictError(f"Cannot edit agent while it is active in '{campaign.name}'. Pause the campaign first.")

    for field, value in data.model_dump().items():
        setattr(agent.voice_config, field, value)

    await db.flush()
    
    # Sync to ElevenLabs
    from app.models.knowledge import KnowledgeDocument
    from app.models.campaign import Campaign
    kb_stmt = select(KnowledgeDocument).join(Campaign).where(Campaign.agent_id == agent.id)
    kb_docs = (await db.execute(kb_stmt)).scalars().all()

    payload = build_elevenlabs_agent_payload(
        agent, agent.voice_config, agent.conversation_config, agent.tools,
        workspace_id=workspace.id,
        knowledge_documents=kb_docs
    )
    
    from app.services.elevenlabs_client import ElevenLabsClient
    async with ElevenLabsClient() as client:
        await client.update_agent(agent.elevenlabs_agent_id, payload)
    
    await db.commit()
    await db.refresh(agent.voice_config)
    return agent.voice_config

async def update_conversation_config(db: AsyncSession, workspace: Workspace, agent: Agent, data: ConversationConfigCreate) -> AgentConversationConfig:
    campaign = await get_active_campaign(db, agent)
    if campaign:
        raise ConflictError(f"Cannot edit agent while it is active in '{campaign.name}'. Pause the campaign first.")

    for field, value in data.model_dump().items():
        setattr(agent.conversation_config, field, value)

    await db.flush()
    
    # Sync to ElevenLabs
    from app.models.knowledge import KnowledgeDocument
    from app.models.campaign import Campaign
    kb_stmt = select(KnowledgeDocument).join(Campaign).where(Campaign.agent_id == agent.id)
    kb_docs = (await db.execute(kb_stmt)).scalars().all()

    payload = build_elevenlabs_agent_payload(
        agent, agent.voice_config, agent.conversation_config, agent.tools,
        workspace_id=workspace.id,
        knowledge_documents=kb_docs
    )
    
    from app.services.elevenlabs_client import ElevenLabsClient
    async with ElevenLabsClient() as client:
        await client.update_agent(agent.elevenlabs_agent_id, payload)
    
    await db.commit()
    await db.refresh(agent.conversation_config)
    return agent.conversation_config

async def add_tool(db: AsyncSession, workspace: Workspace, agent: Agent, data: AgentToolCreate) -> AgentTool:
    campaign = await get_active_campaign(db, agent)
    if campaign:
        raise ConflictError(f"Cannot edit agent while it is active in '{campaign.name}'. Pause the campaign first.")

    tool = AgentTool(
        agent_id=agent.id,
        **data.model_dump()
    )
    db.add(tool)
    await db.flush()
    await db.refresh(agent, ["tools"])
    
    # Sync to ElevenLabs
    from app.models.knowledge import KnowledgeDocument
    from app.models.campaign import Campaign
    kb_stmt = select(KnowledgeDocument).join(Campaign).where(Campaign.agent_id == agent.id)
    kb_docs = (await db.execute(kb_stmt)).scalars().all()

    payload = build_elevenlabs_agent_payload(
        agent, agent.voice_config, agent.conversation_config, agent.tools,
        workspace_id=workspace.id,
        knowledge_documents=kb_docs
    )
    
    from app.services.elevenlabs_client import ElevenLabsClient
    async with ElevenLabsClient() as client:
        await client.update_agent(agent.elevenlabs_agent_id, payload)
    
    await db.commit()
    await db.refresh(tool)
    return tool

async def update_tool(db: AsyncSession, workspace: Workspace, agent: Agent, tool_id: UUID, data: AgentToolCreate) -> AgentTool:
    campaign = await get_active_campaign(db, agent)
    if campaign:
        raise ConflictError(f"Cannot edit agent while it is active in '{campaign.name}'. Pause the campaign first.")

    # Find tool
    tool = next((t for t in agent.tools if t.id == tool_id), None)
    if not tool:
        raise NotFoundError("Tool", str(tool_id))

    for field, value in data.model_dump().items():
        setattr(tool, field, value)

    await db.flush()
    
    # Sync to ElevenLabs
    from app.models.knowledge import KnowledgeDocument
    from app.models.campaign import Campaign
    kb_stmt = select(KnowledgeDocument).join(Campaign).where(Campaign.agent_id == agent.id)
    kb_docs = (await db.execute(kb_stmt)).scalars().all()

    payload = build_elevenlabs_agent_payload(
        agent, agent.voice_config, agent.conversation_config, agent.tools,
        workspace_id=workspace.id,
        knowledge_documents=kb_docs
    )
    
    from app.services.elevenlabs_client import ElevenLabsClient
    async with ElevenLabsClient() as client:
        await client.update_agent(agent.elevenlabs_agent_id, payload)
    
    await db.commit()
    await db.refresh(tool)
    return tool

async def delete_tool(db: AsyncSession, workspace: Workspace, agent: Agent, tool_id: UUID) -> None:
    campaign = await get_active_campaign(db, agent)
    if campaign:
        raise ConflictError(f"Cannot edit agent while it is active in '{campaign.name}'. Pause the campaign first.")

    # Find tool
    tool = next((t for t in agent.tools if t.id == tool_id), None)
    if not tool:
        raise NotFoundError("Tool", str(tool_id))

    await db.delete(tool)
    await db.flush()
    await db.refresh(agent, ["tools"])
    
    # Sync to ElevenLabs
    from app.models.knowledge import KnowledgeDocument
    from app.models.campaign import Campaign
    kb_stmt = select(KnowledgeDocument).join(Campaign).where(Campaign.agent_id == agent.id)
    kb_docs = (await db.execute(kb_stmt)).scalars().all()

    payload = build_elevenlabs_agent_payload(
        agent, agent.voice_config, agent.conversation_config, agent.tools,
        workspace_id=workspace.id,
        knowledge_documents=kb_docs
    )
    
    from app.services.elevenlabs_client import ElevenLabsClient
    async with ElevenLabsClient() as client:
        await client.update_agent(agent.elevenlabs_agent_id, payload)
    
    await db.commit()

async def delete_agent(db: AsyncSession, workspace: Workspace, agent: Agent) -> None:
    campaign = await get_active_campaign(db, agent)
    if campaign:
        raise ConflictError(f"Cannot delete agent while it is active in '{campaign.name}'. Pause the campaign first.")

    agent.deleted_at = datetime.utcnow()
    
    if agent.elevenlabs_agent_id:
        from app.services.elevenlabs_client import ElevenLabsClient
        try:
            async with ElevenLabsClient() as client:
                await client.delete_agent(agent.elevenlabs_agent_id)
        except Exception:
            # We still delete locally even if EL delete fails (e.g. already deleted in EL)
            pass
    
    await log_action(
        db, workspace.id, "agent.deleted", "agent", agent.id
    )
    
    await db.commit()


async def _attach_agent_assignment_fields(
    db: AsyncSession,
    agents: list[Agent],
) -> None:
    if not agents:
        return

    agent_ids = [agent.id for agent in agents]
    campaigns_result = await db.execute(
        select(Campaign)
        .where(Campaign.agent_id.in_(agent_ids))
        .order_by(Campaign.updated_at.desc(), Campaign.created_at.desc())
    )
    campaigns = list(campaigns_result.scalars().all())

    campaigns_by_agent: dict[UUID, list[Campaign]] = {}
    for campaign in campaigns:
        if campaign.agent_id is None:
            continue
        campaigns_by_agent.setdefault(campaign.agent_id, []).append(campaign)

    for agent in agents:
        active_campaign, assigned_campaign = _resolve_agent_campaign_assignment(
            campaigns_by_agent.get(agent.id, [])
        )
        agent.active_campaign_id = active_campaign.id if active_campaign else None
        agent.active_campaign_name = active_campaign.name if active_campaign else None
        agent.assigned_campaign_id = assigned_campaign.id if assigned_campaign else None
        agent.assigned_campaign_name = assigned_campaign.name if assigned_campaign else None
        agent.assigned_campaign_status = assigned_campaign.status if assigned_campaign else None


def _resolve_agent_campaign_assignment(
    campaigns: list[Campaign],
) -> tuple[Campaign | None, Campaign | None]:
    visible_campaigns = [campaign for campaign in campaigns if campaign.deleted_at is None]
    if not visible_campaigns:
        return None, None

    ordered_campaigns = sorted(
        visible_campaigns,
        key=lambda campaign: (
            _campaign_datetime_value(campaign.updated_at or campaign.created_at),
            _campaign_datetime_value(campaign.created_at),
        ),
        reverse=True,
    )

    active_campaign = next(
        (
            campaign
            for campaign in ordered_campaigns
            if campaign.status in ACTIVE_CAMPAIGN_STATUSES
        ),
        None,
    )
    assigned_campaign = active_campaign or ordered_campaigns[0]
    return active_campaign, assigned_campaign


def _campaign_datetime_value(value: datetime | None) -> float:
    if value is None:
        return float("-inf")
    return value.timestamp()
