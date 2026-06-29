"""
Schémas Pydantic pour les clients
"""
from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional
from datetime import datetime


class ClientBase(BaseModel):
    """Schéma de base pour un client"""
    name: str = Field(..., min_length=3, max_length=255)
    email: EmailStr
    description: Optional[str] = None
    webhook_url: Optional[str] = Field(None, description="URL notifiée à chaque message reçu")
    webhook_secret: Optional[str] = Field(None, description="Secret pour vérifier les webhooks")


class ClientCreate(ClientBase):
    """Schéma pour créer un client"""
    max_sessions: int = Field(default=5, ge=1, le=50)
    messages_per_second: int = Field(default=1, ge=1, le=10)


class ClientResponse(ClientBase):
    """Schéma de réponse pour un client"""
    id: str
    api_key: str
    max_sessions: int
    messages_per_second: int
    is_active: bool
    webhook_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ClientUpdate(BaseModel):
    """Schéma pour mettre à jour un client"""
    name: Optional[str] = Field(None, min_length=3, max_length=255)
    email: Optional[EmailStr] = None
    description: Optional[str] = None
    max_sessions: Optional[int] = Field(None, ge=1, le=50)
    messages_per_second: Optional[int] = Field(None, ge=1, le=10)
    is_active: Optional[bool] = None
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None