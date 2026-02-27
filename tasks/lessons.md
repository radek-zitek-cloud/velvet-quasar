# Lessons Learned

## CORS: Always configure when frontend and backend are on different ports
- **Mistake**: Wired StatusBar to fetch `localhost:8000/health` from `localhost:3000` without adding CORS middleware to FastAPI
- **Fix**: Added `CORSMiddleware` allowing GET from `http://localhost:3000`
- **Rule**: Any time frontend calls backend directly (different origin), add CORS config in the same PR — don't leave it for a follow-up

## Alembic: env.py must override sqlalchemy.url from app config
- **Mistake**: Default `alembic.ini` has `sqlalchemy.url = driver://user:pass@localhost/dbname`. Running `alembic revision` used that placeholder instead of our real URL
- **Fix**: Set `config.set_main_option("sqlalchemy.url", sync_url)` in `alembic/env.py` using the app's settings
- **Rule**: When setting up Alembic, always override the URL in `env.py` from the app config — never rely on the ini placeholder

## Alembic + async SQLAlchemy: strip the async driver for sync operations
- **Pattern**: App uses `sqlite+aiosqlite://` but Alembic runs synchronously. Must strip `+aiosqlite` (or `+asyncpg` for Postgres) when passing URL to Alembic
- **Rule**: `sync_url = settings.database_url.replace("+aiosqlite", "")` — generalize this if adding Postgres support

## SQLite + Alembic: enable render_as_batch
- **Pattern**: SQLite doesn't support `ALTER TABLE` for many operations. Alembic needs `render_as_batch=True` in `context.configure()` to work around this
- **Rule**: Always set `render_as_batch=True` when SQLite is a target database
