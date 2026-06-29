"""
Script pour créer un client de test (Swift AI)
"""
import asyncio
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.client import Client
from app.core.security import generate_api_key
from app.core.config import settings


async def create_test_client():
    """Créer un client de test Swift AI"""
    
    # Créer le moteur de base de données
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Créer le client Swift AI
        swift_ai_client = Client(
            name="Swift AI",
            email="contact@swiftai.com",
            api_key=generate_api_key(),
            description="Premier client pilote de WhatsFlow",
            max_sessions=10,
            messages_per_second=2,
            is_active=True
        )
        
        session.add(swift_ai_client)
        await session.commit()
        await session.refresh(swift_ai_client)
        
        print("\n" + "="*60)
        print("✅ Client de test créé avec succès!")
        print("="*60)
        print(f"Nom: {swift_ai_client.name}")
        print(f"Email: {swift_ai_client.email}")
        print(f"Client ID: {swift_ai_client.id}")
        print(f"API Key: {swift_ai_client.api_key}")
        print(f"Max Sessions: {swift_ai_client.max_sessions}")
        print(f"Messages/sec: {swift_ai_client.messages_per_second}")
        print("="*60)
        print("\n💡 Utilisez cette API Key pour tester l'API:")
        print(f"   Authorization: Bearer {swift_ai_client.api_key}")
        print("="*60 + "\n")
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_test_client())
