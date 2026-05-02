import json

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from database import get_db
from models import InteractionCreate, InteractionResponse
from recommender.content_based import update_taste_vector

router = APIRouter(prefix="/interactions", tags=["interactions"])


@router.post("", response_model=InteractionResponse, status_code=201)
async def create_interaction(
    body: InteractionCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    user_id = current_user["id"]

    # Fetch movie feature vector
    async with db.execute(
        "SELECT feature_vector FROM movies WHERE id = ?", (body.movie_id,)
    ) as cur:
        movie_row = await cur.fetchone()
    if not movie_row:
        raise HTTPException(404, "Movie not found")

    # Count existing interactions for this user (for learning rate)
    async with db.execute(
        "SELECT COUNT(*) FROM interactions WHERE user_id = ?", (user_id,)
    ) as cur:
        count_row = await cur.fetchone()
    interaction_count = count_row[0] if count_row else 0

    # Compute new taste vector
    current_tv = current_user["taste_vector"]
    movie_fv = json.loads(movie_row["feature_vector"] or "[]")
    new_tv = update_taste_vector(current_tv, movie_fv, body.action, interaction_count)

    # Persist interaction + updated taste
    async with db.execute(
        "INSERT INTO interactions (user_id, movie_id, action) VALUES (?,?,?)",
        (user_id, body.movie_id, body.action),
    ) as cur:
        interaction_id = cur.lastrowid

    await db.execute(
        "UPDATE users SET taste_vector = ? WHERE id = ?",
        (json.dumps(new_tv), user_id),
    )
    await db.commit()

    async with db.execute(
        "SELECT * FROM interactions WHERE id = ?", (interaction_id,)
    ) as cur:
        row = await cur.fetchone()

    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "movie_id": row["movie_id"],
        "action": row["action"],
        "timestamp": str(row["timestamp"]),
    }
