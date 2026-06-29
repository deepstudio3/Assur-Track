"""
Tests unitaires pour l'API WhatsFlow
"""
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_root():
    """Test de la route racine"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "WhatsFlow API"
        assert data["status"] == "running"


@pytest.mark.asyncio
async def test_health_check():
    """Test du health check"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_create_client():
    """Test de création d'un client"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        client_data = {
            "name": "Test Client",
            "email": "test@example.com",
            "description": "Client de test",
            "max_sessions": 5,
            "messages_per_second": 1
        }
        response = await client.post("/api/clients/", json=client_data)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Client"
        assert data["email"] == "test@example.com"
        assert "api_key" in data


@pytest.mark.asyncio
async def test_unauthorized_access():
    """Test d'accès non autorisé"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/session/create", json={
            "client_id": "test",
            "session_label": "test"
        })
        assert response.status_code == 401
