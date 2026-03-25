"""Tests for interaction (like/dislike) recording."""

import pytest


async def _setup(client):
    user_id = (await client.post("/users")).json()["id"]
    movies = (await client.get("/movies/onboarding")).json()
    movie_id = movies[0]["id"]
    return user_id, movie_id


@pytest.mark.asyncio
async def test_like_movie(client):
    user_id, movie_id = await _setup(client)

    resp = await client.post(
        "/interactions",
        json={"user_id": user_id, "movie_id": movie_id, "action": "like"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["action"] == "like"
    # Taste vector should be updated (non-zero after a like)
    assert any(v != 0 for v in data["new_taste_vector"])


@pytest.mark.asyncio
async def test_dislike_movie(client):
    user_id, movie_id = await _setup(client)

    resp = await client.post(
        "/interactions",
        json={"user_id": user_id, "movie_id": movie_id, "action": "dislike"},
    )
    assert resp.status_code == 201
    assert resp.json()["action"] == "dislike"


@pytest.mark.asyncio
async def test_invalid_action(client):
    user_id, movie_id = await _setup(client)

    resp = await client.post(
        "/interactions",
        json={"user_id": user_id, "movie_id": movie_id, "action": "meh"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_interaction_unknown_user(client):
    movies = (await client.get("/movies/onboarding")).json()
    movie_id = movies[0]["id"]

    resp = await client.post(
        "/interactions",
        json={"user_id": 99999, "movie_id": movie_id, "action": "like"},
    )
    assert resp.status_code == 404
