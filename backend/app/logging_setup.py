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

    file_handler = logging.FileHandler(LOGS_DIR / "api.json")
    file_handler.setFormatter(formatter)

    # Replace whatever uvicorn (or any prior config) set on the root logger
    # so our format and level are authoritative.
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(settings.log_level.upper())
    root.addHandler(stdout_handler)
    root.addHandler(file_handler)

    # Make uvicorn's named loggers propagate to root instead of keeping
    # their own handler chains, so all traffic flows through our handlers.
    for name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        lg = logging.getLogger(name)
        lg.handlers.clear()
        lg.propagate = True
