from datetime import date, datetime

from pydantic import BaseModel


class CompanyRegistryDataResponse(BaseModel):
    id: int
    ico: str
    registry_code: str
    raw_json: str
    http_status: int
    fetched_at: datetime

    model_config = {"from_attributes": True}


class CompanyResponse(BaseModel):
    ico: str
    obchodni_jmeno: str | None
    dic: str | None
    pravni_forma: str | None
    datum_vzniku: date | None
    datum_zaniku: date | None
    insolvency_flag: bool
    last_refreshed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CompanyDirectorResponse(BaseModel):
    id: int
    ico: str
    organ_name: str | None
    organ_type: str | None
    organ_datum_vymazu: date | None
    zpusob_jednani: str | None
    titul_pred: str | None
    jmeno: str | None
    prijmeni: str | None
    titul_za: str | None
    obchodni_jmeno: str | None
    datum_narozeni: date | None
    statni_obcanstvi: str | None
    funkce: str | None
    vznik_funkce: date | None
    zanik_funkce: date | None
    datum_vymazu: date | None
    fetched_at: datetime
    person_id: int | None = None
    director_ico: str | None = None

    model_config = {"from_attributes": True}


class NaturalPersonResponse(BaseModel):
    id: int
    jmeno: str | None
    prijmeni: str | None
    titul_pred: str | None
    titul_za: str | None
    datum_narozeni: date | None
    statni_obcanstvi: str | None

    model_config = {"from_attributes": True}


class NaturalPersonCompanyLink(BaseModel):
    ico: str
    obchodni_jmeno: str | None
    role: str  # "Director", "Owner", or "Director & Owner"

    model_config = {"from_attributes": True}


class NaturalPersonListItem(BaseModel):
    id: int
    jmeno: str | None
    prijmeni: str | None
    titul_pred: str | None
    titul_za: str | None
    datum_narozeni: date | None
    statni_obcanstvi: str | None
    companies: list[NaturalPersonCompanyLink] = []

    model_config = {"from_attributes": True}


class NaturalPersonUpdate(BaseModel):
    jmeno: str | None = None
    prijmeni: str | None = None
    titul_pred: str | None = None
    titul_za: str | None = None
    datum_narozeni: date | None = None
    statni_obcanstvi: str | None = None


class AddressResponse(BaseModel):
    id: int
    typ_adresy: str | None
    textova_adresa: str | None
    nazev_ulice: str | None
    cislo_domovni: str | None
    nazev_obce: str | None
    psc: str | None
    kod_statu: str | None
    datum_zapisu: date | None
    datum_vymazu: date | None

    model_config = {"from_attributes": True}


class CompanyRelationshipResponse(BaseModel):
    id: int
    ico: str
    related_ico: str | None
    related_person_id: int | None
    relationship_type: str
    podil_hodnota: str | None
    podil_typ: str | None
    vznik_clenstvi: date | None
    zanik_clenstvi: date | None
    datum_zapisu: date | None
    datum_vymazu: date | None
    person: NaturalPersonResponse | None = None
    related_obchodni_jmeno: str | None = None

    model_config = {"from_attributes": True}


class CompanyDetailResponse(CompanyResponse):
    registry_data: list[CompanyRegistryDataResponse] = []
    directors: list[CompanyDirectorResponse] = []
    relationships: list[CompanyRelationshipResponse] = []
    addresses: list[AddressResponse] = []
