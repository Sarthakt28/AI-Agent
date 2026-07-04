import os
from pydantic_settings import BaseSettings
from functools import lru_cache

# Resolve absolute path to .env file relative to this file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_FILE = os.path.join(BASE_DIR, ".env")

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://agent:agent_password@localhost:5434/agentdb"
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    # ChromaDB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8100
    # Gemini
    GEMINI_API_KEY: str = ""
    # JWT Auth
    JWT_SECRET: str = "change-this-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440
    # Agent
    AGENT_MAX_STEPS: int = 10
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    CACHE_TTL_SECONDS: int = 300
    # Upload Settings
    MAX_UPLOAD_SIZE_MB: int = 20
    TEMP_UPLOAD_DIR: str = "temp_uploads"
    # CORS Origins (comma-separated list)
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    class Config:
        env_file = ENV_FILE
        env_file_encoding = "utf-8"
@lru_cache()
def get_settings() -> Settings:
    return Settings()

# Direct import shortcut
settings = get_settings()