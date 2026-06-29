"""
Dépendances FastAPI pour l'authentification et la validation
"""
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import logging

from app.core.database import get_db
from app.models.client import Client

logger = logging.getLogger(__name__)


async def get_current_client(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Client:
    """
    Vérifie l'authentification via API Key et retourne le client
    
    Args:
        authorization: Header Authorization contenant "Bearer <api_key>"
        db: Session de base de données
    
    Returns:
        Client authentifié
    
    Raises:
        HTTPException: Si l'authentification échoue
    """
    if not authorization:
        logger.warning("Authorization header missing")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header manquant"
        )
    
    # Extraire l'API key du header
    try:
        scheme, api_key = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError()
    except ValueError:
        logger.warning(f"Invalid authorization format: {authorization[:20]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Format d'autorisation invalide. Utilisez: Bearer <api_key>"
        )
    
    logger.debug(f"Authenticating with API key: {api_key[:10]}...")
    
    # Rechercher le client par API key
    result = await db.execute(
        select(Client).where(Client.api_key == api_key, Client.is_active == True)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        logger.warning(f"Client not found or inactive for API key: {api_key[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key invalide ou client inactif"
        )
    
    logger.info(f"Client authenticated: {client.name} ({client.id})")
    
    return client
