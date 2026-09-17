"""add composite index on audit_logs

Revision ID: c7f8a91b2c34
Revises: e2ab34e3b196
Create Date: 2026-09-17 18:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c7f8a91b2c34'
down_revision = 'e2ab34e3b196'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.create_index(
            'ix_audit_logs_org_created_id',
            ['organization_id', sa.literal_column('created_at DESC'), sa.literal_column('id DESC')],
            unique=False,
        )


def downgrade():
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.drop_index('ix_audit_logs_org_created_id')
