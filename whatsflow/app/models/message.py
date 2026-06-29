"""
Modèle Message - Représente un message WhatsApp envoyé ou reçu
"""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum


class MessageType(str, enum.Enum):
    """Types de messages supportés"""
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"
    AUDIO = "audio"
    STICKER = "sticker"
    LOCATION = "location"
    TEMPLATE = "template"


class MessageDirection(str, enum.Enum):
    """Direction du message"""
    OUTBOUND = "outbound"  # Envoyé
    INBOUND = "inbound"    # Reçu


class MessageStatus(str, enum.Enum):
    """Statut du message"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class Message(Base):
    """Modèle représentant un message WhatsApp"""
    
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, default=lambda: f"msg_{uuid.uuid4().hex[:12]}")
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    
    # Informations du message
    direction = Column(Enum(MessageDirection), nullable=False)
    message_type = Column(Enum(MessageType), default=MessageType.TEXT)
    status = Column(Enum(MessageStatus), default=MessageStatus.PENDING)
    
    # Contenu
    to_number = Column(String(50), nullable=True)
    from_number = Column(String(50), nullable=True)
    content = Column(Text, nullable=True)
    media_url = Column(Text, nullable=True)
    
    # Métadonnées
    whatsapp_message_id = Column(String(255), nullable=True, unique=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    session = relationship("Session", back_populates="messages")
    
    def __repr__(self):
        return f"<Message {self.id} - {self.direction.value} - {self.status.value}>"
