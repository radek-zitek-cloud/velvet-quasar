from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.dependencies import require_admin
from app.audit.models import AuditLog
from app.audit.schemas import AuditLogPage
from app.auth.dependencies import get_db
from app.auth.models import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/audit-logs", response_model=AuditLogPage)
async def list_audit_logs(
    entity_type: str | None = Query(None),
    action: str | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog)
    count_query = select(func.count(AuditLog.id))

    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
        count_query = count_query.where(AuditLog.entity_type == entity_type)

    if action:
        query = query.where(AuditLog.action == action)
        count_query = count_query.where(AuditLog.action == action)

    if search:
        pattern = f"%{search}%"
        search_filter = or_(
            AuditLog.user_email.ilike(pattern),
            AuditLog.attribute_name.ilike(pattern),
            AuditLog.old_value.ilike(pattern),
            AuditLog.new_value.ilike(pattern),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    return AuditLogPage(items=items, total=total, skip=skip, limit=limit)
