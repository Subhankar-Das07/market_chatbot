from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache
import os


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB:  str = "market_chatbot"


    # Groq (Free LLM)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"

    # App
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    UPLOAD_DIR:      str = "uploads"
    VECTOR_STORE_DIR: str = "vector_store"
    MAX_UPLOAD_MB:   int = 20

    # Auth
    JWT_SECRET_KEY: str = "super_secret_key_change_in_production"
    JWT_ALGORITHM: str = "HS256"

    model_config = ConfigDict(env_file=".env", extra="ignore")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
