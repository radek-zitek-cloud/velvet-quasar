import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ares.fetcher import fetch_all_registries
from app.auth.dependencies import get_current_user, get_db
from app.auth.models import User
from app.company.models import Company, CompanyRegistryData
from app.company.schemas import CompanyDetailResponse, CompanyRegistryDataResponse
from app.company.service import upsert_company

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/company", tags=["company"])


async def _load_detail(ico: str, db: AsyncSession) -> CompanyDetailResponse:
    result = await db.execute(select(Company).where(Company.ico == ico))
    company = result.scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    reg_result = await db.execute(
        select(CompanyRegistryData)
        .where(CompanyRegistryData.ico == ico)
        .order_by(CompanyRegistryData.registry_code)
    )
    registry_rows = reg_result.scalars().all()
    return CompanyDetailResponse(
        **{c.key: getattr(company, c.key) for c in Company.__table__.columns},
        registry_data=[CompanyRegistryDataResponse.model_validate(r) for r in registry_rows],
    )


@router.get("/{ico}", response_model=CompanyDetailResponse)
async def get_company(
    ico: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("get_company: ico=%s user=%s", ico, current_user.id)
    return await _load_detail(ico, db)


@router.post("/{ico}/refresh", response_model=CompanyDetailResponse)
async def refresh_company(
    ico: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.info("refresh_company: fetching ARES for ico=%s user=%s", ico, current_user.id)
    ares_results = await fetch_all_registries(ico)
    await upsert_company(ico, ares_results, db)
    return await _load_detail(ico, db)


@router.get("/{ico}/registry/{code}", response_model=dict)
async def get_registry_data(
    ico: str,
    code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("get_registry_data: ico=%s code=%s user=%s", ico, code, current_user.id)
    result = await db.execute(
        select(CompanyRegistryData).where(
            CompanyRegistryData.ico == ico,
            CompanyRegistryData.registry_code == code.upper(),
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registry data not found")
    return json.loads(row.raw_json)
