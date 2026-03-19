"""Environment-backed settings (no secrets in code)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongodb_uri: str = ""
    mongodb_db_name: str = "hrms_lite"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    log_level: str = "INFO"
    # `json` = one JSON object per line (log aggregators); `text` = human-readable (default).
    log_format: str = "text"
    docs_enabled: bool = True


def cors_origin_list(raw: str) -> list[str]:
    return [o.strip() for o in raw.split(",") if o.strip()]
