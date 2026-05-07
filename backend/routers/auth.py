import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, field_validator

from database import get_db
from rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class RegisterBody(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Le mot de passe doit faire au moins 8 caractères")
        return v


class LoginBody(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    session_token: str
    user_id: int


@router.post("/register", response_model=AuthResponse, status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterBody, db=Depends(get_db)):
    async with db.execute(
        "SELECT id FROM users WHERE email = ?", (body.email.lower(),)
    ) as cursor:
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email déjà utilisé")

    token = secrets.token_urlsafe(32)
    password_hash = pwd_context.hash(body.password)

    cursor = await db.execute(
        """INSERT INTO users (email, password_hash, session_token, taste_vector,
           banned_directors, banned_actors) VALUES (?, ?, ?, '[]', '[]', '[]')""",
        (body.email.lower(), password_hash, token),
    )
    await db.commit()
    return AuthResponse(session_token=token, user_id=cursor.lastrowid)


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginBody, db=Depends(get_db)):
    async with db.execute(
        "SELECT id, session_token, password_hash FROM users WHERE email = ?",
        (body.email.lower(),),
    ) as cursor:
        row = await cursor.fetchone()

    if not row or not pwd_context.verify(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    return AuthResponse(session_token=row["session_token"], user_id=row["id"])
