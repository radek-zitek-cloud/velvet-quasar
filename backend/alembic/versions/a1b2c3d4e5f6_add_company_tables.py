"""add company tables and credit_cases company_ico fk

Revision ID: a1b2c3d4e5f6
Revises: 17d65fb8fabc
Create Date: 2026-03-01 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "17d65fb8fabc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = inspect(bind).get_table_names()

    if "companies" not in existing:
        op.create_table(
            "companies",
            sa.Column("ico", sa.String(8), primary_key=True),
            sa.Column("obchodni_jmeno", sa.Text, nullable=True),
            sa.Column("dic", sa.String(15), nullable=True),
            sa.Column("pravni_forma", sa.String(10), nullable=True),
            sa.Column("datum_vzniku", sa.Date, nullable=True),
            sa.Column("datum_zaniku", sa.Date, nullable=True),
            sa.Column("insolvency_flag", sa.Boolean, nullable=False, server_default="0"),
            sa.Column("last_refreshed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    if "company_registry_data" not in existing:
        op.create_table(
            "company_registry_data",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("ico", sa.String(8), sa.ForeignKey("companies.ico"), nullable=False),
            sa.Column("registry_code", sa.String(20), nullable=False),
            sa.Column("raw_json", sa.Text, nullable=False, server_default="{}"),
            sa.Column("http_status", sa.Integer, nullable=False),
            sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("ico", "registry_code", name="uq_ico_registry"),
        )
        op.create_index("ix_company_registry_data_ico", "company_registry_data", ["ico"])

    credit_case_cols = [c["name"] for c in inspect(bind).get_columns("credit_cases")]
    if "company_ico" not in credit_case_cols:
        with op.batch_alter_table("credit_cases") as batch_op:
            batch_op.add_column(
                sa.Column("company_ico", sa.String(8), sa.ForeignKey("companies.ico"), nullable=True)
            )


def downgrade() -> None:
    with op.batch_alter_table("credit_cases") as batch_op:
        batch_op.drop_column("company_ico")

    op.drop_index("ix_company_registry_data_ico", table_name="company_registry_data")
    op.drop_table("company_registry_data")
    op.drop_table("companies")
