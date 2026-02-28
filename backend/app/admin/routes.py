import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.dependencies import require_admin
from app.audit.service import log_audit
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
    logger.debug("list_roles: requested by admin_id=%s", admin.id)
    result = await db.execute(select(Role).where(Role.is_deleted == False).order_by(Role.name))
    roles = result.scalars().all()
    logger.debug("list_roles: returning %d roles", len(roles))
    return roles


@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("get_role: role_id=%s requested by admin_id=%s", role_id, admin.id)
    result = await db.execute(select(Role).where(Role.id == role_id, Role.is_deleted == False))
    role = result.scalar_one_or_none()
    if role is None:
        logger.debug("get_role: role_id=%s not found", role_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    logger.debug("get_role: found role name=%s", role.name)
    return role


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    body: RoleCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("create_role: name=%s by admin_id=%s", body.name, admin.id)
    # Check uniqueness (including soft-deleted)
    logger.debug("create_role: checking uniqueness for name=%s", body.name)
    result = await db.execute(select(Role).where(Role.name == body.name))
    existing = result.scalar_one_or_none()
    if existing:
        logger.debug("create_role: name conflict: name=%s is_deleted=%s", body.name, existing.is_deleted)
        if existing.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f'A role named "{body.name}" was previously deleted. Please choose a different name.',
            )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f'Role "{body.name}" already exists.')

    logger.debug("create_role: name available, persisting role")
    role = Role(
        name=body.name,
        description=body.description,
        created_by=str(admin.id),
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    logger.debug("create_role: persisted role id=%s name=%s", role.id, role.name)
    log_audit(
        db, user_id=admin.id, user_email=admin.email, action="create",
        entity_type="role", entity_id=role.id,
        changes=[(None, None, f"Role created: {role.name}")],
    )
    await db.commit()
    logger.info("Role created: %s by user %s", role.name, admin.id)
    return role


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    body: RoleUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("update_role: role_id=%s by admin_id=%s body=%s", role_id, admin.id, body.model_fields_set)
    result = await db.execute(select(Role).where(Role.id == role_id, Role.is_deleted == False))
    role = result.scalar_one_or_none()
    if role is None:
        logger.debug("update_role: role_id=%s not found", role_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    changes: list[tuple[str | None, str | None, str | None]] = []

    if body.name is not None and body.name != role.name:
        logger.debug("update_role: name change '%s' -> '%s', checking uniqueness", role.name, body.name)
        dup_result = await db.execute(select(Role).where(Role.name == body.name))
        dup = dup_result.scalar_one_or_none()
        if dup:
            logger.debug("update_role: name conflict: '%s' is_deleted=%s", body.name, dup.is_deleted)
            if dup.is_deleted:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f'A role named "{body.name}" was previously deleted. Please choose a different name.',
                )
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f'Role "{body.name}" already exists.')
        changes.append(("name", role.name, body.name))
        role.name = body.name

    if body.description is not None and body.description != role.description:
        logger.debug("update_role: description change for role_id=%s", role_id)
        changes.append(("description", role.description, body.description))
        role.description = body.description

    logger.debug("update_role: applying %d changes for role_id=%s", len(changes), role_id)
    role.updated_by = str(admin.id)
    role.updated_at = datetime.now(timezone.utc)
    if changes:
        log_audit(
            db, user_id=admin.id, user_email=admin.email, action="update",
            entity_type="role", entity_id=role.id, changes=changes,
        )
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
    logger.debug("delete_role: role_id=%s by admin_id=%s", role_id, admin.id)
    result = await db.execute(select(Role).where(Role.id == role_id, Role.is_deleted == False))
    role = result.scalar_one_or_none()
    if role is None:
        logger.debug("delete_role: role_id=%s not found", role_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    role.is_deleted = True
    role.updated_by = str(admin.id)
    role.updated_at = datetime.now(timezone.utc)

    log_audit(
        db, user_id=admin.id, user_email=admin.email, action="delete",
        entity_type="role", entity_id=role.id,
        changes=[(None, role.name, None)],
    )

    logger.debug("delete_role: soft-deleting role id=%s name=%s", role_id, role.name)
    # Remove the deleted role from all users
    logger.debug("delete_role: scanning all users to remove role '%s'", role.name)
    users_result = await db.execute(select(User).where(User.is_deleted == False))
    affected_users = 0
    for user in users_result.scalars().all():
        user_roles = parse_roles(user.roles)
        if role.name in user_roles:
            old_roles = encode_roles(user_roles)
            user_roles.remove(role.name)
            user.roles = encode_roles(user_roles)
            user.updated_at = datetime.now(timezone.utc)
            user.updated_by = str(admin.id)
            logger.debug("delete_role: removed role '%s' from user_id=%s", role.name, user.id)
            affected_users += 1
            log_audit(
                db, user_id=admin.id, user_email=admin.email, action="update",
                entity_type="user", entity_id=user.id,
                changes=[("roles", old_roles, user.roles)],
            )

    logger.debug("delete_role: role '%s' removed from %d users", role.name, affected_users)
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
    logger.debug("list_users: requested by admin_id=%s", admin.id)
    result = await db.execute(select(User).where(User.is_deleted == False).order_by(User.id))
    users = result.scalars().all()
    logger.debug("list_users: returning %d users", len(users))
    return [_admin_user_response(u) for u in users]


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("get_user: user_id=%s requested by admin_id=%s", user_id, admin.id)
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if user is None:
        logger.debug("get_user: user_id=%s not found", user_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    logger.debug("get_user: found user email=%s", user.email)
    return _admin_user_response(user)


@router.post("/users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: AdminUserCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("create_user: email=%s roles=%s by admin_id=%s", body.email, body.roles, admin.id)
    logger.debug("create_user: checking uniqueness for email=%s", body.email)
    result = await db.execute(select(User).where(User.email == body.email))
    existing = result.scalar_one_or_none()
    if existing:
        logger.debug("create_user: email conflict: email=%s is_deleted=%s", body.email, existing.is_deleted)
        if existing.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f'A user with email "{body.email}" was previously deleted. Please use a different email.',
            )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f'A user with email "{body.email}" already exists.')

    logger.debug("create_user: email available, persisting new user email=%s", body.email)
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
    logger.debug("create_user: persisted user id=%s email=%s", user.id, user.email)
    log_audit(
        db, user_id=admin.id, user_email=admin.email, action="create",
        entity_type="user", entity_id=user.id,
        changes=[(None, None, f"User created: {user.email}")],
    )
    await db.commit()
    logger.info("User created by admin: %s (by %s)", user.email, admin.id)
    return _admin_user_response(user)


@router.put("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    body: AdminUserUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("update_user: user_id=%s by admin_id=%s fields=%s", user_id, admin.id, body.model_fields_set)
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if user is None:
        logger.debug("update_user: user_id=%s not found", user_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    changes: list[tuple[str | None, str | None, str | None]] = []

    if body.email is not None and body.email != user.email:
        logger.debug("update_user: email change '%s' -> '%s', checking uniqueness", user.email, body.email)
        dup_result = await db.execute(select(User).where(User.email == body.email))
        dup = dup_result.scalar_one_or_none()
        if dup:
            logger.debug("update_user: email conflict: '%s' is_deleted=%s", body.email, dup.is_deleted)
            if dup.is_deleted:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f'A user with email "{body.email}" was previously deleted. Please use a different email.',
                )
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f'A user with email "{body.email}" already exists.')
        changes.append(("email", user.email, body.email))
        user.email = body.email

    for field in ("first_name", "last_name", "display_name"):
        new_val = getattr(body, field)
        if new_val is not None and new_val != getattr(user, field):
            logger.debug("update_user: field change %s '%s' -> '%s'", field, getattr(user, field), new_val)
            changes.append((field, getattr(user, field), new_val))
            setattr(user, field, new_val)

    if body.password is not None:
        logger.debug("update_user: password reset for user_id=%s", user_id)
        user.hashed_password = hash_password(body.password)
        changes.append(("password", "***", "***"))

    if body.password_change_required is not None and body.password_change_required != user.password_change_required:
        logger.debug(
            "update_user: password_change_required %s -> %s for user_id=%s",
            user.password_change_required, body.password_change_required, user_id,
        )
        changes.append(("password_change_required", str(user.password_change_required), str(body.password_change_required)))
        user.password_change_required = body.password_change_required

    logger.debug("update_user: applying %d changes for user_id=%s", len(changes), user_id)
    user.updated_by = str(admin.id)
    user.updated_at = datetime.now(timezone.utc)
    if changes:
        log_audit(
            db, user_id=admin.id, user_email=admin.email, action="update",
            entity_type="user", entity_id=user.id, changes=changes,
        )
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
    logger.debug("delete_user: user_id=%s by admin_id=%s", user_id, admin.id)
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if user is None:
        logger.debug("delete_user: user_id=%s not found or already deleted", user_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    logger.debug("delete_user: soft-deleting user_id=%s email=%s", user.id, user.email)
    user.is_deleted = True
    user.updated_by = str(admin.id)
    user.updated_at = datetime.now(timezone.utc)
    log_audit(
        db, user_id=admin.id, user_email=admin.email, action="delete",
        entity_type="user", entity_id=user.id,
        changes=[(None, user.email, None)],
    )
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
    logger.debug("update_user_roles: user_id=%s new_roles=%s by admin_id=%s", user_id, body.roles, admin.id)
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if user is None:
        logger.debug("update_user_roles: user_id=%s not found", user_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    old_roles = user.roles
    logger.debug("update_user_roles: changing roles for user_id=%s: %s -> %s", user.id, old_roles, body.roles)
    user.roles = encode_roles(body.roles)
    user.updated_by = str(admin.id)
    user.updated_at = datetime.now(timezone.utc)
    log_audit(
        db, user_id=admin.id, user_email=admin.email, action="update",
        entity_type="user", entity_id=user.id,
        changes=[("roles", old_roles, user.roles)],
    )
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
