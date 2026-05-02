import json

from fastapi import APIRouter, Depends, HTTPException, Query

from auth import get_current_user
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


@router.get("", response_model=list[RecommendationItem])
async def recommend(
    platforms: str = Query(default="", max_length=500, description="Comma-separated platform names"),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    user_id = current_user["id"]
    taste_vector = current_user["taste_vector"]
    banned_directors = current_user["banned_directors"]
    banned_actors = current_user["banned_actors"]
    platform_filter = [p.strip() for p in platforms.split(",") if p.strip()][:20]

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


@router.get("/why/{movie_id}", response_model=WhyThisResponse)
async def why_this(
    movie_id: int,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    user_id = current_user["id"]
    taste_vector = current_user["taste_vector"]

    async with db.execute("SELECT title FROM movies WHERE id = ?", (movie_id,)) as cur:
        movie_row = await cur.fetchone()
    if not movie_row:
        raise HTTPException(404, "Movie not found")

    reasons = await get_why_this(user_id, movie_id, taste_vector, db)
    return {"movie_title": movie_row["title"], "reasons": reasons}
