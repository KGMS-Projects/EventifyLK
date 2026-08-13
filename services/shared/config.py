"""Shared configuration for all EventSphere services."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class BaseServiceSettings(BaseSettings):
    """Base settings shared across all services."""
    DATABASE_URL: str = "postgresql+asyncpg://eventsphere:eventsphere_dev@localhost:5432/eventsphere"
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_SECRET: str = "eventsphere-jwt-secret-dev-only"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000"
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        extra = "allow"
