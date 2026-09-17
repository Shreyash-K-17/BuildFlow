"""add composite index on attendance

Revision ID: a1b2c3d4e5f6
Revises: d8a9b2c34e5f
Create Date: 2026-09-17 19:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'd8a9b2c34e5f'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('attendance', schema=None) as batch_op:
        batch_op.create_index(
            'ix_attendance_project_date_id',
            ['project_id', sa.literal_column('attendance_date DESC'), sa.literal_column('id DESC')],
            unique=False,
        )


def downgrade():
    with op.batch_alter_table('attendance', schema=None) as batch_op:
        batch_op.drop_index('ix_attendance_project_date_id')
