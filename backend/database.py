import os
from pathlib import Path

import aiosqlite

# Default DB lives OUTSIDE the backend code dir so a `scp backend/*` deploy
# can never overwrite production data. Override with MOVIEFINDER_DB_PATH.
_DEFAULT_DB = Path(__file__).resolve().parent.parent / "data" / "moviefinder.db"
DB_PATH = Path(os.environ.get("MOVIEFINDER_DB_PATH", _DEFAULT_DB))


async def _configure(db: aiosqlite.Connection) -> None:
    """Per-connection PRAGMAs: WAL for concurrency, foreign keys enforcement."""
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    await db.execute("PRAGMA synchronous=NORMAL")


async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await _configure(db)
        yield db


async def create_tables():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await _configure(db)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                password_hash TEXT,
                session_token TEXT UNIQUE NOT NULL,
                taste_vector TEXT NOT NULL DEFAULT '[]',
                banned_directors TEXT NOT NULL DEFAULT '[]',
                banned_actors TEXT NOT NULL DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Migration for existing databases
        for col_def in ("email TEXT UNIQUE", "password_hash TEXT"):
            try:
                await db.execute(f"ALTER TABLE users ADD COLUMN {col_def}")
            except Exception:
                pass

        await db.execute("""
            CREATE TABLE IF NOT EXISTS movies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tmdb_id INTEGER,
                title TEXT NOT NULL,
                year INTEGER,
                director TEXT,
                director_id TEXT,
                cast TEXT NOT NULL DEFAULT '[]',
                genres TEXT NOT NULL DEFAULT '[]',
                synopsis TEXT,
                poster_url TEXT,
                streaming_platforms TEXT NOT NULL DEFAULT '[]',
                avg_rating REAL DEFAULT 0.0,
                feature_vector TEXT NOT NULL DEFAULT '[]',
                is_onboarding INTEGER DEFAULT 0
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                movie_id INTEGER NOT NULL,
                action TEXT NOT NULL CHECK(action IN ('like', 'dislike')),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_movie_lists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                movie_id INTEGER,
                custom_title TEXT,
                list_type TEXT NOT NULL CHECK(list_type IN ('to_watch', 'watched')),
                rating INTEGER CHECK(rating IS NULL OR (rating >= 1 AND rating <= 10)),
                position INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE SET NULL
            )
        """)

        # Indexes for hot lookups
        await db.execute("CREATE INDEX IF NOT EXISTS idx_users_token ON users(session_token)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_interactions_user_movie ON interactions(user_id, movie_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_uml_user ON user_movie_lists(user_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title)")

        await db.commit()
