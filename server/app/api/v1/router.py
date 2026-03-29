from fastapi import APIRouter

router = APIRouter()

from app.api.v1 import auth, workspaces

router.include_router(auth.router, prefix="/auth", tags=["Auth"])
router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])
