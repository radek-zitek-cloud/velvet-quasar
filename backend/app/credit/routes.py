import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import log_audit
from app.auth.dependencies import get_current_user, get_db
from app.auth.models import User
from app.credit.models import CreditCase
from app.credit.schemas import CreditCaseCreate, CreditCaseResponse, CreditCaseUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/credit", tags=["credit"])


@router.get("/cases", response_model=list[CreditCaseResponse])
async def list_cases(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("list_cases: requested by user_id=%s", current_user.id)
    result = await db.execute(
        select(CreditCase).where(CreditCase.is_deleted == False).order_by(CreditCase.name)
    )
    cases = result.scalars().all()
    logger.debug("list_cases: returning %d cases", len(cases))
    return cases


@router.get("/cases/{case_id}", response_model=CreditCaseResponse)
async def get_case(
    case_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("get_case: case_id=%s requested by user_id=%s", case_id, current_user.id)
    result = await db.execute(
        select(CreditCase).where(CreditCase.id == case_id, CreditCase.is_deleted == False)
    )
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credit case not found")
    return case


@router.post("/cases", response_model=CreditCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    body: CreditCaseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("create_case: name=%s by user_id=%s", body.name, current_user.id)
    case = CreditCase(
        name=body.name,
        description=body.description,
        ico_number=body.ico_number,
        created_by=str(current_user.id),
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    logger.debug("create_case: persisted case id=%s name=%s", case.id, case.name)
    log_audit(
        db,
        user_id=current_user.id,
        user_email=current_user.email,
        action="create",
        entity_type="credit_case",
        entity_id=case.id,
        changes=[(None, None, f"Credit case created: {case.name}")],
    )
    await db.commit()
    logger.info("Credit case created: %s by user %s", case.name, current_user.id)
    return case


@router.put("/cases/{case_id}", response_model=CreditCaseResponse)
async def update_case(
    case_id: int,
    body: CreditCaseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("update_case: case_id=%s by user_id=%s fields=%s", case_id, current_user.id, body.model_fields_set)
    result = await db.execute(
        select(CreditCase).where(CreditCase.id == case_id, CreditCase.is_deleted == False)
    )
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credit case not found")

    changes: list[tuple[str | None, str | None, str | None]] = []

    if body.name is not None and body.name != case.name:
        changes.append(("name", case.name, body.name))
        case.name = body.name

    if body.description is not None and body.description != case.description:
        changes.append(("description", case.description, body.description))
        case.description = body.description

    if "ico_number" in body.model_fields_set and body.ico_number != case.ico_number:
        changes.append(("ico_number", case.ico_number, body.ico_number))
        case.ico_number = body.ico_number

    case.updated_by = str(current_user.id)
    case.updated_at = datetime.now(timezone.utc)
    if changes:
        log_audit(
            db,
            user_id=current_user.id,
            user_email=current_user.email,
            action="update",
            entity_type="credit_case",
            entity_id=case.id,
            changes=changes,
        )
    await db.commit()
    await db.refresh(case)
    logger.info("Credit case updated: %s by user %s", case.name, current_user.id)
    return case


@router.delete("/cases/{case_id}", response_model=CreditCaseResponse)
async def delete_case(
    case_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("delete_case: case_id=%s by user_id=%s", case_id, current_user.id)
    result = await db.execute(
        select(CreditCase).where(CreditCase.id == case_id, CreditCase.is_deleted == False)
    )
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credit case not found")

    case.is_deleted = True
    case.updated_by = str(current_user.id)
    case.updated_at = datetime.now(timezone.utc)
    log_audit(
        db,
        user_id=current_user.id,
        user_email=current_user.email,
        action="delete",
        entity_type="credit_case",
        entity_id=case.id,
        changes=[(None, case.name, None)],
    )
    await db.commit()
    await db.refresh(case)
    logger.info("Credit case soft-deleted: %s by user %s", case.name, current_user.id)
    return case
