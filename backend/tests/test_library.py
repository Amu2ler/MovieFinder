"""Tests for the user library (to_watch / watched lists)."""

import pytest


async def _setup(client):
    user_id = (await client.post("/users")).json()["id"]
    movies = (await client.get("/movies/onboarding")).json()
    movie_id = movies[0]["id"]
    return user_id, movie_id


@pytest.mark.asyncio
async def test_get_empty_library(client):
    user_id = (await client.post("/users")).json()["id"]

    resp = await client.get(f"/library/{user_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["liked"] == []
    assert data["to_watch"] == []
    assert data["watched"] == []


@pytest.mark.asyncio
async def test_add_to_watch(client):
    user_id, movie_id = await _setup(client)

    resp = await client.post(
        f"/library/{user_id}/entries",
        json={"movie_id": movie_id, "list_type": "to_watch"},
    )
    assert resp.status_code == 201
    entry = resp.json()
    assert entry["list_type"] == "to_watch"
    assert entry["movie_id"] == movie_id


@pytest.mark.asyncio
async def test_add_watched_with_rating(client):
    user_id, movie_id = await _setup(client)

    resp = await client.post(
        f"/library/{user_id}/entries",
        json={"movie_id": movie_id, "list_type": "watched", "rating": 8},
    )
    assert resp.status_code == 201
    entry = resp.json()
    assert entry["list_type"] == "watched"
    assert entry["rating"] == 8


@pytest.mark.asyncio
async def test_add_custom_entry(client):
    user_id = (await client.post("/users")).json()["id"]

    resp = await client.post(
        f"/library/{user_id}/entries",
        json={"custom_title": "Mon Film Perso", "list_type": "to_watch"},
    )
    assert resp.status_code == 201
    assert resp.json()["custom_title"] == "Mon Film Perso"


@pytest.mark.asyncio
async def test_update_entry(client):
    user_id, movie_id = await _setup(client)

    post_resp = await client.post(
        f"/library/{user_id}/entries",
        json={"movie_id": movie_id, "list_type": "to_watch"},
    )
    assert post_resp.status_code == 201
    entry_id = post_resp.json()["id"]

    resp = await client.patch(
        f"/library/{user_id}/entries/{entry_id}",
        json={"list_type": "watched", "rating": 9},
    )
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["list_type"] == "watched"
    assert updated["rating"] == 9


@pytest.mark.asyncio
async def test_delete_entry(client):
    user_id, movie_id = await _setup(client)

    post_resp = await client.post(
        f"/library/{user_id}/entries",
        json={"movie_id": movie_id, "list_type": "to_watch"},
    )
    assert post_resp.status_code == 201
    entry_id = post_resp.json()["id"]

    del_resp = await client.delete(f"/library/{user_id}/entries/{entry_id}")
    assert del_resp.status_code == 204

    library = (await client.get(f"/library/{user_id}")).json()
    assert all(e["id"] != entry_id for e in library["to_watch"])
