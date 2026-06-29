"""
Schémas Pydantic pour les messages WhatsApp
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class MessageType(str, Enum):
    """Types de messages supportés"""
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"
    AUDIO = "audio"
    STICKER = "sticker"
    LOCATION = "location"


class MessageStatus(str, Enum):
    """Statut du message"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class SendMessageRequest(BaseModel):
    """Schéma pour envoyer un message texte"""
    to: str = Field(..., description="Numéro de téléphone du destinataire")
    message: str = Field(..., min_length=1, max_length=4096)
    composing_ms: Optional[int] = Field(None, ge=0, le=10000, description="Durée de l'indicateur 'en train d'écrire' en ms")


class SendMediaRequest(BaseModel):
    """Schéma pour envoyer un média"""
    to: str = Field(..., description="Numéro de téléphone du destinataire")
    type: MessageType
    url: str = Field(..., description="URL du média")
    caption: Optional[str] = Field(None, max_length=1024)
    filename: Optional[str] = None


class MessageCreate(BaseModel):
    """Schéma pour créer un message"""
    session_id: str
    to_number: str
    content: str
    message_type: MessageType = MessageType.TEXT


class MessageResponse(BaseModel):
    """Schéma de réponse pour un message"""
    status: str
    message_id: str
    timestamp: datetime
    
    class Config:
        from_attributes = True


class MessageDetailResponse(BaseModel):
    """Schéma détaillé de réponse pour un message"""
    id: str
    session_id: str
    direction: str
    message_type: MessageType
    status: MessageStatus
    to_number: Optional[str] = None
    from_number: Optional[str] = None
    content: Optional[str] = None
    media_url: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
