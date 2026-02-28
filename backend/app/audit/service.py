from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog


def log_audit(
    db: AsyncSession,
    *,
    user_id: int,
    user_email: str,
    action: str,
    entity_type: str,
    entity_id: int,
    changes: list[tuple[str | None, str | None, str | None]],
) -> None:
    """Add audit log rows to the session (caller must commit).

    Each entry in `changes` is (attribute_name, old_value, new_value).
    For create/delete actions, pass a single entry with a summary message
    in new_value/old_value respectively.
    """
    for attr_name, old_val, new_val in changes:
        db.add(
            AuditLog(
                user_id=user_id,
                user_email=user_email,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                attribute_name=attr_name,
                old_value=old_val,
                new_value=new_val,
            )
        )
