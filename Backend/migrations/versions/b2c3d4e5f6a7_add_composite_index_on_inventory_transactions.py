"""add composite index on inventory_transactions

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-17 23:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('inventory_transactions', schema=None) as batch_op:
        batch_op.create_index(
            'ix_inventory_transactions_material_id_id',
            ['material_id', sa.literal_column('id DESC')],
            unique=False,
        )


def downgrade():
    with op.batch_alter_table('inventory_transactions', schema=None) as batch_op:
        batch_op.drop_index('ix_inventory_transactions_material_id_id')
