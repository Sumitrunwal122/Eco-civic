import os
from pathlib import Path
from typing import List
from datetime import datetime
import pytz
from pydantic_settings import BaseSettings
from pydantic import Field

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    # App Information
    APP_NAME: str = "Civic Tech Waste Management ULB"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Timezone & Localization (Swachh Bharat Abhiyan Standard: Asia/Kolkata)
    TIMEZONE: str = "Asia/Kolkata"

    # Database
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "civic_waste_db"

    # Security & JWT Auth
    JWT_SECRET: str = "ulb-swachh-bharat-secret-key-2026-production-grade"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Google Gemini Vision API
    GEMINI_API_KEY: str = Field(default="", env="GEMINI_API_KEY")
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Municipal ULB Information
    MUNICIPAL_NAME: str = "Jodhpur Nagar Palika(JNP)"
    MUNICIPAL_CODE: str = "ULB-RJ-JDH-01"
    DEFAULT_LATITUDE: float = 26.2389
    DEFAULT_LONGITUDE: float = 73.0243

    # File Storage
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    MAX_FILE_SIZE_MB: int = 10

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "https://eco-civic-five.vercel.app"]

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"

    @property
    def ist_timezone(self):
        return pytz.timezone(self.TIMEZONE)

    def get_current_ist_time(self) -> datetime:
        """Returns current datetime in Asia/Kolkata timezone."""
        return datetime.now(self.ist_timezone)


settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
