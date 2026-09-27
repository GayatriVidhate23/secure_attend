from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    app_name: str = "SecureAttend Server"
    environment: str = "development"
    database_url: str = "sqlite:///./secureattend.db"
    cors_origins: list[str] = ["*"]

    # JWT Settings
    jwt_secret_key: str = "default_unsafe_secret_key_change_in_production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

@lru_cache
def get_settings() -> Settings:
    return Settings()
