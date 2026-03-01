"""add natural_persons, addresses, company_relationships tables + FK columns on company_directors

Revision ID: c3d4e5f6a7b2
Revises: b2c3d4e5f6a1
Create Date: 2026-03-01 14:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "c3d4e5f6a7b2"
down_revision: Union[str, None] = "b2c3d4e5f6a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = inspect(bind).get_table_names()

    if "natural_persons" not in existing:
        op.create_table(
            "natural_persons",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("jmeno", sa.Text, nullable=True),
            sa.Column("prijmeni", sa.Text, nullable=True),
            sa.Column("titul_pred", sa.Text, nullable=True),
            sa.Column("titul_za", sa.Text, nullable=True),
            sa.Column("datum_narozeni", sa.Date, nullable=True),
            sa.Column("statni_obcanstvi", sa.String(5), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("jmeno", "prijmeni", "datum_narozeni", name="uq_person_identity"),
        )
        op.create_index("ix_natural_persons_identity", "natural_persons", ["jmeno", "prijmeni", "datum_narozeni"])

    if "addresses" not in existing:
        op.create_table(
            "addresses",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("entity_type", sa.String(10), nullable=False),
            sa.Column("entity_ico", sa.String(8), sa.ForeignKey("companies.ico"), nullable=True),
            sa.Column("entity_person_id", sa.Integer, sa.ForeignKey("natural_persons.id"), nullable=True),
            sa.Column("typ_adresy", sa.String(20), nullable=True),
            sa.Column("nazev_ulice", sa.Text, nullable=True),
            sa.Column("cislo_domovni", sa.String(20), nullable=True),
            sa.Column("nazev_obce", sa.Text, nullable=True),
            sa.Column("psc", sa.String(10), nullable=True),
            sa.Column("kod_statu", sa.String(5), nullable=True),
            sa.Column("textova_adresa", sa.Text, nullable=True),
            sa.Column("datum_zapisu", sa.Date, nullable=True),
            sa.Column("datum_vymazu", sa.Date, nullable=True),
            sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_addresses_entity_ico", "addresses", ["entity_ico"])
        op.create_index("ix_addresses_entity_person_id", "addresses", ["entity_person_id"])

    if "company_relationships" not in existing:
        op.create_table(
            "company_relationships",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("ico", sa.String(8), sa.ForeignKey("companies.ico"), nullable=False),
            sa.Column("related_ico", sa.String(8), sa.ForeignKey("companies.ico"), nullable=True),
            sa.Column("related_person_id", sa.Integer, sa.ForeignKey("natural_persons.id"), nullable=True),
            sa.Column("relationship_type", sa.String(20), nullable=False),
            sa.Column("podil_hodnota", sa.Text, nullable=True),
            sa.Column("podil_typ", sa.String(20), nullable=True),
            sa.Column("vznik_clenstvi", sa.Date, nullable=True),
            sa.Column("zanik_clenstvi", sa.Date, nullable=True),
            sa.Column("datum_zapisu", sa.Date, nullable=True),
            sa.Column("datum_vymazu", sa.Date, nullable=True),
            sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_company_relationships_ico", "company_relationships", ["ico"])

    # Additive columns on company_directors — idempotent
    # Note: ForeignKey constraints are omitted here because SQLite batch mode
    # requires named constraints and doesn't enforce FKs at the DB level anyway.
    dir_cols = [c["name"] for c in inspect(bind).get_columns("company_directors")]
    if "person_id" not in dir_cols:
        with op.batch_alter_table("company_directors") as batch:
            batch.add_column(sa.Column("person_id", sa.Integer, nullable=True))
    if "director_ico" not in dir_cols:
        with op.batch_alter_table("company_directors") as batch:
            batch.add_column(sa.Column("director_ico", sa.String(8), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("company_directors") as batch:
        batch.drop_column("director_ico")
        batch.drop_column("person_id")
    op.drop_index("ix_company_relationships_ico", table_name="company_relationships")
    op.drop_table("company_relationships")
    op.drop_index("ix_addresses_entity_person_id", table_name="addresses")
    op.drop_index("ix_addresses_entity_ico", table_name="addresses")
    op.drop_table("addresses")
    op.drop_index("ix_natural_persons_identity", table_name="natural_persons")
    op.drop_table("natural_persons")
