"""remove_elevenlabs_key_from_workspaces

Revision ID: 0e2b484560bb
Revises: 25ac82ecf2b5
Create Date: 2026-04-04 08:42:54.283905

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0e2b484560bb'
down_revision: Union[str, None] = '25ac82ecf2b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("workspaces", "elevenlabs_api_key_enc")
    op.drop_column("workspaces", "elevenlabs_webhook_secret_enc")


def downgrade() -> None:
    op.add_column("workspaces", sa.Column("elevenlabs_api_key_enc", sa.Text(), nullable=True))
    op.add_column("workspaces", sa.Column("elevenlabs_webhook_secret_enc", sa.Text(), nullable=True))
