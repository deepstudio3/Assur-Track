import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Add app to path
sys.path.append(os.path.join(os.getcwd()))

from app.core.config import settings
from app.models.client import Client
from app.api.v1.endpoints.clients import create_client
from app.schemas.client import ClientCreate

# Override settings for test
settings.MAX_CLIENTS = 1

async def verify_limit():
    print(f"Testing MAX_CLIENTS limit: {settings.MAX_CLIENTS}")
    
    # Setup database connection
    engine = create_async_engine(settings.DATABASE_URL)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        try:
            # Clean up existing clients for test
            await db.execute(text("DELETE FROM clients"))
            await db.commit()
            print("Cleaned up existing clients")
            
            # Create first client (should succeed)
            print("Creating Client 1...")
            client1_data = ClientCreate(name="Test Client 1", email="test1@example.com")
            await create_client(client1_data, db)
            print("Client 1 created successfully")
            
            # Create second client (should fail)
            print("Creating Client 2...")
            client2_data = ClientCreate(name="Test Client 2", email="test2@example.com")
            try:
                await create_client(client2_data, db)
                print("❌ FAILED: Client 2 should have been rejected")
            except Exception as e:
                if "403" in str(e) or "limit" in str(e).lower():
                    print(f"✅ SUCCESS: Client 2 rejected as expected: {e}")
                else:
                    print(f"❌ FAILED: Unexpected error: {e}")
                    
        except Exception as e:
            print(f"Error during test: {e}")
        finally:
            # Cleanup
            await db.execute(text("DELETE FROM clients WHERE email LIKE 'test%@example.com'"))
            await db.commit()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify_limit())
