from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://fishshop:fishshop@localhost:5433/fishshop_dev"
    SECRET_KEY: str = "dev-only-insecure-secret-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_ALGORITHM: str = "HS256"

    CORS_ORIGINS: str = "http://localhost:5173"

    EXCHANGE_RATE_API_BASE: str = "https://open.er-api.com/v6"
    EXCHANGE_RATE_CACHE_TTL_HOURS: int = 12

    SUPPORTED_CURRENCIES: tuple[str, ...] = ("USD", "GBP", "PKR")
    BASE_CURRENCY: str = "USD"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
