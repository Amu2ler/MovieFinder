import json

from fastapi import APIRouter, Depends, HTTPException, Query

from database import get_db
from models import RecommendationItem, WhyThisResponse
from recommender.engine import get_recommendations, get_why_this

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _parse_movie(row_dict: dict) -> dict:
    d = dict(row_dict)
    for key in ("cast", "genres", "streaming_platforms"):
        if isinstance(d.get(key), str):
            d[key] = json.loads(d[key])
    d["is_onboarding"] = bool(d.get("is_onboarding", 0))
    return d


@router.get("/{user_id}", response_model=list[RecommendationItem])
async def recommend(
    user_id: int,
    platforms: str = Query(default="", description="Comma-separated platform names"),
    limit: int = Query(default=20, ge=1, le=50),
    db=Depends(get_db),
):
    async with db.execute("SELECT * FROM users WHERE id = ?", (user_id,)) as cur:
        user_row = await cur.fetchone()
    if not user_row:
        raise HTTPException(404, "User not found")

    taste_vector = json.loads(user_row["taste_vector"] or "[]")
    banned_directors = json.loads(user_row["banned_directors"] or "[]")
    banned_actors = json.loads(user_row["banned_actors"] or "[]")
    platform_filter = [p.strip() for p in platforms.split(",") if p.strip()]

    results = await get_recommendations(
        user_id=user_id,
        taste_vector=taste_vector,
        banned_directors=banned_directors,
        banned_actors=banned_actors,
        platform_filter=platform_filter,
        db=db,
        limit=limit,
    )

    return [
        {
            "movie": _parse_movie(item["movie"]),
            "score": item["score"],
            "is_exploration": item["is_exploration"],
        }
        for item in results
    ]


@router.get("/{user_id}/why/{movie_id}", response_model=WhyThisResponse)
async def why_this(user_id: int, movie_id: int, db=Depends(get_db)):
    async with db.execute("SELECT taste_vector, banned_directors, banned_actors FROM users WHERE id = ?", (user_id,)) as cur:
        user_row = await cur.fetchone()
    if not user_row:
        raise HTTPException(404, "User not found")

    taste_vector = json.loads(user_row["taste_vector"] or "[]")

    async with db.execute("SELECT title FROM movies WHERE id = ?", (movie_id,)) as cur:
        movie_row = await cur.fetchone()
    if not movie_row:
        raise HTTPException(404, "Movie not found")

    reasons = await get_why_this(user_id, movie_id, taste_vector, db)

    return {"movie_title": movie_row["title"], "reasons": reasons}
