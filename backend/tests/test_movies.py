"""Tests for movie catalog endpoints."""

import pytest


@pytest.mark.asyncio
async def test_onboarding_movies(client):
    response = await client.get("/movies/onboarding")
    assert response.status_code == 200
    movies = response.json()
    assert isinstance(movies, list)
    assert len(movies) > 0
    for movie in movies:
        assert "id" in movie
        assert "title" in movie


@pytest.mark.asyncio
async def test_search_movies(client):
    response = await client.get("/movies/search?q=matrix")
    assert response.status_code == 200
    titles = [m["title"].lower() for m in response.json()]
    assert any("matrix" in t for t in titles)


@pytest.mark.asyncio
async def test_search_short_query_rejected(client):
    response = await client.get("/movies/search?q=")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_search_no_results(client):
    response = await client.get("/movies/search?q=xyznotamovieatall999")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_search_wildcard_escaped(client):
    """A bare '%' must NOT act as a SQL LIKE wildcard."""
    response = await client.get("/movies/search?q=%")
    assert response.status_code == 200
    # No movie title literally contains the '%' character → empty
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_movie_by_id(client):
    movies = (await client.get("/movies/onboarding")).json()
    movie_id = movies[0]["id"]

    resp = await client.get(f"/movies/{movie_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == movie_id


@pytest.mark.asyncio
async def test_get_nonexistent_movie(client):
    response = await client.get("/movies/99999")
    assert response.status_code == 404
