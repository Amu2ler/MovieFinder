"""Tests for recommendation endpoints."""

import pytest


async def _user_with_likes(client, n_likes=3):
    """Create a user, authenticate the client, and like n movies."""
    token = (await client.post("/users")).json()["session_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    movies = (await client.get("/movies/onboarding")).json()
    for movie in movies[:n_likes]:
        await client.post(
            "/interactions",
            json={"movie_id": movie["id"], "action": "like"},
        )


@pytest.mark.asyncio
async def test_recommendations_after_likes(client):
    await _user_with_likes(client)

    resp = await client.get("/recommendations")
    assert resp.status_code == 200
    recs = resp.json()
    assert isinstance(recs, list)
    assert len(recs) > 0
    for rec in recs:
        assert "movie" in rec
        assert "id" in rec["movie"]
        assert "title" in rec["movie"]
        assert "score" in rec
        assert "is_exploration" in rec
    client.headers.pop("Authorization", None)


@pytest.mark.asyncio
async def test_recommendations_cold_start(auth_client):
    client, _ = auth_client
    resp = await client.get("/recommendations")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_recommendations_limit(client):
    await _user_with_likes(client)

    resp = await client.get("/recommendations?limit=5")
    assert resp.status_code == 200
    assert len(resp.json()) <= 5
    client.headers.pop("Authorization", None)


@pytest.mark.asyncio
async def test_recommendations_requires_auth(client):
    resp = await client.get("/recommendations")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_why_this(client):
    await _user_with_likes(client)
    recs = (await client.get("/recommendations")).json()
    assert len(recs) > 0
    movie_id = recs[0]["movie"]["id"]

    resp = await client.get(f"/recommendations/why/{movie_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "reasons" in data
    assert isinstance(data["reasons"], list)
    assert len(data["reasons"]) > 0
    client.headers.pop("Authorization", None)
