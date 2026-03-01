import json
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.company.models import Company, CompanyRegistryData

logger = logging.getLogger(__name__)


def _extract_normalized(root_json: dict) -> dict:
    """Pull key fields from the ROOT ARES response."""
    return {
        "obchodni_jmeno": root_json.get("obchodniJmeno"),
        "dic": root_json.get("dic"),
        "pravni_forma": root_json.get("pravniForma"),
        "datum_vzniku": _parse_date(root_json.get("datumVzniku")),
        "datum_zaniku": _parse_date(root_json.get("datumZaniku")),
    }


def _parse_date(value: str | None):
    if not value:
        return None
    try:
        return datetime.strptime(value[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


async def upsert_company(
    ico: str,
    ares_results: dict[str, tuple[int, dict]],
    db: AsyncSession,
) -> Company:
    """Upsert company + registry rows from ARES fetch results."""
    now = datetime.now(timezone.utc)

    root_status, root_json = ares_results.get("ROOT", (0, {}))
    ceu_status, _ = ares_results.get("CEU", (0, {}))

    normalized = _extract_normalized(root_json) if root_status == 200 else {}
    insolvency_flag = ceu_status == 200

    # Upsert company row
    result = await db.execute(select(Company).where(Company.ico == ico))
    company = result.scalar_one_or_none()

    if company is None:
        company = Company(ico=ico, **normalized, insolvency_flag=insolvency_flag, last_refreshed_at=now)
        db.add(company)
    else:
        for k, v in normalized.items():
            setattr(company, k, v)
        company.insolvency_flag = insolvency_flag
        company.last_refreshed_at = now

    # Upsert registry rows (delete+insert for simplicity with SQLite)
    for code, (status, data) in ares_results.items():
        result = await db.execute(
            select(CompanyRegistryData).where(
                CompanyRegistryData.ico == ico,
                CompanyRegistryData.registry_code == code,
            )
        )
        row = result.scalar_one_or_none()
        raw = json.dumps(data, ensure_ascii=False)

        if row is None:
            row = CompanyRegistryData(
                ico=ico, registry_code=code, raw_json=raw, http_status=status, fetched_at=now
            )
            db.add(row)
        else:
            row.raw_json = raw
            row.http_status = status
            row.fetched_at = now

    await db.commit()
    await db.refresh(company)
    logger.info("Upserted company %s (insolvency=%s)", ico, insolvency_flag)
    return company
