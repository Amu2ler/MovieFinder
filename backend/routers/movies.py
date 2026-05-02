import json

from fastapi import APIRouter, Depends, HTTPException, Query

from database import get_db
from models import MovieResponse

router = APIRouter(prefix="/movies", tags=["movies"])


def _parse_movie(row) -> dict:
    d = dict(row)
    d["cast"] = json.loads(d["cast"] or "[]")
    d["genres"] = json.loads(d["genres"] or "[]")
    d["streaming_platforms"] = json.loads(d["streaming_platforms"] or "[]")
    d["is_onboarding"] = bool(d["is_onboarding"])
    return d


def _escape_like(value: str) -> str:
    """Escape SQLite LIKE wildcards so user input can't act as a wildcard."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("/onboarding", response_model=list[MovieResponse])
async def get_onboarding_movies(db=Depends(get_db)):
    """Return the iconic films used during onboarding calibration."""
    async with db.execute(
        "SELECT * FROM movies WHERE is_onboarding = 1 ORDER BY avg_rating DESC LIMIT 10"
    ) as cursor:
        rows = await cursor.fetchall()
    return [_parse_movie(r) for r in rows]


@router.get("/search", response_model=list[MovieResponse])
async def search_movies(
    q: str = Query(..., min_length=1, max_length=100),
    db=Depends(get_db),
):
    """Simple title/director search (LIKE-wildcards in q are escaped)."""
    pattern = f"%{_escape_like(q)}%"
    async with db.execute(
        "SELECT * FROM movies WHERE title LIKE ? ESCAPE '\\' OR director LIKE ? ESCAPE '\\' LIMIT 20",
        (pattern, pattern),
    ) as cursor:
        rows = await cursor.fetchall()
    return [_parse_movie(r) for r in rows]


@router.get("/{movie_id}", response_model=MovieResponse)
async def get_movie(movie_id: int, db=Depends(get_db)):
    async with db.execute("SELECT * FROM movies WHERE id = ?", (movie_id,)) as cursor:
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Movie not found")
    return _parse_movie(row)
