"""add order date/status indexes for dashboard analytics

Revision ID: e384cd1b7ee4
Revises: 28fbd4649151
Create Date: 2026-09-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e384cd1b7ee4'
down_revision: Union[str, Sequence[str], None] = '28fbd4649151'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(op.f('ix_orders_placed_at'), 'orders', ['placed_at'], unique=False)
    op.create_index('ix_orders_status_placed_at', 'orders', ['status', 'placed_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_orders_status_placed_at', table_name='orders')
    op.drop_index(op.f('ix_orders_placed_at'), table_name='orders')
