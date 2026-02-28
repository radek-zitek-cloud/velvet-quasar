import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.auth.security import decode_token
from app.database import async_session

logger = logging.getLogger(__name__)

security = HTTPBearer()


async def get_db() -> AsyncSession:
    logger.debug("Opening new database session")
    async with async_session() as session:
        yield session
    logger.debug("Database session closed")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    logger.debug("Authenticating request via Bearer token (first 20 chars: %s...)", token[:20])
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        logger.debug(
            "Token validation failed: payload=%s type=%s",
            "None" if payload is None else "present",
            payload.get("type") if payload else "N/A",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = int(payload["sub"])
    logger.debug("Token valid, looking up user_id=%s", user_id)
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if user is None:
        logger.debug("User not found or deleted: user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    logger.debug("Authenticated user: id=%s email=%s roles=%s", user.id, user.email, user.roles)
    return user
