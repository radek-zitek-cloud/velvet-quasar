import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog

logger = logging.getLogger(__name__)


def log_audit(
    db: AsyncSession,
    *,
    user_id: int,
    user_email: str,
    action: str,
    entity_type: str,
    entity_id: int | str,   # widened — accepts ICO strings; existing int callers unchanged
    changes: list[tuple[str | None, str | None, str | None]],
) -> None:
    """Add audit log rows to the session (caller must commit).

    Each entry in `changes` is (attribute_name, old_value, new_value).
    For create/delete actions, pass a single entry with a summary message
    in new_value/old_value respectively.
    """
    entity_id_str = str(entity_id)
    logger.debug(
        "log_audit: user_id=%s email=%s action=%s entity_type=%s entity_id=%s changes_count=%d",
        user_id, user_email, action, entity_type, entity_id_str, len(changes),
    )
    for attr_name, old_val, new_val in changes:
        logger.debug(
            "log_audit: attr=%s old=%r new=%r",
            attr_name,
            old_val[:50] if isinstance(old_val, str) and len(old_val) > 50 else old_val,
            new_val[:50] if isinstance(new_val, str) and len(new_val) > 50 else new_val,
        )
        db.add(
            AuditLog(
                user_id=user_id,
                user_email=user_email,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id_str,
                attribute_name=attr_name,
                old_value=old_val,
                new_value=new_val,
            )
        )
