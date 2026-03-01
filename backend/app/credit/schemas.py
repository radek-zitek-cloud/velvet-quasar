from datetime import datetime

from pydantic import BaseModel, field_validator


class CreditCaseCreate(BaseModel):
    name: str
    description: str = ""
    ico_number: str | None = None

    @field_validator("ico_number")
    @classmethod
    def validate_ico(cls, v: str | None) -> str | None:
        if v is not None and v != "":
            if not v.isdigit() or len(v) != 8:
                raise ValueError("ICO number must be exactly 8 digits")
        return v or None


class CreditCaseUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    ico_number: str | None = None

    @field_validator("ico_number")
    @classmethod
    def validate_ico(cls, v: str | None) -> str | None:
        if v is not None and v != "":
            if not v.isdigit() or len(v) != 8:
                raise ValueError("ICO number must be exactly 8 digits")
        return v


class CreditCaseResponse(BaseModel):
    id: int
    name: str
    description: str
    ico_number: str | None
    is_deleted: bool
    created_at: datetime
    created_by: str | None
    updated_at: datetime
    updated_by: str | None

    model_config = {"from_attributes": True}
