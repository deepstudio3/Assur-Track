"""
Schémas Pydantic pour les sessions WhatsApp
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class SessionStatus(str, Enum):
    """Statuts possibles d'une session"""
    AWAITING_LOGIN = "awaiting_login"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    FAILED = "failed"
    TIMEOUT = "timeout"


class SessionCreate(BaseModel):
    """Schéma pour créer une session"""
    client_id: str
    session_label: str = Field(..., min_length=3, max_length=255)
    # Optionnel : si fourni, connexion par code d'appairage au lieu du QR code.
    # Format : indicatif pays + numéro, sans '+' ni espaces (ex: "237690000000").
    phone_number: Optional[str] = Field(
        default=None,
        description="Numéro WhatsApp (indicatif inclus) pour la connexion par code d'appairage"
    )


class SessionResponse(BaseModel):
    """Schéma de réponse pour une session"""
    id: str
    client_id: str
    session_label: str
    phone_number: Optional[str] = None
    status: SessionStatus
    qr_code: Optional[str] = None
    messages_sent: int
    messages_received: int
    last_active: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class SessionStatusResponse(BaseModel):
    """Schéma de réponse pour le statut d'une session"""
    connected: bool
    phone_number: Optional[str] = None
    client: str
    last_active: Optional[datetime] = None
    session_health: str
    messages_today: int
