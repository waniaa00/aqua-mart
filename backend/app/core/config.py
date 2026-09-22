from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://fishshop:fishshop@localhost:5433/fishshop_dev"
    SECRET_KEY: str = "replace-with-a-long-random-value"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:5173"
    EXCHANGE_RATE_API_BASE: str = "https://open.er-api.com/v6"
    EXCHANGE_RATE_CACHE_TTL_HOURS: int = 12

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
