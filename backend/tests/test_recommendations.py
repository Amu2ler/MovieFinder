"""Tests for recommendation endpoints."""

import pytest


async def _user_with_likes(client, n_likes=3):
    """Create a user and like n movies to populate the taste vector."""
    user_id = (await client.post("/users")).json()["id"]
    movies = (await client.get("/movies/onboarding")).json()
    for movie in movies[:n_likes]:
        await client.post(
            "/interactions",
            json={"user_id": user_id, "movie_id": movie["id"], "action": "like"},
        )
    return user_id


@pytest.mark.asyncio
async def test_recommendations_after_likes(client):
    user_id = await _user_with_likes(client)

    resp = await client.get(f"/recommendations/{user_id}")
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


@pytest.mark.asyncio
async def test_recommendations_cold_start(client):
    """User with no interactions should still get recommendations."""
    user_id = (await client.post("/users")).json()["id"]

    resp = await client.get(f"/recommendations/{user_id}")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_recommendations_limit(client):
    user_id = await _user_with_likes(client)

    resp = await client.get(f"/recommendations/{user_id}?limit=5")
    assert resp.status_code == 200
    assert len(resp.json()) <= 5


@pytest.mark.asyncio
async def test_why_this(client):
    user_id = await _user_with_likes(client)
    recs = (await client.get(f"/recommendations/{user_id}")).json()
    assert len(recs) > 0
    movie_id = recs[0]["movie"]["id"]

    resp = await client.get(f"/recommendations/{user_id}/why/{movie_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "reasons" in data
    assert isinstance(data["reasons"], list)
    assert len(data["reasons"]) > 0
