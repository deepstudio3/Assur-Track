"""
Configuration de l'application WhatsFlow
Gestion des variables d'environnement via Pydantic Settings
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    """Configuration globale de l'application"""
    
    # API Configuration
    API_HOST: str = Field(default="0.0.0.0", env="API_HOST")
    API_PORT: int = Field(default=8000, env="API_PORT")
    API_BASE_URL: str = Field(default="http://localhost:8000", env="API_BASE_URL")
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    
    # Database Configuration
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    POSTGRES_USER: str = Field(..., env="POSTGRES_USER")
    POSTGRES_PASSWORD: str = Field(..., env="POSTGRES_PASSWORD")
    POSTGRES_DB: str = Field(..., env="POSTGRES_DB")
    POSTGRES_HOST: str = Field(default="postgres", env="POSTGRES_HOST")
    POSTGRES_PORT: int = Field(default=5432, env="POSTGRES_PORT")
    
    # Redis Configuration
    REDIS_URL: str = Field(default="redis://redis:6379", env="REDIS_URL")
    REDIS_HOST: str = Field(default="redis", env="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, env="REDIS_PORT")
    
    # Security
    JWT_SECRET: str = Field(..., env="JWT_SECRET")
    JWT_ALGORITHM: str = Field(default="HS256", env="JWT_ALGORITHM")
    JWT_EXPIRATION_HOURS: int = Field(default=24, env="JWT_EXPIRATION_HOURS")
    API_KEY_LENGTH: int = Field(default=32, env="API_KEY_LENGTH")
    
    # WhatsApp / OpenWA Configuration
    OPENWA_PORT: int = Field(default=3010, env="OPENWA_PORT")
    WHATSAPP_BRIDGE_HOST: str = Field(default="localhost", env="WHATSAPP_BRIDGE_HOST")
    WHATSAPP_BASE_PORT: int = Field(default=3010, env="WHATSAPP_BASE_PORT")
    OPENWA_API_URL: str = Field(default="http://whatsapp-service:3000", env="OPENWA_API_URL")
    SESSION_TIMEOUT_MINUTES: int = Field(default=30, env="SESSION_TIMEOUT_MINUTES")
    MAX_SESSIONS_PER_CLIENT: int = Field(default=5, env="MAX_SESSIONS_PER_CLIENT")
    MAX_CLIENTS: int = Field(default=50, env="MAX_CLIENTS")
    
    # Rate Limiting
    RATE_LIMIT_MESSAGES_PER_SECOND: int = Field(default=1, env="RATE_LIMIT_MESSAGES_PER_SECOND")
    RATE_LIMIT_API_REQUESTS_PER_MINUTE: int = Field(default=60, env="RATE_LIMIT_API_REQUESTS_PER_MINUTE")
    
    # Monitoring
    ENABLE_METRICS: bool = Field(default=True, env="ENABLE_METRICS")
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Instance globale des settings
settings = Settings()
