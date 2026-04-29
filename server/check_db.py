import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.workspace import WorkspaceMember

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User.email, WorkspaceMember.workspace_id, WorkspaceMember.accepted_at, WorkspaceMember.role)
            .outerjoin(WorkspaceMember, User.id == WorkspaceMember.user_id)
        )
        for row in result:
            print(row)

if __name__ == "__main__":
    asyncio.run(main())
