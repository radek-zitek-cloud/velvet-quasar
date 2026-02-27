from pathlib import Path

from pydantic_settings import BaseSettings

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
LOGS_DIR = PROJECT_ROOT / "logs"


class Settings(BaseSettings):
    app_name: str = "velvet-quasar"
    app_env: str = "development"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "debug"

    model_config = {
        "env_file": str(PROJECT_ROOT / ".env"),
        "extra": "ignore",
    }


settings = Settings()
