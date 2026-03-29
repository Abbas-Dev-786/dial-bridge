from fastapi import APIRouter
from app.api.v1 import auth, workspaces

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])
