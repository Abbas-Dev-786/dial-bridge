"""add_agent_generation_flags_to_campaigns

Revision ID: 25ac82ecf2b5
Revises: 2fa7d430f250
Create Date: 2026-04-02 18:16:22.743873

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '25ac82ecf2b5'
down_revision: Union[str, None] = '2fa7d430f250'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("campaigns", sa.Column("agent_was_generated",  sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("campaigns", sa.Column("agent_generation_failed", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("campaigns", "agent_generation_failed")
    op.drop_column("campaigns", "agent_was_generated")
