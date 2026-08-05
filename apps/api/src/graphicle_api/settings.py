from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# Local Supabase default; `supabase/config.toml` sets db.port = 54332.
LOCAL_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@127.0.0.1:54332/postgres"


class Settings(BaseSettings):
    """Runtime configuration, read from the environment or a local .env file.

    Secrets are never defaulted to a real value — an unset ANTHROPIC_API_KEY
    stays None so the failure is a clear startup error rather than a confusing
    401 at request time.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = "development"

    # Use Supabase's *direct* connection, not the Supavisor pooler: this API is a
    # long-lived container with its own SQLAlchemy pool, which is the case the
    # pooler is not for.
    database_url: str = LOCAL_DATABASE_URL
    db_pool_size: int = 5
    db_max_overflow: int = 5

    # Provider is a swappable model string, not a hardcoded vendor.
    llm_model: str = "anthropic:claude-opus-5"
    anthropic_api_key: str | None = None

    # Only used in the fallback deployment shape where the API is public rather
    # than a Render private service. Empty means "same-origin only".
    cors_origins: list[str] = []

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
