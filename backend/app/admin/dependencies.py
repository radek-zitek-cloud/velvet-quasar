import json
import logging

from fastapi import Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.auth.models import User

logger = logging.getLogger(__name__)


async def require_admin(user: User = Depends(get_current_user)) -> User:
    roles = json.loads(user.roles) if user.roles else []
    logger.debug("Admin check for user_id=%s email=%s roles=%s", user.id, user.email, roles)
    if "admin" not in roles:
        logger.debug("Access denied: user_id=%s does not have admin role", user.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    logger.debug("Admin access granted for user_id=%s", user.id)
    return user
