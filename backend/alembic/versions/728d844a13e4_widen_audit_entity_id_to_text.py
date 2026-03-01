"""widen_audit_entity_id_to_text

Revision ID: 728d844a13e4
Revises: c3d4e5f6a7b2
Create Date: 2026-03-01 19:45:49.003780

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '728d844a13e4'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Widen audit_logs.entity_id from INTEGER to TEXT so ICO strings fit."""
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.alter_column(
            'entity_id',
            existing_type=sa.Integer(),
            type_=sa.Text(),
            existing_nullable=False,
        )


def downgrade() -> None:
    """Revert audit_logs.entity_id to INTEGER."""
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.alter_column(
            'entity_id',
            existing_type=sa.Text(),
            type_=sa.Integer(),
            existing_nullable=False,
        )
