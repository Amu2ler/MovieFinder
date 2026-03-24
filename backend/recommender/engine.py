"""
Main recommendation orchestrator.
Combines content-based (FAISS) + collaborative filtering,
applies user filters (banned directors/actors, platform),
and injects 5% exploration content.
"""

import json
import random

from .collaborative import get_collab_scores
from .content_based import ContentBasedEngine
from .explainer import explain

# Global singleton FAISS engine (loaded once at app startup)
_content_engine = ContentBasedEngine()

EXPLORATION_RATIO = 0.05  # 5% serendipity injection
COLLAB_WEIGHT = 0.3       # weight for collaborative signal
CONTENT_WEIGHT = 0.7      # weight for content-based signal


def get_engine() -> ContentBasedEngine:
    return _content_engine


async def build_faiss_index(db) -> None:
    """Load all movies from DB and build FAISS index. Called at app startup."""
    async with db.execute("SELECT id, feature_vector FROM movies") as cursor:
        movies = [dict(row) for row in await cursor.fetchall()]
    _content_engine.build_index(movies)


async def get_recommendations(
    user_id: int,
    taste_vector: list[float],
    banned_directors: list[str],
    banned_actors: list[str],
    platform_filter: list[str],
    db,
    limit: int = 20,
) -> list[dict]:
    """
    Return ranked list of recommended movies with scores.
    Each item: {movie: dict, score: float, is_exploration: bool}
    """
    # 1. Fetch all movies and seen movie ids
    async with db.execute("SELECT * FROM movies") as cursor:
        all_movies_raw = [dict(row) for row in await cursor.fetchall()]

    async with db.execute(
        "SELECT movie_id FROM interactions WHERE user_id = ?", (user_id,)
    ) as cursor:
        seen_ids = {row[0] for row in await cursor.fetchall()}

    # 2. Content-based candidates
    content_scores: dict[int, float] = {}
    if taste_vector and any(v != 0 for v in taste_vector):
        candidates = _content_engine.get_candidates(taste_vector, k=len(all_movies_raw))
        content_scores = dict(candidates)

    # 3. Collaborative scores (may be empty if not enough users)
    async with db.execute("SELECT * FROM interactions") as cursor:
        all_interactions = [dict(row) for row in await cursor.fetchall()]

    async with db.execute("SELECT id FROM users") as cursor:
        all_user_ids = [row[0] for row in await cursor.fetchall()]

    all_movie_ids = [m["id"] for m in all_movies_raw]
    collab_scores = get_collab_scores(user_id, all_interactions, all_movie_ids, all_user_ids)

    # 4. Filter and combine scores
    filtered: list[dict] = []
    exploration_pool: list[dict] = []

    for movie in all_movies_raw:
        mid = movie["id"]

        # Skip already seen
        if mid in seen_ids:
            continue

        # Skip banned directors/actors
        director = movie.get("director") or ""
        cast_raw = movie.get("cast", "[]")
        cast = json.loads(cast_raw) if isinstance(cast_raw, str) else cast_raw

        if director in banned_directors:
            continue
        if any(actor in banned_actors for actor in cast):
            continue

        # Apply platform filter
        if platform_filter:
            platforms_raw = movie.get("streaming_platforms", "[]")
            platforms = json.loads(platforms_raw) if isinstance(platforms_raw, str) else platforms_raw
            if not any(p in platforms for p in platform_filter):
                exploration_pool.append(movie)
                continue

        # Combined score
        c_score = content_scores.get(mid, 0.0)
        k_score = collab_scores.get(mid, 0.0)
        combined = CONTENT_WEIGHT * c_score + COLLAB_WEIGHT * k_score

        filtered.append({"movie": movie, "score": combined, "is_exploration": False})

    # 5. Sort by combined score descending
    filtered.sort(key=lambda x: x["score"], reverse=True)

    # 6. Inject exploration (5% of limit, minimum 1)
    n_exploration = max(1, int(limit * EXPLORATION_RATIO))
    n_main = limit - n_exploration

    result = filtered[:n_main]

    # Pick exploration items from low-score pool or platform-excluded pool
    low_score_pool = filtered[n_main:] + [
        {"movie": m, "score": 0.0, "is_exploration": True} for m in exploration_pool
    ]
    if low_score_pool:
        exploration_picks = random.sample(
            low_score_pool, min(n_exploration, len(low_score_pool))
        )
        for pick in exploration_picks:
            pick["is_exploration"] = True
        result.extend(exploration_picks)

    return result


async def get_why_this(
    user_id: int,
    movie_id: int,
    taste_vector: list[float],
    db,
) -> list[str]:
    """Explain why a movie was recommended to the user."""
    async with db.execute(
        "SELECT * FROM movies WHERE id = ?", (movie_id,)
    ) as cursor:
        row = await cursor.fetchone()
        if not row:
            return ["Film recommandé selon votre profil de goût."]
        movie = dict(row)

    # Fetch liked movies for director matching
    async with db.execute(
        """SELECT m.* FROM movies m
           JOIN interactions i ON m.id = i.movie_id
           WHERE i.user_id = ? AND i.action = 'like'
           ORDER BY i.timestamp DESC LIMIT 10""",
        (user_id,),
    ) as cursor:
        liked_movies = [dict(row) for row in await cursor.fetchall()]

    return explain(taste_vector, movie, liked_movies)
