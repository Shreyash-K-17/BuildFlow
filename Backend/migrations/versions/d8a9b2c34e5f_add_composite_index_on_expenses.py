"""add composite index on expenses

Revision ID: d8a9b2c34e5f
Revises: c7f8a91b2c34
Create Date: 2026-09-17 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd8a9b2c34e5f'
down_revision = 'c7f8a91b2c34'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('expenses', schema=None) as batch_op:
        batch_op.create_index(
            'ix_expenses_project_date_id',
            ['project_id', sa.literal_column('expense_date DESC'), sa.literal_column('id DESC')],
            unique=False,
        )


def downgrade():
    with op.batch_alter_table('expenses', schema=None) as batch_op:
        batch_op.drop_index('ix_expenses_project_date_id')
