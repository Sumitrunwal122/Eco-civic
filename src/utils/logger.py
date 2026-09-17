import json
import logging
import logging.config
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict
import pytz

IST = pytz.timezone("Asia/Kolkata")

class JSONLogFormatter(logging.Formatter):
    """
    Structured JSON log formatter for Indian Municipal Civic Tech Waste Management.
    Guarantees timestamps in Asia/Kolkata (IST), and captures endpoints, user details,
    and exception stack traces.
    """
    def format(self, record: logging.LogRecord) -> str:
        # Convert timestamp to Asia/Kolkata
        utc_dt = datetime.utcfromtimestamp(record.created)
        ist_dt = pytz.utc.localize(utc_dt).astimezone(IST)
        
        log_record: Dict[str, Any] = {
            "timestamp": ist_dt.isoformat(),
            "timezone": "Asia/Kolkata",
            "level": record.levelname,
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "message": record.getMessage(),
        }

        # Extra metadata passed via logger.info("...", extra={...})
        if hasattr(record, "endpoint"):
            log_record["endpoint"] = record.endpoint
        if hasattr(record, "method"):
            log_record["method"] = record.method
        if hasattr(record, "status_code"):
            log_record["status_code"] = record.status_code
        if hasattr(record, "client_ip"):
            log_record["client_ip"] = record.client_ip
        if hasattr(record, "user_id"):
            log_record["user_id"] = record.user_id
        if hasattr(record, "ward_no"):
            log_record["ward_no"] = record.ward_no
        if hasattr(record, "duration_ms"):
            log_record["duration_ms"] = record.duration_ms
        if hasattr(record, "event_type"):
            log_record["event_type"] = record.event_type

        # Exception information
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_record, ensure_ascii=False)


def setup_logging():
    """Initializes the logging system using logging_config.json if found, else fallback."""
    config_path = Path(__file__).resolve().parent.parent.parent / "config" / "logging_config.json"
    
    if config_path.exists():
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
            logging.config.dictConfig(config)
            return
        except Exception as e:
            print(f"Warning: Failed to load logging_config.json: {e}", file=sys.stderr)

    # Fallback basic configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONLogFormatter())
    root_logger.handlers = [handler]


def get_logger(name: str) -> logging.Logger:
    """Returns a named logger configured with JSON formatting."""
    return logging.getLogger(name)
