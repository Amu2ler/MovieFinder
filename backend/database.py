from pathlib import Path

import aiosqlite

DB_PATH = Path(__file__).parent / "moviefinder.db"


async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db


async def create_tables():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_token TEXT UNIQUE NOT NULL,
                taste_vector TEXT NOT NULL DEFAULT '[]',
                banned_directors TEXT NOT NULL DEFAULT '[]',
                banned_actors TEXT NOT NULL DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

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
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (movie_id) REFERENCES movies(id)
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
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (movie_id) REFERENCES movies(id)
            )
        """)

        await db.commit()
