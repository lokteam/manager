"""prompt versioning and review link

Revision ID: 4f922d812f37
Revises: 5e679ce300d1
Create Date: 2025-12-26 20:00:19.147953

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4f922d812f37"
down_revision: Union[str, Sequence[str], None] = "5e679ce300d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
  # 1. Update vacancyreview table
  with op.batch_alter_table("vacancyreview", schema=None) as batch_op:
    batch_op.add_column(sa.Column("prompt_id", sa.Integer(), nullable=True))
    batch_op.add_column(sa.Column("prompt_version", sa.Integer(), nullable=True))

  # 2. Recreate prompt table with composite PK
  # Drop existing index from prompt to avoid name collision in SQLite
  op.execute("DROP INDEX IF EXISTS ix_prompt_name")

  op.rename_table("prompt", "prompt_old")
  op.create_table(
    "prompt",
    sa.Column("id", sa.Integer(), nullable=False),
    sa.Column("version", sa.Integer(), server_default="1", nullable=False),
    sa.Column("user_id", sa.Integer(), nullable=False),
    sa.Column("name", sa.String(), nullable=False),
    sa.Column("description", sa.String(), nullable=True),
    sa.Column("content", sa.String(), nullable=False),
    sa.Column("is_deleted", sa.Boolean(), server_default="0", nullable=False),
    sa.Column(
      "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
    ),
    sa.ForeignKeyConstraint(
      ["user_id"],
      ["user.id"],
    ),
    sa.PrimaryKeyConstraint("id", "version"),
  )
  op.create_index(op.f("ix_prompt_name"), "prompt", ["name"], unique=False)
  op.create_index(op.f("ix_prompt_is_deleted"), "prompt", ["is_deleted"], unique=False)

  op.execute(
    "INSERT INTO prompt (id, user_id, name, description, content) SELECT id, user_id, name, description, content FROM prompt_old"
  )
  op.drop_table("prompt_old")


def downgrade() -> None:
  # 1. Revert vacancyreview
  with op.batch_alter_table("vacancyreview", schema=None) as batch_op:
    batch_op.drop_column("prompt_version")
    batch_op.drop_column("prompt_id")

  # 2. Revert prompt table
  op.execute("DROP INDEX IF EXISTS ix_prompt_name")
  op.execute("DROP INDEX IF EXISTS ix_prompt_is_deleted")
  op.rename_table("prompt", "prompt_old")
  op.create_table(
    "prompt",
    sa.Column("id", sa.Integer(), nullable=False, primary_key=True),
    sa.Column("user_id", sa.Integer(), nullable=False),
    sa.Column("name", sa.String(), nullable=False),
    sa.Column("description", sa.String(), nullable=True),
    sa.Column("content", sa.String(), nullable=False),
    sa.ForeignKeyConstraint(
      ["user_id"],
      ["user.id"],
    ),
  )
  op.create_index(op.f("ix_prompt_name"), "prompt", ["name"], unique=False)
  op.execute(
    "INSERT INTO prompt (id, user_id, name, description, content) SELECT id, user_id, name, description, content FROM prompt_old WHERE version = 1"
  )
  op.drop_table("prompt_old")
