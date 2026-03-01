"""add company_directors table

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-03-01 13:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "b2c3d4e5f6a1"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = inspect(bind).get_table_names()

    if "company_directors" not in existing:
        op.create_table(
            "company_directors",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("ico", sa.String(8), sa.ForeignKey("companies.ico"), nullable=False),
            sa.Column("organ_name", sa.Text, nullable=True),
            sa.Column("organ_type", sa.String(50), nullable=True),
            sa.Column("organ_datum_zapisu", sa.Date, nullable=True),
            sa.Column("organ_datum_vymazu", sa.Date, nullable=True),
            sa.Column("zpusob_jednani", sa.Text, nullable=True),
            sa.Column("titul_pred", sa.Text, nullable=True),
            sa.Column("jmeno", sa.Text, nullable=True),
            sa.Column("prijmeni", sa.Text, nullable=True),
            sa.Column("titul_za", sa.Text, nullable=True),
            sa.Column("datum_narozeni", sa.Date, nullable=True),
            sa.Column("statni_obcanstvi", sa.String(5), nullable=True),
            sa.Column("obchodni_jmeno", sa.Text, nullable=True),
            sa.Column("funkce", sa.Text, nullable=True),
            sa.Column("vznik_funkce", sa.Date, nullable=True),
            sa.Column("zanik_funkce", sa.Date, nullable=True),
            sa.Column("datum_zapisu", sa.Date, nullable=True),
            sa.Column("datum_vymazu", sa.Date, nullable=True),
            sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_company_directors_ico", "company_directors", ["ico"])


def downgrade() -> None:
    op.drop_index("ix_company_directors_ico", table_name="company_directors")
    op.drop_table("company_directors")
