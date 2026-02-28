import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.dependencies import require_admin
from app.admin.models import Role
from app.admin.schemas import (
    AdminUserCreate,
    AdminUserResponse,
    AdminUserUpdate,
    RoleCreate,
    RoleResponse,
    RoleUpdate,
    UserRolesUpdate,
)
from app.auth.dependencies import get_db
from app.auth.models import User
from app.auth.security import encode_roles, hash_password, parse_roles

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Role CRUD ─────────────────────────────────────────────

@router.get("/roles", response_model=list[RoleResponse])
async def list_roles(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.is_deleted == False).order_by(Role.name))
    return result.scalars().all()


@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.id == role_id, Role.is_deleted == False))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return role


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    body: RoleCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Check uniqueness (including soft-deleted)
    result = await db.execute(select(Role).where(Role.name == body.name))
    existing = result.scalar_one_or_none()
    if existing:
        if existing.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f'A role named "{body.name}" was previously deleted. Please choose a different name.',
            )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f'Role "{body.name}" already exists.')

    role = Role(
        name=body.name,
        description=body.description,
        created_by=str(admin.id),
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    logger.info("Role created: %s by user %s", role.name, admin.id)
    return role


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    body: RoleUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.id == role_id, Role.is_deleted == False))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    if body.name is not None and body.name != role.name:
        dup_result = await db.execute(select(Role).where(Role.name == body.name))
        dup = dup_result.scalar_one_or_none()
        if dup:
            if dup.is_deleted:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f'A role named "{body.name}" was previously deleted. Please choose a different name.',
                )
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f'Role "{body.name}" already exists.')
        role.name = body.name

    if body.description is not None:
        role.description = body.description

    role.updated_by = str(admin.id)
    role.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(role)
    logger.info("Role updated: %s by user %s", role.name, admin.id)
    return role


@router.delete("/roles/{role_id}", response_model=RoleResponse)
async def delete_role(
    role_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.id == role_id, Role.is_deleted == False))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    role.is_deleted = True
    role.updated_by = str(admin.id)
    role.updated_at = datetime.now(timezone.utc)

    # Remove the deleted role from all users
    users_result = await db.execute(select(User).where(User.is_deleted == False))
    for user in users_result.scalars().all():
        user_roles = parse_roles(user.roles)
        if role.name in user_roles:
            user_roles.remove(role.name)
            user.roles = encode_roles(user_roles)
            user.updated_at = datetime.now(timezone.utc)
            user.updated_by = str(admin.id)

    await db.commit()
    await db.refresh(role)
    logger.info("Role soft-deleted: %s by user %s (removed from all users)", role.name, admin.id)
    return role


# ── User CRUD (admin) ────────────────────────────────────

@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.is_deleted == False).order_by(User.id))
    users = result.scalars().all()
    return [_admin_user_response(u) for u in users]


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _admin_user_response(user)


@router.post("/users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: AdminUserCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == body.email))
    existing = result.scalar_one_or_none()
    if existing:
        if existing.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f'A user with email "{body.email}" was previously deleted. Please use a different email.',
            )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f'A user with email "{body.email}" already exists.')

    user = User(
        first_name=body.first_name,
        last_name=body.last_name,
        display_name=body.display_name,
        email=body.email,
        hashed_password=hash_password(body.password),
        roles=encode_roles(body.roles),
        password_change_required=body.password_change_required,
        created_by=str(admin.id),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("User created by admin: %s (by %s)", user.email, admin.id)
    return _admin_user_response(user)


@router.put("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    body: AdminUserUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.email is not None and body.email != user.email:
        dup_result = await db.execute(select(User).where(User.email == body.email))
        dup = dup_result.scalar_one_or_none()
        if dup:
            if dup.is_deleted:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f'A user with email "{body.email}" was previously deleted. Please use a different email.',
                )
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f'A user with email "{body.email}" already exists.')
        user.email = body.email

    if body.first_name is not None:
        user.first_name = body.first_name
    if body.last_name is not None:
        user.last_name = body.last_name
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.password is not None:
        user.hashed_password = hash_password(body.password)
    if body.password_change_required is not None:
        user.password_change_required = body.password_change_required

    user.updated_by = str(admin.id)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    logger.info("User updated by admin: %s (by %s)", user.email, admin.id)
    return _admin_user_response(user)


@router.delete("/users/{user_id}", response_model=AdminUserResponse)
async def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_deleted = True
    user.updated_by = str(admin.id)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    logger.info("User soft-deleted by admin: %s (by %s)", user.email, admin.id)
    return _admin_user_response(user)


@router.put("/users/{user_id}/roles", response_model=AdminUserResponse)
async def update_user_roles(
    user_id: int,
    body: UserRolesUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.roles = encode_roles(body.roles)
    user.updated_by = str(admin.id)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    logger.info("User roles updated by admin: %s -> %s (by %s)", user.email, body.roles, admin.id)
    return _admin_user_response(user)


def _admin_user_response(user: User) -> AdminUserResponse:
    return AdminUserResponse(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        display_name=user.display_name,
        email=user.email,
        roles=parse_roles(user.roles),
        last_login_at=user.last_login_at,
        password_change_required=user.password_change_required,
        is_deleted=user.is_deleted,
        created_at=user.created_at,
        created_by=user.created_by,
        updated_at=user.updated_at,
        updated_by=user.updated_by,
    )
