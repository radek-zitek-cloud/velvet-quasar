from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

from app.config import settings
from app.models import Base
from app.auth.models import User  # noqa: F401 — ensure Alembic sees this model
from app.admin.models import Role  # noqa: F401
from app.audit.models import AuditLog  # noqa: F401
from app.credit.models import CreditCase  # noqa: F401

config = context.config

# Override sqlalchemy.url from app settings (sync driver for Alembic)
sync_url = settings.database_url.replace("+aiosqlite", "")
config.set_main_option("sqlalchemy.url", sync_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # When called programmatically (e.g. from database.run_migrations), a
    # pre-opened connection is injected via cfg.attributes to avoid creating a
    # second engine that could hold a SQLite file lock.
    provided_connection = config.attributes.get("connection", None)
    if provided_connection is not None:
        context.configure(
            connection=provided_connection,
            target_metadata=target_metadata,
            render_as_batch=True,
        )
        with context.begin_transaction():
            context.run_migrations()
        return

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # needed for SQLite ALTER TABLE support
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
