"""Tests for interaction (like/dislike) recording."""

import pytest


async def _first_movie_id(client):
    movies = (await client.get("/movies/onboarding")).json()
    return movies[0]["id"]


@pytest.mark.asyncio
async def test_like_movie(auth_client):
    client, _ = auth_client
    movie_id = await _first_movie_id(client)

    resp = await client.post(
        "/interactions",
        json={"movie_id": movie_id, "action": "like"},
    )
    assert resp.status_code == 201
    assert resp.json()["action"] == "like"


@pytest.mark.asyncio
async def test_dislike_movie(auth_client):
    client, _ = auth_client
    movie_id = await _first_movie_id(client)

    resp = await client.post(
        "/interactions",
        json={"movie_id": movie_id, "action": "dislike"},
    )
    assert resp.status_code == 201
    assert resp.json()["action"] == "dislike"


@pytest.mark.asyncio
async def test_invalid_action_rejected(auth_client):
    client, _ = auth_client
    movie_id = await _first_movie_id(client)

    resp = await client.post(
        "/interactions",
        json={"movie_id": movie_id, "action": "meh"},
    )
    assert resp.status_code == 422  # Pydantic Literal


@pytest.mark.asyncio
async def test_interaction_without_token(client):
    movie_id = await _first_movie_id(client)
    resp = await client.post(
        "/interactions",
        json={"movie_id": movie_id, "action": "like"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_interaction_unknown_movie(auth_client):
    client, _ = auth_client
    resp = await client.post(
        "/interactions",
        json={"movie_id": 999999, "action": "like"},
    )
    assert resp.status_code == 404
