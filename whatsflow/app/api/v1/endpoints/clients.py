"""
Endpoints pour la gestion des clients
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
import logging

from app.core.database import get_db
from app.core.security import generate_api_key
from app.core.config import settings
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    db: AsyncSession = Depends(get_db)
):
    """Créer un nouveau client"""
    result = await db.execute(select(func.count(Client.id)))
    client_count = result.scalar()

    if client_count >= settings.MAX_CLIENTS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"La limite de clients ({settings.MAX_CLIENTS}) a été atteinte."
        )

    result = await db.execute(
        select(Client).where(
            (Client.email == client_data.email) | (Client.name == client_data.name)
        )
    )
    existing_client = result.scalar_one_or_none()

    if existing_client:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un client avec ce nom ou cet email existe déjà"
        )

    api_key = generate_api_key()
    new_client = Client(
        name=client_data.name,
        email=client_data.email,
        description=client_data.description,
        api_key=api_key,
        max_sessions=client_data.max_sessions,
        messages_per_second=client_data.messages_per_second,
        webhook_url=client_data.webhook_url,
        webhook_secret=client_data.webhook_secret
    )

    db.add(new_client)
    await db.commit()
    await db.refresh(new_client)

    logger.info(f"Client créé: {new_client.id}")
    return new_client


@router.get("/", response_model=List[ClientResponse])
async def list_clients(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Lister tous les clients"""
    result = await db.execute(
        select(Client).offset(skip).limit(limit)
    )
    clients = result.scalars().all()
    return clients


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Récupérer un client par son ID"""
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client non trouvé"
        )
    return client


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    client_data: ClientUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Mettre à jour un client"""
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client non trouvé"
        )

    update_data = client_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    await db.commit()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Supprimer un client"""
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client non trouvé"
        )

    await db.delete(client)
    await db.commit()
    return None