from datetime import datetime, timezone
from importlib.metadata import version, PackageNotFoundError

from fastapi import APIRouter

from app.config import settings

router = APIRouter()


@router.get("/")
async def root():
    return {
        "app": settings.app_name,
        "environment": settings.app_env,
        "message": f"Welcome to {settings.app_name}",
    }


@router.get("/health")
async def health():
    try:
        app_version = version("velvet-quasar-backend")
    except PackageNotFoundError:
        app_version = "unknown"

    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": app_version,
        "database": {
            "type": "postgresql",
            "name": "velvet_quasar",
            "status": "healthy",
        },
    }
