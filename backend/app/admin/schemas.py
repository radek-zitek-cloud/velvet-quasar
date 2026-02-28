from datetime import datetime

from pydantic import BaseModel, EmailStr


# ── Role schemas ──────────────────────────────────────────

class RoleCreate(BaseModel):
    name: str
    description: str = ""


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class RoleResponse(BaseModel):
    id: int
    name: str
    description: str
    is_deleted: bool
    created_at: datetime
    created_by: str | None
    updated_at: datetime
    updated_by: str | None

    model_config = {"from_attributes": True}


# ── Admin User schemas ────────────────────────────────────

class AdminUserCreate(BaseModel):
    first_name: str
    last_name: str
    display_name: str
    email: EmailStr
    password: str
    roles: list[str] = []
    password_change_required: bool = False


class AdminUserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    display_name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    password_change_required: bool | None = None


class AdminUserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    display_name: str
    email: str
    roles: list[str]
    last_login_at: datetime | None
    password_change_required: bool
    is_deleted: bool
    created_at: datetime
    created_by: str | None
    updated_at: datetime
    updated_by: str | None

    model_config = {"from_attributes": True}


class UserRolesUpdate(BaseModel):
    roles: list[str]
