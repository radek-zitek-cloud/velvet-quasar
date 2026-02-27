import logging
from pathlib import Path

from alembic import command
from alembic.config import Config as AlembicConfig
from alembic.runtime.migration import MigrationContext
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import DATA_DIR, settings

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.database_url, echo=settings.debug)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

ALEMBIC_CFG_PATH = Path(__file__).resolve().parent.parent / "alembic.ini"


def _get_alembic_config() -> AlembicConfig:
    cfg = AlembicConfig(str(ALEMBIC_CFG_PATH))
    # Override sqlalchemy.url so Alembic uses the same URL as the app.
    # For SQLite, Alembic runs synchronously — strip the async driver.
    sync_url = settings.database_url.replace("+aiosqlite", "")
    cfg.set_main_option("sqlalchemy.url", sync_url)
    return cfg


def run_migrations() -> None:
    """Run Alembic migrations to head (synchronous, called at startup)."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    cfg = _get_alembic_config()
    logger.info("Running Alembic migrations to head")
    command.upgrade(cfg, "head")
    logger.info("Migrations complete")


async def get_db_info() -> dict:
    """Return live database info for the health endpoint."""
    try:
        async with engine.connect() as conn:
            # Detect DB type from dialect
            dialect_name = engine.dialect.name  # "sqlite", "postgresql", etc.

            # Get database name
            if dialect_name == "sqlite":
                row = await conn.execute(text("PRAGMA database_list"))
                db_name = Path(row.fetchone()[2]).name if row else "unknown"
            else:
                row = await conn.execute(text("SELECT current_database()"))
                db_name = row.scalar() or "unknown"

            # Get Alembic version
            def _get_alembic_rev(connection):
                ctx = MigrationContext.configure(connection)
                return ctx.get_current_revision()

            alembic_rev = await conn.run_sync(_get_alembic_rev)

            return {
                "type": dialect_name,
                "name": db_name,
                "status": "healthy",
                "alembic_revision": alembic_rev,
            }
    except Exception as e:
        logger.error("Database health check failed: %s", e)
        return {
            "type": "unknown",
            "name": "unknown",
            "status": "unhealthy",
            "alembic_revision": None,
        }
