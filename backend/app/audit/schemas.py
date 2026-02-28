from datetime import datetime

from pydantic import BaseModel


class AuditLogEntry(BaseModel):
    id: int
    timestamp: datetime
    user_id: int
    user_email: str
    action: str
    entity_type: str
    entity_id: int
    attribute_name: str | None
    old_value: str | None
    new_value: str | None

    model_config = {"from_attributes": True}


class AuditLogPage(BaseModel):
    items: list[AuditLogEntry]
    total: int
    skip: int
    limit: int
