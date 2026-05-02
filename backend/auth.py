"""Bearer-token authentication.

Each user has an opaque `session_token` (generated at user creation).
Clients send it in `Authorization: Bearer <token>` on every request.
"""

import json

from fastapi import Depends, Header, HTTPException, status

from database import get_db


async def get_current_user(
    authorization: str | None = Header(default=None),
    db=Depends(get_db),
) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Empty token")

    async with db.execute(
        "SELECT * FROM users WHERE session_token = ?", (token,)
    ) as cursor:
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

    user = dict(row)
    user["taste_vector"] = json.loads(user["taste_vector"] or "[]")
    user["banned_directors"] = json.loads(user["banned_directors"] or "[]")
    user["banned_actors"] = json.loads(user["banned_actors"] or "[]")
    return user
