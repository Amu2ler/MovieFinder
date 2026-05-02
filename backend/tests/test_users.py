"""Tests for user creation and management."""

import pytest


@pytest.mark.asyncio
async def test_create_user(client):
    response = await client.post("/users")
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert "session_token" in data
    assert len(data["session_token"]) > 0
    assert len(data["taste_vector"]) == 20
    assert all(v == 0.0 for v in data["taste_vector"])
    assert data["banned_directors"] == []
    assert data["banned_actors"] == []


@pytest.mark.asyncio
async def test_get_me(auth_client):
    client, user_id = auth_client
    resp = await client.get("/users/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == user_id
    # session_token must NOT leak through /users/me
    assert "session_token" not in data


@pytest.mark.asyncio
async def test_get_me_without_token(client):
    resp = await client.get("/users/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_with_invalid_token(client):
    client.headers["Authorization"] = "Bearer not-a-real-token"
    resp = await client.get("/users/me")
    client.headers.pop("Authorization")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_ban_director(auth_client):
    client, _ = auth_client
    resp = await client.patch(
        "/users/me/hate",
        json={"type": "director", "name": "Michael Bay"},
    )
    assert resp.status_code == 200
    assert "Michael Bay" in resp.json()["banned_directors"]


@pytest.mark.asyncio
async def test_ban_actor(auth_client):
    client, _ = auth_client
    resp = await client.patch(
        "/users/me/hate",
        json={"type": "actor", "name": "Adam Sandler"},
    )
    assert resp.status_code == 200
    assert "Adam Sandler" in resp.json()["banned_actors"]


@pytest.mark.asyncio
async def test_ban_invalid_type_rejected(auth_client):
    client, _ = auth_client
    resp = await client.patch(
        "/users/me/hate",
        json={"type": "alien", "name": "ET"},
    )
    assert resp.status_code == 422  # Pydantic Literal validation
