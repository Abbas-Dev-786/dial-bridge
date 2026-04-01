from fastapi import APIRouter

router = APIRouter()

from app.api.v1 import auth, workspaces, agents, phone_numbers, campaigns, knowledge, contacts, integrations, calls, analytics, platform

router.include_router(auth.router, prefix="/auth", tags=["Auth"])
router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])
router.include_router(agents.router, prefix="/workspaces", tags=["Agents"])
router.include_router(phone_numbers.router, prefix="/workspaces", tags=["Phone Numbers"])
router.include_router(campaigns.router, prefix="/workspaces", tags=["Campaigns"])
router.include_router(knowledge.router, prefix="/workspaces", tags=["Knowledge Base"])
router.include_router(contacts.router, prefix="/workspaces", tags=["Contacts"])
router.include_router(integrations.router, prefix="/workspaces", tags=["Integrations"])
router.include_router(calls.router, prefix="/workspaces", tags=["Calls"])
router.include_router(analytics.router, prefix="/workspaces", tags=["Analytics"])
router.include_router(platform.router, prefix="/workspaces", tags=["Platform"])

