"""Tests for the user library (to_watch / watched lists)."""

import pytest


async def _first_movie_id(client):
    movies = (await client.get("/movies/onboarding")).json()
    return movies[0]["id"]


@pytest.mark.asyncio
async def test_get_empty_library(auth_client):
    client, _ = auth_client
    resp = await client.get("/library")
    assert resp.status_code == 200
    data = resp.json()
    assert data["liked"] == []
    assert data["to_watch"] == []
    assert data["watched"] == []


@pytest.mark.asyncio
async def test_library_requires_auth(client):
    resp = await client.get("/library")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_add_to_watch(auth_client):
    client, _ = auth_client
    movie_id = await _first_movie_id(client)

    resp = await client.post(
        "/library/entries",
        json={"movie_id": movie_id, "list_type": "to_watch"},
    )
    assert resp.status_code == 201
    entry = resp.json()
    assert entry["list_type"] == "to_watch"
    assert entry["movie_id"] == movie_id


@pytest.mark.asyncio
async def test_add_watched_with_rating(auth_client):
    client, _ = auth_client
    movie_id = await _first_movie_id(client)

    resp = await client.post(
        "/library/entries",
        json={"movie_id": movie_id, "list_type": "watched", "rating": 8},
    )
    assert resp.status_code == 201
    entry = resp.json()
    assert entry["list_type"] == "watched"
    assert entry["rating"] == 8


@pytest.mark.asyncio
async def test_add_custom_entry(auth_client):
    client, _ = auth_client
    resp = await client.post(
        "/library/entries",
        json={"custom_title": "Mon Film Perso", "list_type": "to_watch"},
    )
    assert resp.status_code == 201
    assert resp.json()["custom_title"] == "Mon Film Perso"


@pytest.mark.asyncio
async def test_add_invalid_rating_rejected(auth_client):
    client, _ = auth_client
    movie_id = await _first_movie_id(client)
    resp = await client.post(
        "/library/entries",
        json={"movie_id": movie_id, "list_type": "watched", "rating": 99},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_entry(auth_client):
    client, _ = auth_client
    movie_id = await _first_movie_id(client)

    post_resp = await client.post(
        "/library/entries",
        json={"movie_id": movie_id, "list_type": "to_watch"},
    )
    entry_id = post_resp.json()["id"]

    resp = await client.patch(
        f"/library/entries/{entry_id}",
        json={"list_type": "watched", "rating": 9},
    )
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["list_type"] == "watched"
    assert updated["rating"] == 9


@pytest.mark.asyncio
async def test_delete_entry(auth_client):
    client, _ = auth_client
    movie_id = await _first_movie_id(client)

    post_resp = await client.post(
        "/library/entries",
        json={"movie_id": movie_id, "list_type": "to_watch"},
    )
    entry_id = post_resp.json()["id"]

    del_resp = await client.delete(f"/library/entries/{entry_id}")
    assert del_resp.status_code == 204

    library = (await client.get("/library")).json()
    assert all(e["id"] != entry_id for e in library["to_watch"])


@pytest.mark.asyncio
async def test_cannot_access_other_users_entry(client):
    """User A creates an entry; user B must NOT be able to delete or update it."""
    # User A
    user_a_token = (await client.post("/users")).json()["session_token"]
    movies = (await client.get("/movies/onboarding")).json()
    movie_id = movies[0]["id"]
    client.headers["Authorization"] = f"Bearer {user_a_token}"
    entry_id = (
        await client.post(
            "/library/entries",
            json={"movie_id": movie_id, "list_type": "to_watch"},
        )
    ).json()["id"]

    # User B
    user_b_token = (await client.post("/users")).json()["session_token"]
    client.headers["Authorization"] = f"Bearer {user_b_token}"

    resp = await client.delete(f"/library/entries/{entry_id}")
    assert resp.status_code == 404  # not visible to user B
    resp = await client.patch(f"/library/entries/{entry_id}", json={"list_type": "watched"})
    assert resp.status_code == 404

    client.headers.pop("Authorization", None)
