from fastapi import APIRouter

router = APIRouter()

from app.api.v1 import auth, workspaces, agents, phone_numbers, campaigns

router.include_router(auth.router, prefix="/auth", tags=["Auth"])
router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])
router.include_router(agents.router, prefix="/workspaces", tags=["Agents"])
router.include_router(phone_numbers.router, prefix="/workspaces", tags=["Phone Numbers"])
router.include_router(campaigns.router, prefix="/workspaces", tags=["Campaigns"])
