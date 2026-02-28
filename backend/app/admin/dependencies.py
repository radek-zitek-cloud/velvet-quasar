import json

from fastapi import Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.auth.models import User


async def require_admin(user: User = Depends(get_current_user)) -> User:
    roles = json.loads(user.roles) if user.roles else []
    if "admin" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
