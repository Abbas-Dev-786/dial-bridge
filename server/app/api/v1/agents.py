from uuid import UUID
from fastapi import APIRouter, Depends, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import AsyncSessionLocal
from app.dependencies import get_db, get_current_user, get_workspace_member, require_role
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.enums import WorkspaceRole
from app.schemas.agent import (
    AgentCreate, AgentUpdate, AgentResponse, AgentListResponse,
    VoiceConfigCreate, VoiceConfigResponse,
    ConversationConfigCreate, ConversationConfigResponse,
    AgentToolCreate, AgentToolResponse
)
from app.services import agent_service
from app.services.elevenlabs_client import get_elevenlabs_client

router = APIRouter()

# ── Agents ───────────────────────────────────────────────────

@router.get("/{workspace_id}/agents", response_model=list[AgentListResponse])
async def list_agents(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """List all agents in a workspace."""
    agents = await agent_service.list_agents(db, workspace_id)
    return agents

@router.post("/{workspace_id}/agents", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    workspace_id: UUID,
    data: AgentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.editor)),
):
    """Create a new agent and sync with ElevenLabs."""
    agent = await agent_service.create_agent(db, member.workspace, current_user, data)
    return agent

@router.get("/{workspace_id}/agents/{agent_id}", response_model=AgentResponse)
async def get_agent(
    workspace_id: UUID,
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """Get detailed agent configuration."""
    agent = await agent_service.get_agent(db, workspace_id, agent_id)
    return agent

@router.patch("/{workspace_id}/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(
    workspace_id: UUID,
    agent_id: UUID,
    data: AgentUpdate,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.editor)),
):
    """Update agent configuration."""
    agent = await agent_service.get_agent(db, workspace_id, agent_id)
    return await agent_service.update_agent(db, member.workspace, agent, data)

@router.delete("/{workspace_id}/agents/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    workspace_id: UUID,
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.editor)),
):
    """Soft delete agent and delete from ElevenLabs."""
    agent = await agent_service.get_agent(db, workspace_id, agent_id)
    await agent_service.delete_agent(db, member.workspace, agent)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# ── Configs ──────────────────────────────────────────────────

@router.patch("/{workspace_id}/agents/{agent_id}/voice-config", response_model=VoiceConfigResponse)
async def update_voice_config(
    workspace_id: UUID,
    agent_id: UUID,
    data: VoiceConfigCreate,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.editor)),
):
    """Update agent voice settings."""
    agent = await agent_service.get_agent(db, workspace_id, agent_id)
    return await agent_service.update_voice_config(db, member.workspace, agent, data)

@router.patch("/{workspace_id}/agents/{agent_id}/conversation-config", response_model=ConversationConfigResponse)
async def update_conversation_config(
    workspace_id: UUID,
    agent_id: UUID,
    data: ConversationConfigCreate,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.editor)),
):
    """Update agent conversation settings."""
    agent = await agent_service.get_agent(db, workspace_id, agent_id)
    return await agent_service.update_conversation_config(db, member.workspace, agent, data)

# ── Tools ────────────────────────────────────────────────────

@router.post("/{workspace_id}/agents/{agent_id}/tools", response_model=AgentToolResponse, status_code=status.HTTP_201_CREATED)
async def add_tool(
    workspace_id: UUID,
    agent_id: UUID,
    data: AgentToolCreate,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.editor)),
):
    """Add a tool to the agent."""
    agent = await agent_service.get_agent(db, workspace_id, agent_id)
    return await agent_service.add_tool(db, member.workspace, agent, data)

@router.patch("/{workspace_id}/agents/{agent_id}/tools/{tool_id}", response_model=AgentToolResponse)
async def update_tool(
    workspace_id: UUID,
    agent_id: UUID,
    tool_id: UUID,
    data: AgentToolCreate,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.editor)),
):
    """Update a tool definition."""
    agent = await agent_service.get_agent(db, workspace_id, agent_id)
    return await agent_service.update_tool(db, member.workspace, agent, tool_id, data)

@router.delete("/{workspace_id}/agents/{agent_id}/tools/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tool(
    workspace_id: UUID,
    agent_id: UUID,
    tool_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(require_role(WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.editor)),
):
    """Remove a tool from the agent."""
    agent = await agent_service.get_agent(db, workspace_id, agent_id)
    await agent_service.delete_tool(db, member.workspace, agent, tool_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# ── Miscellaneous ───────────────────────────────────────────

@router.get("/{workspace_id}/voices")
async def list_available_voices(
    workspace_id: UUID,
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """List all available ElevenLabs voices for this workspace."""
    from app.services.elevenlabs_client import ElevenLabsClient
    async with ElevenLabsClient() as client:
        return await client.list_voices()

# ── Testing ──────────────────────────────────────────────────

@router.post("/{workspace_id}/agents/{agent_id}/test/session")
async def create_test_session(
    workspace_id: UUID,
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """
    Generate a signed WebRTC session URL for testing the saved agent.
    """
    agent = await agent_service.get_agent(db, workspace_id, agent_id)
    if not agent.elevenlabs_agent_id:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agent has not been synced with ElevenLabs yet."
        )

    from app.services.elevenlabs_client import ElevenLabsClient
    async with ElevenLabsClient() as client:
        return await client.get_conversation_token(agent.elevenlabs_agent_id)

@router.get("/{workspace_id}/agents/{agent_id}/test/conversations/{conversation_id}")
async def get_test_conversation(
    workspace_id: UUID,
    agent_id: UUID,
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """
    Get details for a specific test conversation.
    """
    # Verify agent exists in workspace
    await agent_service.get_agent(db, workspace_id, agent_id)

    from app.services.elevenlabs_client import ElevenLabsClient
    async with ElevenLabsClient() as client:
        data = await client.get_conversation(conversation_id)
        
        # Normalize response for frontend
        return {
            "conversation_id": data.get("conversation_id"),
            "status": data.get("status"),
            "agent_id": data.get("agent_id"),
            "conversation_type": data.get("conversation_type"),
            "start_time_unix_secs": data.get("start_time_unix_secs"),
            "duration_seconds": data.get("duration_seconds"),
            "transcript": data.get("transcript", []),
            "metadata": data.get("metadata", {}),
            "analysis": data.get("analysis", {}),
            "audio_url": f"/api/v1/workspaces/{workspace_id}/agents/{agent_id}/test/conversations/{conversation_id}/audio"
        }

@router.get("/{workspace_id}/agents/{agent_id}/test/conversations/{conversation_id}/audio")
async def get_test_conversation_audio(
    workspace_id: UUID,
    agent_id: UUID,
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    member: WorkspaceMember = Depends(get_workspace_member),
):
    """
    Proxy the finalized conversation recording from ElevenLabs.
    """
    # Verify agent exists in workspace
    await agent_service.get_agent(db, workspace_id, agent_id)

    from app.services.elevenlabs_client import ElevenLabsClient
    async with ElevenLabsClient() as client:
        audio_content = await client.get_conversation_audio(conversation_id)
        return Response(
            content=audio_content,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f"attachment; filename=conversation_{conversation_id}.mp3"
            }
        )
