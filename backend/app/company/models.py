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
