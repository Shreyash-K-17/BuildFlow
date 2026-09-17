"""global case-insensitive email uniqueness

Revision ID: e2ab34e3b196
Revises: 4aea9370c837
Create Date: 2026-09-17 17:50:22.210756

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e2ab34e3b196'
down_revision = '4aea9370c837'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('uq_user_organization_email', type_='unique')
        batch_op.create_index('ix_users_lower_email', [sa.literal_column('lower(email)')], unique=True)


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index('ix_users_lower_email')
        batch_op.create_unique_constraint('uq_user_organization_email', ['organization_id', 'email'])
