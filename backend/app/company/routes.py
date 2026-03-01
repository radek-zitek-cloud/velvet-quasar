import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ares.fetcher import fetch_all_registries
from app.auth.dependencies import get_current_user, get_db
from app.auth.models import User
from app.company.models import Address, Company, CompanyDirector, CompanyRegistryData, CompanyRelationship, NaturalPerson
from app.company.schemas import (
    AddressResponse,
    CompanyDetailResponse,
    CompanyDirectorResponse,
    CompanyRegistryDataResponse,
    CompanyRelationshipResponse,
    NaturalPersonResponse,
)
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

    dir_result = await db.execute(
        select(CompanyDirector)
        .where(CompanyDirector.ico == ico)
        .order_by(
            CompanyDirector.organ_name,
            CompanyDirector.datum_vymazu.nulls_last(),
            CompanyDirector.vznik_funkce,
        )
    )
    directors = dir_result.scalars().all()

    # Addresses (current first — NULL datum_vymazu sorts first with nulls_first)
    addr_result = await db.execute(
        select(Address)
        .where(Address.entity_type == "COMPANY", Address.entity_ico == ico)
        .order_by(Address.datum_vymazu.nulls_first())
    )
    addresses = addr_result.scalars().all()

    # Relationships (active first)
    rel_result = await db.execute(
        select(CompanyRelationship)
        .where(CompanyRelationship.ico == ico)
        .order_by(CompanyRelationship.datum_vymazu.nulls_first(), CompanyRelationship.relationship_type)
    )
    relationships = rel_result.scalars().all()

    # Build relationship responses with nested person / company name
    rel_responses: list[CompanyRelationshipResponse] = []
    for rel in relationships:
        person_resp = None
        related_name = None

        if rel.related_person_id is not None:
            p_result = await db.execute(select(NaturalPerson).where(NaturalPerson.id == rel.related_person_id))
            person = p_result.scalar_one_or_none()
            if person:
                person_resp = NaturalPersonResponse.model_validate(person)

        if rel.related_ico is not None:
            c_result = await db.execute(select(Company).where(Company.ico == rel.related_ico))
            related_company = c_result.scalar_one_or_none()
            if related_company:
                related_name = related_company.obchodni_jmeno

        rel_responses.append(CompanyRelationshipResponse(
            id=rel.id,
            ico=rel.ico,
            related_ico=rel.related_ico,
            related_person_id=rel.related_person_id,
            relationship_type=rel.relationship_type,
            podil_hodnota=rel.podil_hodnota,
            podil_typ=rel.podil_typ,
            vznik_clenstvi=rel.vznik_clenstvi,
            zanik_clenstvi=rel.zanik_clenstvi,
            datum_zapisu=rel.datum_zapisu,
            datum_vymazu=rel.datum_vymazu,
            person=person_resp,
            related_obchodni_jmeno=related_name,
        ))

    return CompanyDetailResponse(
        **{c.key: getattr(company, c.key) for c in Company.__table__.columns},
        registry_data=[CompanyRegistryDataResponse.model_validate(r) for r in registry_rows],
        directors=[CompanyDirectorResponse.model_validate(d) for d in directors],
        relationships=rel_responses,
        addresses=[AddressResponse.model_validate(a) for a in addresses],
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
