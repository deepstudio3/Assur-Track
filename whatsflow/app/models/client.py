"""
Modèle Client - Représente une entreprise utilisant l'API WhatsFlow
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class Client(Base):
    """Modèle représentant un client de l'API"""
    
    __tablename__ = "clients"
    
    id = Column(String, primary_key=True, default=lambda: f"client_{uuid.uuid4().hex[:12]}")
    name = Column(String(255), nullable=False, unique=True)
    email = Column(String(255), nullable=False, unique=True)
    api_key = Column(String(255), nullable=False, unique=True, index=True)
    
    # Quotas et limites
    max_sessions = Column(Integer, default=5)
    messages_per_second = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    
    # Webhook — URL notifiée à chaque message reçu
    webhook_url = Column(String(500), nullable=True)
    webhook_secret = Column(String(255), nullable=True)  # Pour vérifier l'authenticité
    
    # Métadonnées
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    sessions = relationship("Session", back_populates="client", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Client {self.name} ({self.id})>"