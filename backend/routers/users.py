import json
import secrets

from fastapi import APIRouter, Depends, Request

from auth import get_current_user
from database import get_db
from models import HateRequest, UserCreateResponse, UserPublic
from rate_limit import limiter

router = APIRouter(prefix="/users", tags=["users"])


def _to_public(user: dict) -> dict:
    return {
        "id": user["id"],
        "taste_vector": user["taste_vector"],
        "banned_directors": user["banned_directors"],
        "banned_actors": user["banned_actors"],
        "created_at": str(user["created_at"]),
    }


@router.post("", response_model=UserCreateResponse, status_code=201)
@limiter.limit("10/minute")
async def create_user(request: Request, db=Depends(get_db)):
    """Create an anonymous user. The session_token is returned ONCE here."""
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

    user = dict(row)
    return {
        "id": user["id"],
        "taste_vector": json.loads(user["taste_vector"] or "[]"),
        "banned_directors": json.loads(user["banned_directors"] or "[]"),
        "banned_actors": json.loads(user["banned_actors"] or "[]"),
        "created_at": str(user["created_at"]),
        "session_token": token,
    }


@router.get("/me", response_model=UserPublic)
async def get_me(current_user: dict = Depends(get_current_user)):
    return _to_public(current_user)


@router.patch("/me/hate", response_model=UserPublic)
async def add_hate(
    body: HateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    user_id = current_user["id"]

    if body.type == "director":
        banned = list(current_user["banned_directors"])
        if body.name not in banned:
            banned.append(body.name)
        await db.execute(
            "UPDATE users SET banned_directors = ? WHERE id = ?",
            (json.dumps(banned), user_id),
        )
        current_user["banned_directors"] = banned
    else:  # "actor"
        banned = list(current_user["banned_actors"])
        if body.name not in banned:
            banned.append(body.name)
        await db.execute(
            "UPDATE users SET banned_actors = ? WHERE id = ?",
            (json.dumps(banned), user_id),
        )
        current_user["banned_actors"] = banned

    await db.commit()
    return _to_public(current_user)
