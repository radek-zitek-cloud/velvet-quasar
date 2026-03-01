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


class CompanyDetailResponse(CompanyResponse):
    registry_data: list[CompanyRegistryDataResponse] = []
