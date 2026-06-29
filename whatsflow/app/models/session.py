"""
Modèle Session - Représente une session WhatsApp active
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum


class SessionStatus(str, enum.Enum):
    """Statuts possibles d'une session"""
    AWAITING_LOGIN = "awaiting_login"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    FAILED = "failed"
    TIMEOUT = "timeout"


class Session(Base):
    """Modèle représentant une session WhatsApp"""
    
    __tablename__ = "sessions"
    
    id = Column(String, primary_key=True, default=lambda: f"sess_{uuid.uuid4().hex[:12]}")
    client_id = Column(String, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    
    # Informations de session
    session_label = Column(String(255), nullable=False)
    phone_number = Column(String(50), nullable=True)
    status = Column(Enum(SessionStatus), default=SessionStatus.AWAITING_LOGIN)
    
    # Données techniques
    container_id = Column(String(255), nullable=True)  # ID du conteneur Docker
    qr_code = Column(Text, nullable=True)  # QR code en base64
    
    # Métriques
    messages_sent = Column(Integer, default=0)
    messages_received = Column(Integer, default=0)
    last_active = Column(DateTime(timezone=True), nullable=True)
    
    # Métadonnées
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    client = relationship("Client", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Session {self.id} - {self.status.value}>"
