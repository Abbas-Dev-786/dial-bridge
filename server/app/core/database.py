"""
Compatibility shim.

Historically this module created a separate SQLAlchemy engine/metadata that
diverged from `app.database`. It now re-exports the canonical async database
objects to avoid split metadata and config drift.
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import Base, AsyncSessionLocal, engine

SessionLocal = AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as db:
        yield db

