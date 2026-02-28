import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, get_db
from app.auth.models import User
from app.auth.schemas import (
    LoginRequest,
    MessageResponse,
    PasswordChangeRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.audit.service import log_audit
from app.auth.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    encode_roles,
    hash_password,
    parse_roles,
    revoke_token,
    verify_password,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    logger.debug("Register attempt: email=%s display_name=%s", body.email, body.display_name)
    # Check if email already exists
    logger.debug("Checking for existing account with email=%s", body.email)
    result = await db.execute(select(User).where(User.email == body.email))
    existing = result.scalar_one_or_none()
    if existing is not None:
        logger.debug("Email conflict: email=%s is_deleted=%s", body.email, existing.is_deleted)
        if existing.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f'An account with email "{body.email}" was previously deleted. Please use a different email.',
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f'An account with email "{body.email}" already exists.',
        )

    logger.debug("Email available, creating new user: email=%s", body.email)
    user = User(
        first_name=body.first_name,
        last_name=body.last_name,
        display_name=body.display_name,
        email=body.email,
        hashed_password=hash_password(body.password),
        roles=encode_roles(["user"]),
        created_by="self",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.debug("User persisted: id=%s email=%s", user.id, user.email)
    log_audit(
        db, user_id=user.id, user_email=user.email, action="create",
        entity_type="user", entity_id=user.id,
        changes=[(None, None, f"User registered: {user.email}")],
    )
    await db.commit()
    logger.info("User registered: %s", user.email)
    return _user_to_response(user)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    logger.debug("Login attempt: email=%s", body.email)
    result = await db.execute(
        select(User).where(User.email == body.email, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if user is None:
        logger.debug("Login failed: no active user found for email=%s", body.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    logger.debug("User found: id=%s email=%s, verifying password", user.id, user.email)
    if not verify_password(body.password, user.hashed_password):
        logger.debug("Login failed: password mismatch for user_id=%s", user.id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    logger.debug("Password verified, updating last_login_at for user_id=%s", user.id)
    old_login = str(user.last_login_at) if user.last_login_at else None
    user.last_login_at = datetime.now(timezone.utc)
    log_audit(
        db, user_id=user.id, user_email=user.email, action="update",
        entity_type="user", entity_id=user.id,
        changes=[("last_login_at", old_login, str(user.last_login_at))],
    )
    await db.commit()

    logger.debug("Issuing tokens for user_id=%s", user.id)
    logger.info("User logged in: %s", user.email)
    return TokenResponse(
        access_token=create_access_token(user.id, user.email),
        refresh_token=create_refresh_token(user.id),
    )


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    logger.debug("Profile fetch: user_id=%s email=%s", user.id, user.email)
    return _user_to_response(user)


@router.post("/logout", response_model=MessageResponse)
async def logout(user: User = Depends(get_current_user)):
    # The access token is already validated by get_current_user.
    # We don't revoke access tokens (they're short-lived); just confirm logout.
    logger.debug("Logout: user_id=%s email=%s", user.id, user.email)
    logger.info("User logged out: %s", user.email)
    return MessageResponse(message="Logged out successfully")


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    logger.debug("Token refresh attempt (first 20 chars: %s...)", token[:20] if token else "")
    payload = decode_token(token)
    if payload is None or payload.get("type") != "refresh":
        logger.debug(
            "Refresh failed: payload=%s type=%s",
            "None" if payload is None else "present",
            payload.get("type") if payload else "N/A",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = int(payload["sub"])
    logger.debug("Refresh token valid, looking up user_id=%s", user_id)
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if user is None:
        logger.debug("Refresh failed: user_id=%s not found or deleted", user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    logger.debug("Revoking old refresh token for user_id=%s", user_id)
    # Revoke old refresh token
    revoke_token(token)

    logger.debug("Issuing new token pair for user_id=%s", user_id)
    logger.info("Token refreshed for user: %s", user.email)
    return TokenResponse(
        access_token=create_access_token(user.id, user.email),
        refresh_token=create_refresh_token(user.id),
    )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    body: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("Profile update request: user_id=%s email=%s fields=%s", user.id, user.email, body.model_fields_set)
    if body.email and body.email != user.email:
        logger.debug("Email change requested: old=%s new=%s, checking uniqueness", user.email, body.email)
        # Check uniqueness
        result = await db.execute(select(User).where(User.email == body.email))
        dup = result.scalar_one_or_none()
        if dup is not None:
            logger.debug("Email conflict: %s is_deleted=%s", body.email, dup.is_deleted)
            if dup.is_deleted:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f'The email "{body.email}" was previously used by a deleted account. Please use a different email.',
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f'The email "{body.email}" is already in use.',
            )

    changes: list[tuple[str | None, str | None, str | None]] = []
    for field in ("first_name", "last_name", "display_name", "email"):
        new_val = getattr(body, field)
        if new_val is not None:
            old_val = getattr(user, field)
            if new_val != old_val:
                logger.debug("Field change: %s '%s' -> '%s'", field, old_val, new_val)
                changes.append((field, str(old_val), str(new_val)))
            setattr(user, field, new_val)

    logger.debug("Profile update changes count: %d for user_id=%s", len(changes), user.id)
    user.updated_by = str(user.id)
    user.updated_at = datetime.now(timezone.utc)
    if changes:
        log_audit(
            db, user_id=user.id, user_email=user.email, action="update",
            entity_type="user", entity_id=user.id, changes=changes,
        )
    await db.commit()
    await db.refresh(user)
    logger.info("Profile updated: %s", user.email)
    return _user_to_response(user)


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    body: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("Password change request: user_id=%s email=%s", user.id, user.email)
    logger.debug("Verifying current password for user_id=%s", user.id)
    if not verify_password(body.current_password, user.hashed_password):
        logger.debug("Password change failed: current password incorrect for user_id=%s", user.id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    logger.debug("Current password verified, hashing new password for user_id=%s", user.id)
    old_pcr = user.password_change_required
    user.hashed_password = hash_password(body.new_password)
    user.password_change_required = False
    user.updated_by = str(user.id)
    user.updated_at = datetime.now(timezone.utc)
    changes: list[tuple[str | None, str | None, str | None]] = [
        ("password", "***", "***"),
    ]
    if old_pcr != user.password_change_required:
        logger.debug(
            "password_change_required cleared: user_id=%s old=%s new=%s",
            user.id, old_pcr, user.password_change_required,
        )
        changes.append(("password_change_required", str(old_pcr), str(user.password_change_required)))
    log_audit(
        db, user_id=user.id, user_email=user.email, action="update",
        entity_type="user", entity_id=user.id, changes=changes,
    )
    await db.commit()
    logger.info("Password changed: %s", user.email)
    return MessageResponse(message="Password changed successfully")


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        display_name=user.display_name,
        email=user.email,
        roles=parse_roles(user.roles),
        last_login_at=user.last_login_at,
        password_change_required=user.password_change_required,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )
