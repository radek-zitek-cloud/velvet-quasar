import json
import logging
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.config import settings

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# In-memory set of revoked JTIs (for logout). In production, use Redis or DB.
_revoked_tokens: set[str] = set()


def hash_password(password: str) -> str:
    logger.debug("Hashing password (bcrypt)")
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    logger.debug("Password hashed successfully")
    return hashed


def verify_password(plain_password: str, hashed_password: str) -> bool:
    logger.debug("Verifying password against stored hash")
    result = bcrypt.checkpw(plain_password.encode(), hashed_password.encode())
    logger.debug("Password verification result: %s", result)
    return result


def create_access_token(user_id: int, email: str) -> str:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    logger.debug(
        "Creating access token for user_id=%s email=%s expires_at=%s",
        user_id, email, expires_at.isoformat(),
    )
    payload = {
        "sub": str(user_id),
        "email": email,
        "type": "access",
        "iat": now,
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)
    logger.debug("Access token created for user_id=%s", user_id)
    return token


def create_refresh_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    import uuid

    jti = uuid.uuid4().hex
    expires_at = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    logger.debug(
        "Creating refresh token for user_id=%s jti=%s expires_at=%s",
        user_id, jti, expires_at.isoformat(),
    )
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "jti": jti,
        "iat": now,
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)
    logger.debug("Refresh token created for user_id=%s jti=%s", user_id, jti)
    return token


def decode_token(token: str) -> dict | None:
    logger.debug("Decoding JWT token (first 20 chars: %s...)", token[:20] if token else "")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        token_type = payload.get("type")
        user_id = payload.get("sub")
        jti = payload.get("jti")
        logger.debug("Token decoded: type=%s user_id=%s jti=%s", token_type, user_id, jti)
        if jti and jti in _revoked_tokens:
            logger.debug("Token jti=%s is revoked, rejecting", jti)
            return None
        return payload
    except JWTError as exc:
        logger.debug("JWT decode failed: %s", exc)
        return None


def revoke_token(token: str) -> None:
    logger.debug("Revoking token (first 20 chars: %s...)", token[:20] if token else "")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        if jti:
            _revoked_tokens.add(jti)
            logger.debug("Token revoked: jti=%s (total revoked: %d)", jti, len(_revoked_tokens))
        else:
            logger.debug("Token has no jti, nothing to revoke")
    except JWTError as exc:
        logger.debug("Could not decode token for revocation: %s", exc)


def parse_roles(roles_json: str) -> list[str]:
    try:
        roles = json.loads(roles_json)
        logger.debug("Parsed roles: %s", roles)
        return roles
    except (json.JSONDecodeError, TypeError) as exc:
        logger.debug("Failed to parse roles JSON '%s': %s", roles_json, exc)
        return []


def encode_roles(roles: list[str]) -> str:
    encoded = json.dumps(roles)
    logger.debug("Encoded roles: %s", encoded)
    return encoded
