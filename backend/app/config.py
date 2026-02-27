from pathlib import Path

from pydantic_settings import BaseSettings

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
LOGS_DIR = PROJECT_ROOT / "logs"
DATA_DIR = PROJECT_ROOT / "data"


class Settings(BaseSettings):
    app_name: str = "velvet-quasar"
    app_env: str = "development"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "debug"
    database_url: str = f"sqlite+aiosqlite:///{DATA_DIR / 'velvet_quasar.db'}"
    jwt_secret: str = "change-me-in-production"

    model_config = {
        "env_file": str(PROJECT_ROOT / ".env"),
        "extra": "ignore",
    }


settings = Settings()
