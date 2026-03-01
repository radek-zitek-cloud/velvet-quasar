import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ares.fetcher import fetch_all_registries
from app.auth.dependencies import get_current_user, get_db
from app.auth.models import User
from app.company.models import Address, Company, CompanyDirector, CompanyRegistryData, CompanyRelationship, NaturalPerson
from app.company.schemas import (
    AddressResponse,
    CompanyDetailResponse,
    CompanyDirectorResponse,
    CompanyListItem,
    CompanyRegistryDataResponse,
    CompanyRelationshipResponse,
    DuplicatePersonGroup,
    DuplicatePersonsResponse,
    IntegrityReport,
    NaturalPersonCompanyLink,
    NaturalPersonListItem,
    NaturalPersonResponse,
    NaturalPersonUpdate,
)
from app.company.service import upsert_company

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/company", tags=["company"])


def _uf_find(parent: dict[int, int], x: int) -> int:
    """Path-compressed union-find lookup."""
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x


def _uf_union(parent: dict[int, int], x: int, y: int) -> None:
    parent[_uf_find(parent, x)] = _uf_find(parent, y)


async def _build_person_with_companies(person: NaturalPerson, db: AsyncSession) -> NaturalPersonListItem:
    """Attach linked company info to a NaturalPerson."""
    dir_result = await db.execute(
        select(CompanyDirector.ico).where(CompanyDirector.person_id == person.id).distinct()
    )
    director_icos = set(dir_result.scalars().all())

    rel_result = await db.execute(
        select(CompanyRelationship.ico).where(CompanyRelationship.related_person_id == person.id).distinct()
    )
    owner_icos = set(rel_result.scalars().all())

    all_icos = director_icos | owner_icos

    companies: list[NaturalPersonCompanyLink] = []
    for ico in sorted(all_icos):
        co_result = await db.execute(select(Company).where(Company.ico == ico))
        co = co_result.scalar_one_or_none()
        is_dir = ico in director_icos
        is_own = ico in owner_icos
        role = "Director & Owner" if is_dir and is_own else "Director" if is_dir else "Owner"
        companies.append(NaturalPersonCompanyLink(
            ico=ico,
            obchodni_jmeno=co.obchodni_jmeno if co else None,
            role=role,
        ))

    return NaturalPersonListItem(
        id=person.id,
        jmeno=person.jmeno,
        prijmeni=person.prijmeni,
        titul_pred=person.titul_pred,
        titul_za=person.titul_za,
        datum_narozeni=person.datum_narozeni,
        statni_obcanstvi=person.statni_obcanstvi,
        companies=companies,
    )


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


@router.get("/persons/duplicates", response_model=DuplicatePersonsResponse)
async def list_person_duplicates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(NaturalPerson).order_by(NaturalPerson.prijmeni, NaturalPerson.jmeno))
    all_persons = result.scalars().all()

    # Build company links upfront — needed for no-DOB matching
    all_built = [await _build_person_with_companies(p, db) for p in all_persons]

    by_name: dict[tuple, list[NaturalPersonListItem]] = {}
    for b in all_built:
        key = ((b.jmeno or "").strip().upper(), (b.prijmeni or "").strip().upper())
        by_name.setdefault(key, []).append(b)

    dup_groups: list[DuplicatePersonGroup] = []
    total_duplicates = 0

    for name_members in by_name.values():
        if len(name_members) < 2:
            continue

        with_dob = [m for m in name_members if m.datum_narozeni is not None]
        without_dob = [m for m in name_members if m.datum_narozeni is None]

        # Rule 1: same name + same non-null DOB
        dob_subgroups: dict[str, list[NaturalPersonListItem]] = {}
        for m in with_dob:
            dob_subgroups.setdefault(str(m.datum_narozeni), []).append(m)
        for g in dob_subgroups.values():
            if len(g) > 1:
                dup_groups.append(DuplicatePersonGroup(persons=g))
                total_duplicates += len(g) - 1

        # Rule 2: same name + no DOB + share ≥1 company with another same-name person
        if without_dob:
            cos_map = {m.id: {c.ico for c in m.companies} for m in name_members}
            parent = {m.id: m.id for m in name_members}

            for no_dob in without_dob:
                shared_icos = cos_map[no_dob.id]
                if not shared_icos:
                    continue
                for other in without_dob:
                    if other.id != no_dob.id and (cos_map[other.id] & shared_icos):
                        _uf_union(parent, no_dob.id, other.id)

            components: dict[int, list[NaturalPersonListItem]] = {}
            for m in name_members:
                components.setdefault(_uf_find(parent, m.id), []).append(m)

            for component in components.values():
                if any(m.datum_narozeni is None for m in component) and len(component) > 1:
                    dup_groups.append(DuplicatePersonGroup(persons=component))
                    total_duplicates += len(component) - 1

    return DuplicatePersonsResponse(groups=dup_groups, total_duplicates=total_duplicates)


@router.get("/persons/integrity", response_model=IntegrityReport)
async def get_persons_integrity(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import text
    broken_dir = (await db.execute(text("""
        SELECT COUNT(*) FROM company_directors cd
        LEFT JOIN natural_persons np ON cd.person_id = np.id
        WHERE cd.person_id IS NOT NULL AND np.id IS NULL
    """))).scalar_one()

    broken_rel = (await db.execute(text("""
        SELECT COUNT(*) FROM company_relationships cr
        LEFT JOIN natural_persons np ON cr.related_person_id = np.id
        WHERE cr.related_person_id IS NOT NULL AND np.id IS NULL
    """))).scalar_one()

    broken_addr = (await db.execute(text("""
        SELECT COUNT(*) FROM addresses a
        LEFT JOIN natural_persons np ON a.entity_person_id = np.id
        WHERE a.entity_person_id IS NOT NULL AND np.id IS NULL
    """))).scalar_one()

    return IntegrityReport(
        broken_director_refs=broken_dir,
        broken_relationship_refs=broken_rel,
        broken_address_refs=broken_addr,
        is_clean=(broken_dir == 0 and broken_rel == 0 and broken_addr == 0),
    )


@router.get("/persons", response_model=list[NaturalPersonListItem])
async def list_persons(
    q: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("list_persons: q=%s user=%s", q, current_user.id)
    stmt = select(NaturalPerson).order_by(NaturalPerson.prijmeni, NaturalPerson.jmeno)
    if q:
        like = f"%{q.upper()}%"
        stmt = stmt.where(
            (func.upper(NaturalPerson.jmeno).like(like)) |
            (func.upper(NaturalPerson.prijmeni).like(like))
        )
    result = await db.execute(stmt)
    persons = result.scalars().all()
    return [await _build_person_with_companies(p, db) for p in persons]


@router.get("/persons/{person_id}", response_model=NaturalPersonListItem)
async def get_person(
    person_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("get_person: person_id=%s user=%s", person_id, current_user.id)
    result = await db.execute(select(NaturalPerson).where(NaturalPerson.id == person_id))
    person = result.scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    return await _build_person_with_companies(person, db)


@router.patch("/persons/{person_id}", response_model=NaturalPersonListItem)
async def update_person(
    person_id: int,
    body: NaturalPersonUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("update_person: person_id=%s user=%s", person_id, current_user.id)
    result = await db.execute(select(NaturalPerson).where(NaturalPerson.id == person_id))
    person = result.scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(person, field, value)
    await db.commit()
    await db.refresh(person)
    return await _build_person_with_companies(person, db)


@router.post("/persons/{person_id}/merge-into/{canonical_id}", response_model=NaturalPersonListItem)
async def merge_person(
    person_id: int,
    canonical_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if person_id == canonical_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot merge a person into themselves")

    src = (await db.execute(select(NaturalPerson).where(NaturalPerson.id == person_id))).scalar_one_or_none()
    if src is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Person {person_id} not found")

    canon = (await db.execute(select(NaturalPerson).where(NaturalPerson.id == canonical_id))).scalar_one_or_none()
    if canon is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Person {canonical_id} not found")

    # Re-point all FK references from src -> canonical.
    # Also sync embedded denormalized fields on CompanyDirector so display stays correct.
    await db.execute(
        update(CompanyDirector)
        .where(CompanyDirector.person_id == person_id)
        .values(
            person_id=canonical_id,
            jmeno=canon.jmeno,
            prijmeni=canon.prijmeni,
            titul_pred=canon.titul_pred,
            titul_za=canon.titul_za,
            datum_narozeni=canon.datum_narozeni,
            statni_obcanstvi=canon.statni_obcanstvi,
        )
    )
    await db.execute(update(CompanyRelationship).where(CompanyRelationship.related_person_id == person_id).values(related_person_id=canonical_id))
    # Delete source person's address rows — re-pointing would violate the "one current address" invariant.
    await db.execute(delete(Address).where(Address.entity_person_id == person_id))

    await db.delete(src)
    await db.commit()
    await db.refresh(canon)
    return await _build_person_with_companies(canon, db)


@router.get("", response_model=list[CompanyListItem])
async def list_companies(
    q: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Company).order_by(Company.obchodni_jmeno)
    if q:
        like = f"%{q.upper()}%"
        stmt = stmt.where(
            (func.upper(Company.ico).like(like)) |
            (func.upper(Company.obchodni_jmeno).like(like))
        )
    result = await db.execute(stmt)
    return [CompanyListItem.model_validate(c) for c in result.scalars().all()]


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
