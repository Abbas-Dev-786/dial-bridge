from uuid import UUID
from datetime import datetime
from sqlalchemy import select, and_, exists
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.agent import Agent, AgentVoiceConfig, AgentConversationConfig, AgentTool
from app.models.workspace import Workspace
from app.models.user import User
from app.schemas.agent import AgentCreate, AgentUpdate, VoiceConfigCreate, ConversationConfigCreate, AgentToolCreate
from app.services.elevenlabs_client import get_elevenlabs_client
from app.enums import AgentStatus, ToolType
from app.exceptions import NotFoundError, ConflictError, ElevenLabsError
from app.utils.audit import log_action

def build_elevenlabs_agent_payload(
    agent: Agent,
    voice_config: AgentVoiceConfig,
    conversation_config: AgentConversationConfig,
    tools: list[AgentTool],
) -> dict:
    """
    Builds the JSON payload for ElevenLabs POST/PATCH /convai/agents.
    Reference: https://elevenlabs.io/docs/conversational-ai/api-reference
    """
    payload = {
        "name": agent.name,
        "conversation_config": {
            "agent": {
                "prompt": {
                    "prompt": agent.system_prompt or "",
                    "llm": agent.llm_model,
                    "temperature": float(agent.temperature),
                    "max_tokens": agent.max_tokens,
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

    return payload

async def get_active_campaign(db: AsyncSession, agent: Agent):
    """
    Query campaigns where agent_id = agent.id AND status IN ('live','scheduled') AND deleted_at IS NULL
    Returns None if agent is free.
    Placeholder until Phase 4.
    """
    return None

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
    client = await get_elevenlabs_client(workspace)
    payload = build_elevenlabs_agent_payload(agent, agent.voice_config, agent.conversation_config, agent.tools)
    
    try:
        async with client:
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
    # TODO: Left join campaigns in Phase 4
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def update_agent(db: AsyncSession, workspace: Workspace, agent: Agent, data: AgentUpdate) -> Agent:
    campaign = await get_active_campaign(db, agent)
    if campaign:
        raise ConflictError(f"Cannot edit agent while it is active in '{campaign.name}'. Pause the campaign first.")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(agent, field, value)

    await db.flush()
    
    # Sync to ElevenLabs
    client = await get_elevenlabs_client(workspace)
    payload = build_elevenlabs_agent_payload(agent, agent.voice_config, agent.conversation_config, agent.tools)
    
    async with client:
        await client.update_agent(agent.elevenlabs_agent_id, payload)
    
    await log_action(
        db, workspace.id, "agent.updated", "agent", agent.id, actor_user_id=None # Add actor_user_id if service signature updated
    )
    
    await db.commit()
    return agent

async def update_voice_config(db: AsyncSession, workspace: Workspace, agent: Agent, data: VoiceConfigCreate) -> AgentVoiceConfig:
    campaign = await get_active_campaign(db, agent)
    if campaign:
        raise ConflictError(f"Cannot edit agent while it is active in '{campaign.name}'. Pause the campaign first.")

    for field, value in data.model_dump().items():
        setattr(agent.voice_config, field, value)

    await db.flush()
    
    # Sync to ElevenLabs
    client = await get_elevenlabs_client(workspace)
    payload = build_elevenlabs_agent_payload(agent, agent.voice_config, agent.conversation_config, agent.tools)
    
    async with client:
        await client.update_agent(agent.elevenlabs_agent_id, payload)
    
    await db.commit()
    return agent.voice_config

async def update_conversation_config(db: AsyncSession, workspace: Workspace, agent: Agent, data: ConversationConfigCreate) -> AgentConversationConfig:
    campaign = await get_active_campaign(db, agent)
    if campaign:
        raise ConflictError(f"Cannot edit agent while it is active in '{campaign.name}'. Pause the campaign first.")

    for field, value in data.model_dump().items():
        setattr(agent.conversation_config, field, value)

    await db.flush()
    
    # Sync to ElevenLabs
    client = await get_elevenlabs_client(workspace)
    payload = build_elevenlabs_agent_payload(agent, agent.voice_config, agent.conversation_config, agent.tools)
    
    async with client:
        await client.update_agent(agent.elevenlabs_agent_id, payload)
    
    await db.commit()
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
    client = await get_elevenlabs_client(workspace)
    payload = build_elevenlabs_agent_payload(agent, agent.voice_config, agent.conversation_config, agent.tools)
    
    async with client:
        await client.update_agent(agent.elevenlabs_agent_id, payload)
    
    await db.commit()
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
    client = await get_elevenlabs_client(workspace)
    payload = build_elevenlabs_agent_payload(agent, agent.voice_config, agent.conversation_config, agent.tools)
    
    async with client:
        await client.update_agent(agent.elevenlabs_agent_id, payload)
    
    await db.commit()
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
    client = await get_elevenlabs_client(workspace)
    payload = build_elevenlabs_agent_payload(agent, agent.voice_config, agent.conversation_config, agent.tools)
    
    async with client:
        await client.update_agent(agent.elevenlabs_agent_id, payload)
    
    await db.commit()

async def delete_agent(db: AsyncSession, workspace: Workspace, agent: Agent) -> None:
    campaign = await get_active_campaign(db, agent)
    if campaign:
        raise ConflictError(f"Cannot delete agent while it is active in '{campaign.name}'. Pause the campaign first.")

    agent.deleted_at = datetime.utcnow()
    
    if agent.elevenlabs_agent_id:
        client = await get_elevenlabs_client(workspace)
        try:
            async with client:
                await client.delete_agent(agent.elevenlabs_agent_id)
        except Exception:
            # We still delete locally even if EL delete fails (e.g. already deleted in EL)
            pass
    
    await log_action(
        db, workspace.id, "agent.deleted", "agent", agent.id
    )
    
    await db.commit()
