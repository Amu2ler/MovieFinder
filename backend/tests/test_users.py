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
async def test_get_user(client):
    create_resp = await client.post("/users")
    user_id = create_resp.json()["id"]

    get_resp = await client.get(f"/users/{user_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == user_id


@pytest.mark.asyncio
async def test_get_nonexistent_user(client):
    response = await client.get("/users/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_ban_director(client):
    user_id = (await client.post("/users")).json()["id"]

    resp = await client.patch(
        f"/users/{user_id}/hate",
        json={"type": "director", "name": "Michael Bay"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "Michael Bay" in data["banned_directors"]


@pytest.mark.asyncio
async def test_ban_actor(client):
    user_id = (await client.post("/users")).json()["id"]

    resp = await client.patch(
        f"/users/{user_id}/hate",
        json={"type": "actor", "name": "Adam Sandler"},
    )
    assert resp.status_code == 200
    assert "Adam Sandler" in resp.json()["banned_actors"]
