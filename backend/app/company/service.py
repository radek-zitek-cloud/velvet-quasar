import json
import logging
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.company.models import Address, Company, CompanyDirector, CompanyRegistryData, CompanyRelationship, NaturalPerson

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


async def _upsert_natural_person(fo: dict, db: AsyncSession) -> NaturalPerson:
    """Get-or-create a NaturalPerson de-duplicated by (jmeno, prijmeni, datum_narozeni)."""
    jmeno = fo.get("jmeno")
    prijmeni = fo.get("prijmeni")
    datum_narozeni = _parse_date(fo.get("datumNarozeni"))

    result = await db.execute(
        select(NaturalPerson).where(
            NaturalPerson.jmeno == jmeno,
            NaturalPerson.prijmeni == prijmeni,
            NaturalPerson.datum_narozeni == datum_narozeni,
        )
    )
    person = result.scalar_one_or_none()

    if person is None:
        person = NaturalPerson(
            jmeno=jmeno,
            prijmeni=prijmeni,
            titul_pred=fo.get("titulPredJmenem"),
            titul_za=fo.get("titulZaJmenem"),
            datum_narozeni=datum_narozeni,
            statni_obcanstvi=fo.get("statniObcanstvi"),
        )
        db.add(person)
        await db.flush()  # get the generated id
    else:
        # Update titles which can change over time
        person.titul_pred = fo.get("titulPredJmenem")
        person.titul_za = fo.get("titulZaJmenem")
        person.statni_obcanstvi = fo.get("statniObcanstvi")

    return person


async def _upsert_person_address(person_id: int, adresa: dict, fetched_at: datetime, db: AsyncSession) -> None:
    """Replace person's single address (no history — persons have one current address)."""
    await db.execute(
        delete(Address).where(Address.entity_type == "PERSON", Address.entity_person_id == person_id)
    )
    db.add(Address(
        entity_type="PERSON",
        entity_person_id=person_id,
        textova_adresa=adresa.get("textovaAdresa"),
        nazev_ulice=adresa.get("nazevUlice"),
        cislo_domovni=str(adresa.get("cisloDomovni")) if adresa.get("cisloDomovni") else None,
        nazev_obce=adresa.get("nazevObce"),
        psc=adresa.get("psc"),
        kod_statu=adresa.get("kodStatu"),
        datum_zapisu=None,
        datum_vymazu=None,
        fetched_at=fetched_at,
    ))


async def _upsert_company_addresses(ico: str, zaznamy0: dict, fetched_at: datetime, db: AsyncSession) -> None:
    """Replace all historized company addresses from fresh VR data."""
    await db.execute(
        delete(Address).where(Address.entity_type == "COMPANY", Address.entity_ico == ico)
    )
    for entry in zaznamy0.get("adresy") or []:
        adresa = entry.get("adresa") or {}
        db.add(Address(
            entity_type="COMPANY",
            entity_ico=ico,
            typ_adresy=entry.get("typAdresy"),
            textova_adresa=adresa.get("textovaAdresa"),
            nazev_ulice=adresa.get("nazevUlice"),
            cislo_domovni=str(adresa.get("cisloDomovni")) if adresa.get("cisloDomovni") else None,
            nazev_obce=adresa.get("nazevObce"),
            psc=adresa.get("psc"),
            kod_statu=adresa.get("kodStatu"),
            datum_zapisu=_parse_date(entry.get("datumZapisu")),
            datum_vymazu=_parse_date(entry.get("datumVymazu")),
            fetched_at=fetched_at,
        ))


async def _ensure_stub_company(ico: str, obchodni_jmeno: str | None, db: AsyncSession) -> None:
    """Create a stub Company row if one doesn't exist (for unknown related ICOs)."""
    result = await db.execute(select(Company).where(Company.ico == ico))
    if result.scalar_one_or_none() is None:
        db.add(Company(ico=ico, obchodni_jmeno=obchodni_jmeno))
        await db.flush()


async def _upsert_relationships(ico: str, zaznamy0: dict, fetched_at: datetime, db: AsyncSession) -> None:
    """Replace all ownership relationships from fresh VR data."""
    await db.execute(delete(CompanyRelationship).where(CompanyRelationship.ico == ico))

    # spolecnici — partners/members of s.r.o. (LLC)
    for group in zaznamy0.get("spolecnici") or []:
        for sp in group.get("spolecnik") or []:
            osoba = sp.get("osoba") or {}
            fo = osoba.get("fyzickaOsoba")
            po = osoba.get("pravnickaOsoba")

            podil_list = sp.get("podil") or [{}]
            podil_block = podil_list[0] if podil_list else {}
            velikost = podil_block.get("velikostPodilu") or {}
            podil_hodnota = str(velikost.get("hodnota")) if velikost.get("hodnota") is not None else None
            podil_typ = velikost.get("typObnos")

            related_ico = None
            related_person_id = None

            if po:
                related_ico = po.get("ico")
                if related_ico:
                    await _ensure_stub_company(related_ico, po.get("obchodniJmeno"), db)
            elif fo:
                person = await _upsert_natural_person(fo, db)
                related_person_id = person.id
                if fo.get("adresa"):
                    await _upsert_person_address(person.id, fo["adresa"], fetched_at, db)

            db.add(CompanyRelationship(
                ico=ico,
                related_ico=related_ico,
                related_person_id=related_person_id,
                relationship_type="SPOLECNIK",
                podil_hodnota=podil_hodnota,
                podil_typ=podil_typ,
                datum_zapisu=_parse_date(sp.get("datumZapisu")),
                datum_vymazu=_parse_date(sp.get("datumVymazu")),
                fetched_at=fetched_at,
            ))

    # akcionari — shareholders of a.s. (joint-stock)
    for group in zaznamy0.get("akcionari") or []:
        for clen in group.get("clenoveOrganu") or []:
            fo = clen.get("fyzickaOsoba")
            po = clen.get("pravnickaOsoba")

            related_ico = None
            related_person_id = None

            if po:
                related_ico = po.get("ico")
                if related_ico:
                    await _ensure_stub_company(related_ico, po.get("obchodniJmeno"), db)
            elif fo:
                person = await _upsert_natural_person(fo, db)
                related_person_id = person.id
                if fo.get("adresa"):
                    await _upsert_person_address(person.id, fo["adresa"], fetched_at, db)

            db.add(CompanyRelationship(
                ico=ico,
                related_ico=related_ico,
                related_person_id=related_person_id,
                relationship_type="AKCIONAR",
                podil_hodnota=None,
                podil_typ=None,
                datum_zapisu=_parse_date(clen.get("datumZapisu")),
                datum_vymazu=_parse_date(clen.get("datumVymazu")),
                fetched_at=fetched_at,
            ))


async def _upsert_directors(
    ico: str,
    vr_json: dict,
    fetched_at: datetime,
    db: AsyncSession,
) -> None:
    """Delete existing director rows for ICO, then re-insert from fresh VR JSON."""
    if not vr_json:
        return

    zaznamy = vr_json.get("zaznamy") or []
    if not zaznamy:
        return

    statutory_organs = zaznamy[0].get("statutarniOrgany") or []

    await db.execute(delete(CompanyDirector).where(CompanyDirector.ico == ico))

    for organ in statutory_organs:
        organ_name = organ.get("nazevOrganu")
        organ_type = organ.get("typOrganu")
        organ_datum_zapisu = _parse_date(organ.get("datumZapisu"))
        organ_datum_vymazu = _parse_date(organ.get("datumVymazu"))

        zpusob_list = organ.get("zpusobJednani") or []
        zpusob_jednani = zpusob_list[-1].get("hodnota") if zpusob_list else None

        for clen in organ.get("clenoveOrganu") or []:
            clenstvi_block = clen.get("clenstvi") or {}
            funkce_block = clenstvi_block.get("funkce") or {}

            funkce = funkce_block.get("nazev")
            vznik_funkce = _parse_date(funkce_block.get("vznikFunkce"))
            zanik_funkce = _parse_date(funkce_block.get("zanikFunkce"))
            datum_zapisu = _parse_date(clen.get("datumZapisu"))
            datum_vymazu = _parse_date(clen.get("datumVymazu"))

            fo = clen.get("fyzickaOsoba")
            po = clen.get("pravnickaOsoba")

            person_id = None
            director_ico = None

            if fo:
                person = await _upsert_natural_person(fo, db)
                person_id = person.id
                if fo.get("adresa"):
                    await _upsert_person_address(person.id, fo["adresa"], fetched_at, db)
            elif po and po.get("ico"):
                director_ico = po["ico"]
                await _ensure_stub_company(director_ico, po.get("obchodniJmeno"), db)

            director = CompanyDirector(
                ico=ico,
                organ_name=organ_name,
                organ_type=organ_type,
                organ_datum_zapisu=organ_datum_zapisu,
                organ_datum_vymazu=organ_datum_vymazu,
                zpusob_jednani=zpusob_jednani,
                titul_pred=fo.get("titulPredJmenem") if fo else None,
                jmeno=fo.get("jmeno") if fo else None,
                prijmeni=fo.get("prijmeni") if fo else None,
                titul_za=fo.get("titulZaJmenem") if fo else None,
                datum_narozeni=_parse_date(fo.get("datumNarozeni")) if fo else None,
                statni_obcanstvi=fo.get("statniObcanstvi") if fo else None,
                obchodni_jmeno=po.get("obchodniJmeno") if po else None,
                funkce=funkce,
                vznik_funkce=vznik_funkce,
                zanik_funkce=zanik_funkce,
                datum_zapisu=datum_zapisu,
                datum_vymazu=datum_vymazu,
                fetched_at=fetched_at,
                person_id=person_id,
                director_ico=director_ico,
            )
            db.add(director)


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

    # Re-populate directors, addresses, and ownership relationships from fresh VR data
    vr_status, vr_json = ares_results.get("VR", (0, {}))
    if vr_status == 200:
        await _upsert_directors(ico, vr_json, now, db)
        zaznamy0 = (vr_json.get("zaznamy") or [{}])[0]
        await _upsert_company_addresses(ico, zaznamy0, now, db)
        await _upsert_relationships(ico, zaznamy0, now, db)

    await db.commit()
    await db.refresh(company)
    logger.info("Upserted company %s (insolvency=%s)", ico, insolvency_flag)
    return company
