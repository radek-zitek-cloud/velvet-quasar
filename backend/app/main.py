import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.admin.routes import router as admin_router
from app.audit.routes import router as audit_router
from app.auth.routes import router as auth_router
from app.credit.routes import router as credit_router
from app.config import settings
from app.database import run_migrations
from app.logging_setup import setup_logging
from app.routes import router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.debug("Logging configured: level=%s", settings.log_level)
    logger.info("Starting %s (%s)", settings.app_name, settings.app_env)
    logger.debug("Debug mode: %s, host: %s, port: %s", settings.debug, settings.host, settings.port)
    logger.debug("Running database migrations")
    run_migrations()
    logger.debug("Database migrations complete")
    yield
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(audit_router)
app.include_router(credit_router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = uuid.uuid4().hex[:8]
    start = time.perf_counter()
    logger.debug(
        "Request started: %s %s",
        request.method,
        request.url.path,
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "query_params": str(request.query_params),
            "client": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", ""),
        },
    )
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        "%s %s -> %s (%.2fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    return response
