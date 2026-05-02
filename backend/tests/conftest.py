"""Shared test fixtures for MovieFinder backend."""

import sys
from pathlib import Path

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Ensure backend root is importable
sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest_asyncio.fixture(scope="session")
async def app(tmp_path_factory):
    """
    Session-scoped FastAPI app backed by a temporary SQLite DB.
    Manually runs setup (create tables + seed + FAISS) instead of relying on
    lifespan, because httpx ASGITransport does not fire lifespan events.
    """
    import database
    import seed_data

    db_file = tmp_path_factory.mktemp("db") / "test.db"
    original_db_path = database.DB_PATH
    database.DB_PATH = db_file
    seed_data.DB_PATH = db_file

    # Disable rate limiting under tests (DoS-protection makes happy-path flaky)
    from rate_limit import limiter
    limiter.enabled = False

    from recommender.engine import build_faiss_index

    await database.create_tables()
    await seed_data.seed()
    import aiosqlite as _aio
    async with _aio.connect(db_file) as db:
        db.row_factory = _aio.Row
        await build_faiss_index(db)

    import main

    yield main.app

    database.DB_PATH = original_db_path
    seed_data.DB_PATH = original_db_path


@pytest_asyncio.fixture
async def client(app):
    """Per-test AsyncClient using the session-scoped app."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_client(client):
    """
    Per-test AsyncClient pre-authenticated with a freshly created user.
    Returns (client_with_auth_header, user_id).
    """
    resp = await client.post("/users")
    data = resp.json()
    token = data["session_token"]
    user_id = data["id"]
    client.headers["Authorization"] = f"Bearer {token}"
    yield client, user_id
    client.headers.pop("Authorization", None)
