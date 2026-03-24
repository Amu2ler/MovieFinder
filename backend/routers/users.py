import json
import secrets

from fastapi import APIRouter, Depends, HTTPException

from database import get_db
from models import HateRequest, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


def _parse_user(row) -> dict:
    d = dict(row)
    d["taste_vector"] = json.loads(d["taste_vector"] or "[]")
    d["banned_directors"] = json.loads(d["banned_directors"] or "[]")
    d["banned_actors"] = json.loads(d["banned_actors"] or "[]")
    return d


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(db=Depends(get_db)):
    token = secrets.token_urlsafe(32)
    taste_vector = json.dumps([0.0] * 20)
    async with db.execute(
        "INSERT INTO users (session_token, taste_vector, banned_directors, banned_actors) VALUES (?,?,?,?)",
        (token, taste_vector, "[]", "[]"),
    ) as cursor:
        user_id = cursor.lastrowid
    await db.commit()

    async with db.execute("SELECT * FROM users WHERE id = ?", (user_id,)) as cursor:
        row = await cursor.fetchone()
    return _parse_user(row)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db=Depends(get_db)):
    async with db.execute("SELECT * FROM users WHERE id = ?", (user_id,)) as cursor:
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "User not found")
    return _parse_user(row)


@router.patch("/{user_id}/hate", response_model=UserResponse)
async def add_hate(user_id: int, body: HateRequest, db=Depends(get_db)):
    async with db.execute("SELECT * FROM users WHERE id = ?", (user_id,)) as cursor:
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "User not found")

    user = _parse_user(row)

    if body.type == "director":
        banned = user["banned_directors"]
        if body.name not in banned:
            banned.append(body.name)
        await db.execute(
            "UPDATE users SET banned_directors = ? WHERE id = ?",
            (json.dumps(banned), user_id),
        )
    elif body.type == "actor":
        banned = user["banned_actors"]
        if body.name not in banned:
            banned.append(body.name)
        await db.execute(
            "UPDATE users SET banned_actors = ? WHERE id = ?",
            (json.dumps(banned), user_id),
        )
    else:
        raise HTTPException(400, "type must be 'director' or 'actor'")

    await db.commit()

    async with db.execute("SELECT * FROM users WHERE id = ?", (user_id,)) as cursor:
        row = await cursor.fetchone()
    return _parse_user(row)
