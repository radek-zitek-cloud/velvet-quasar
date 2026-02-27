import logging
import sys

from pythonjsonlogger.json import JsonFormatter

from app.config import LOGS_DIR, settings


def setup_logging() -> None:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    formatter = JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={"asctime": "timestamp", "levelname": "level"},
    )

    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(formatter)

    file_handler = logging.FileHandler(LOGS_DIR / "api.log")
    file_handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(settings.log_level.upper())
    root.addHandler(stdout_handler)
    root.addHandler(file_handler)
