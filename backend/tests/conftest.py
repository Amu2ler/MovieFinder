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
    original_seed_path = seed_data.DB_PATH
    database.DB_PATH = db_file
    seed_data.DB_PATH = db_file

    # Run startup logic directly
    from recommender.engine import build_faiss_index

    await database.create_tables()
    await seed_data.seed()
    async with __import__("aiosqlite").connect(db_file) as db:
        db.row_factory = __import__("aiosqlite").Row
        await build_faiss_index(db)

    import main

    yield main.app

    database.DB_PATH = original_db_path
    seed_data.DB_PATH = original_seed_path


@pytest_asyncio.fixture
async def client(app):
    """Per-test AsyncClient using the session-scoped app."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
