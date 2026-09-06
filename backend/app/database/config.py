import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CallGuard AI"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./callguard.db")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    TRUECALLER_API_KEY: str = os.getenv("TRUECALLER_API_KEY", "")
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    DATA_RETENTION_DAYS: int = 30
    STORE_RAW_AUDIO: bool = False

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
