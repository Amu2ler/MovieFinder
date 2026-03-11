import json
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from models import (
    LibraryEntryCreate,
    LibraryEntryUpdate,
    LibraryEntryResponse,
    LibraryResponse,
    MovieResponse,
)

router = APIRouter(prefix="/library", tags=["library"])


def _parse_movie(row) -> dict:
    d = dict(row)
    for key in ("cast", "genres", "streaming_platforms"):
        if isinstance(d.get(key), str):
            d[key] = json.loads(d[key])
    d["is_onboarding"] = bool(d.get("is_onboarding", 0))
    return d


def _parse_entry(row, movie_row=None) -> dict:
    d = dict(row)
    d["movie"] = _parse_movie(movie_row) if movie_row else None
    return d


@router.get("/{user_id}", response_model=LibraryResponse)
async def get_library(user_id: int, db=Depends(get_db)):
    async with db.execute("SELECT id FROM users WHERE id = ?", (user_id,)) as cur:
        if not await cur.fetchone():
            raise HTTPException(404, "User not found")

    # Liked movies from interactions
    async with db.execute(
        """SELECT m.* FROM movies m
           JOIN interactions i ON m.id = i.movie_id
           WHERE i.user_id = ? AND i.action = 'like'
           ORDER BY i.timestamp DESC""",
        (user_id,),
    ) as cur:
        liked_rows = await cur.fetchall()
    liked = [_parse_movie(r) for r in liked_rows]

    # Library entries with joined movie data
    async with db.execute(
        """SELECT uml.*, m.id as m_id, m.tmdb_id, m.title, m.year, m.director,
                  m.director_id, m.cast, m.genres, m.synopsis, m.poster_url,
                  m.streaming_platforms, m.avg_rating, m.is_onboarding
           FROM user_movie_lists uml
           LEFT JOIN movies m ON uml.movie_id = m.id
           WHERE uml.user_id = ?
           ORDER BY uml.position ASC, uml.created_at ASC""",
        (user_id,),
    ) as cur:
        entry_rows = await cur.fetchall()

    to_watch = []
    watched = []
    for row in entry_rows:
        d = dict(row)
        movie = None
        if d.get("m_id"):
            movie = {
                "id": d["m_id"],
                "tmdb_id": d["tmdb_id"],
                "title": d["title"],
                "year": d["year"],
                "director": d["director"],
                "director_id": d["director_id"],
                "cast": json.loads(d["cast"] or "[]"),
                "genres": json.loads(d["genres"] or "[]"),
                "synopsis": d["synopsis"],
                "poster_url": d["poster_url"],
                "streaming_platforms": json.loads(d["streaming_platforms"] or "[]"),
                "avg_rating": d["avg_rating"] or 0.0,
                "is_onboarding": bool(d["is_onboarding"]),
            }
        entry = {
            "id": d["id"],
            "user_id": d["user_id"],
            "movie_id": d["movie_id"],
            "custom_title": d["custom_title"],
            "list_type": d["list_type"],
            "rating": d["rating"],
            "position": d["position"],
            "movie": movie,
        }
        if d["list_type"] == "to_watch":
            to_watch.append(entry)
        else:
            watched.append(entry)

    return {"liked": liked, "to_watch": to_watch, "watched": watched}


@router.post("/{user_id}/entries", response_model=LibraryEntryResponse, status_code=201)
async def add_library_entry(user_id: int, body: LibraryEntryCreate, db=Depends(get_db)):
    async with db.execute("SELECT id FROM users WHERE id = ?", (user_id,)) as cur:
        if not await cur.fetchone():
            raise HTTPException(404, "User not found")

    if body.movie_id is None and not body.custom_title:
        raise HTTPException(400, "Either movie_id or custom_title is required")
    if body.list_type not in ("to_watch", "watched"):
        raise HTTPException(400, "list_type must be 'to_watch' or 'watched'")
    if body.rating is not None and not (1 <= body.rating <= 10):
        raise HTTPException(400, "rating must be between 1 and 10")

    if body.movie_id is not None:
        async with db.execute("SELECT id FROM movies WHERE id = ?", (body.movie_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(404, "Movie not found")

    # Check if entry already exists to avoid duplicates
    async with db.execute(
        "SELECT id FROM user_movie_lists WHERE user_id = ? AND movie_id = ?",
        (user_id, body.movie_id),
    ) as cur:
        existing = await cur.fetchone()
    if existing and body.movie_id is not None:
        # Update the existing entry instead
        await db.execute(
            "UPDATE user_movie_lists SET list_type = ?, rating = ? WHERE id = ?",
            (body.list_type, body.rating, existing["id"]),
        )
        await db.commit()
        entry_id = existing["id"]
    else:
        async with db.execute(
            "INSERT INTO user_movie_lists (user_id, movie_id, custom_title, list_type, rating) VALUES (?,?,?,?,?)",
            (user_id, body.movie_id, body.custom_title, body.list_type, body.rating),
        ) as cur:
            entry_id = cur.lastrowid
        await db.commit()

    return await _fetch_entry(entry_id, db)


@router.patch("/{user_id}/entries/{entry_id}", response_model=LibraryEntryResponse)
async def update_library_entry(
    user_id: int, entry_id: int, body: LibraryEntryUpdate, db=Depends(get_db)
):
    async with db.execute(
        "SELECT * FROM user_movie_lists WHERE id = ? AND user_id = ?", (entry_id, user_id)
    ) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(404, "Entry not found")

    if body.list_type is not None and body.list_type not in ("to_watch", "watched"):
        raise HTTPException(400, "list_type must be 'to_watch' or 'watched'")
    if body.rating is not None and not (1 <= body.rating <= 10):
        raise HTTPException(400, "rating must be between 1 and 10")

    updates = {}
    if body.list_type is not None:
        updates["list_type"] = body.list_type
    if body.rating is not None:
        updates["rating"] = body.rating
    if body.position is not None:
        updates["position"] = body.position

    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [entry_id]
        await db.execute(f"UPDATE user_movie_lists SET {set_clause} WHERE id = ?", values)
        await db.commit()

    return await _fetch_entry(entry_id, db)


@router.delete("/{user_id}/entries/{entry_id}", status_code=204)
async def delete_library_entry(user_id: int, entry_id: int, db=Depends(get_db)):
    async with db.execute(
        "SELECT id FROM user_movie_lists WHERE id = ? AND user_id = ?", (entry_id, user_id)
    ) as cur:
        if not await cur.fetchone():
            raise HTTPException(404, "Entry not found")
    await db.execute("DELETE FROM user_movie_lists WHERE id = ?", (entry_id,))
    await db.commit()


async def _fetch_entry(entry_id: int, db) -> dict:
    async with db.execute(
        """SELECT uml.*, m.id as m_id, m.tmdb_id, m.title, m.year, m.director,
                  m.director_id, m.cast, m.genres, m.synopsis, m.poster_url,
                  m.streaming_platforms, m.avg_rating, m.is_onboarding
           FROM user_movie_lists uml
           LEFT JOIN movies m ON uml.movie_id = m.id
           WHERE uml.id = ?""",
        (entry_id,),
    ) as cur:
        row = await cur.fetchone()

    d = dict(row)
    movie = None
    if d.get("m_id"):
        movie = {
            "id": d["m_id"],
            "tmdb_id": d["tmdb_id"],
            "title": d["title"],
            "year": d["year"],
            "director": d["director"],
            "director_id": d["director_id"],
            "cast": json.loads(d["cast"] or "[]"),
            "genres": json.loads(d["genres"] or "[]"),
            "synopsis": d["synopsis"],
            "poster_url": d["poster_url"],
            "streaming_platforms": json.loads(d["streaming_platforms"] or "[]"),
            "avg_rating": d["avg_rating"] or 0.0,
            "is_onboarding": bool(d["is_onboarding"]),
        }
    return {
        "id": d["id"],
        "user_id": d["user_id"],
        "movie_id": d["movie_id"],
        "custom_title": d["custom_title"],
        "list_type": d["list_type"],
        "rating": d["rating"],
        "position": d["position"],
        "movie": movie,
    }
