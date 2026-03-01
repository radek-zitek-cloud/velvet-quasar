from datetime import datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class Company(Base):
    __tablename__ = "companies"

    ico: Mapped[str] = mapped_column(String(8), primary_key=True)
    obchodni_jmeno: Mapped[str | None] = mapped_column(Text, nullable=True)
    dic: Mapped[str | None] = mapped_column(String(15), nullable=True)
    pravni_forma: Mapped[str | None] = mapped_column(String(10), nullable=True)
    datum_vzniku: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    datum_zaniku: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    insolvency_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    last_refreshed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class CompanyRegistryData(Base):
    __tablename__ = "company_registry_data"
    __table_args__ = (UniqueConstraint("ico", "registry_code", name="uq_ico_registry"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ico: Mapped[str] = mapped_column(String(8), ForeignKey("companies.ico"), nullable=False, index=True)
    registry_code: Mapped[str] = mapped_column(String(20), nullable=False)
    raw_json: Mapped[str] = mapped_column(Text, default="{}")
    http_status: Mapped[int] = mapped_column(Integer, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class CompanyDirector(Base):
    __tablename__ = "company_directors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ico: Mapped[str] = mapped_column(String(8), ForeignKey("companies.ico"), nullable=False, index=True)

    # Organ-level fields
    organ_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    organ_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    organ_datum_zapisu: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    organ_datum_vymazu: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    zpusob_jednani: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Person fields (natural person)
    titul_pred: Mapped[str | None] = mapped_column(Text, nullable=True)
    jmeno: Mapped[str | None] = mapped_column(Text, nullable=True)
    prijmeni: Mapped[str | None] = mapped_column(Text, nullable=True)
    titul_za: Mapped[str | None] = mapped_column(Text, nullable=True)
    datum_narozeni: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    statni_obcanstvi: Mapped[str | None] = mapped_column(String(5), nullable=True)

    # Legal entity fields
    obchodni_jmeno: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Role fields
    funkce: Mapped[str | None] = mapped_column(Text, nullable=True)
    vznik_funkce: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    zanik_funkce: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    datum_zapisu: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    datum_vymazu: Mapped[datetime | None] = mapped_column(Date, nullable=True)

    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # FK into normalized tables (additive — embedded fields kept for backward compat)
    person_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("natural_persons.id"), nullable=True)
    director_ico: Mapped[str | None] = mapped_column(String(8), ForeignKey("companies.ico"), nullable=True)


class NaturalPerson(Base):
    __tablename__ = "natural_persons"
    __table_args__ = (UniqueConstraint("jmeno", "prijmeni", "datum_narozeni", name="uq_person_identity"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    jmeno: Mapped[str | None] = mapped_column(Text, nullable=True)
    prijmeni: Mapped[str | None] = mapped_column(Text, nullable=True)
    titul_pred: Mapped[str | None] = mapped_column(Text, nullable=True)
    titul_za: Mapped[str | None] = mapped_column(Text, nullable=True)
    datum_narozeni: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    statni_obcanstvi: Mapped[str | None] = mapped_column(String(5), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class Address(Base):
    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'COMPANY' or 'PERSON'
    entity_ico: Mapped[str | None] = mapped_column(String(8), ForeignKey("companies.ico"), nullable=True, index=True)
    entity_person_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("natural_persons.id"), nullable=True, index=True)
    typ_adresy: Mapped[str | None] = mapped_column(String(20), nullable=True)
    nazev_ulice: Mapped[str | None] = mapped_column(Text, nullable=True)
    cislo_domovni: Mapped[str | None] = mapped_column(String(20), nullable=True)
    nazev_obce: Mapped[str | None] = mapped_column(Text, nullable=True)
    psc: Mapped[str | None] = mapped_column(String(10), nullable=True)
    kod_statu: Mapped[str | None] = mapped_column(String(5), nullable=True)
    textova_adresa: Mapped[str | None] = mapped_column(Text, nullable=True)
    datum_zapisu: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    datum_vymazu: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class CompanyRelationship(Base):
    __tablename__ = "company_relationships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ico: Mapped[str] = mapped_column(String(8), ForeignKey("companies.ico"), nullable=False, index=True)
    related_ico: Mapped[str | None] = mapped_column(String(8), ForeignKey("companies.ico"), nullable=True)
    related_person_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("natural_persons.id"), nullable=True)
    relationship_type: Mapped[str] = mapped_column(String(20), nullable=False)  # 'SPOLECNIK' | 'AKCIONAR'
    podil_hodnota: Mapped[str | None] = mapped_column(Text, nullable=True)
    podil_typ: Mapped[str | None] = mapped_column(String(20), nullable=True)
    vznik_clenstvi: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    zanik_clenstvi: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    datum_zapisu: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    datum_vymazu: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
