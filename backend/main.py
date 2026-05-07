import os
from contextlib import asynccontextmanager

import aiosqlite
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

import database
from database import create_tables
from rate_limit import limiter
from recommender.engine import build_faiss_index
from routers import auth, interactions, library, movies, recommendations, users
from seed_data import seed, seed_from_tmdb

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    await seed()
    await seed_from_tmdb()  # no-op if TMDB_API_KEY unset or catalog already large

    async with aiosqlite.connect(database.DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await build_faiss_index(db)

    yield


app = FastAPI(
    title="MovieFinder API",
    description="High-Fidelity Movie Recommendation Engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded: {exc.detail}"},
    )


# ── CORS (env-driven) ─────────────────────────────────────────────────────────
_default_origins = "http://localhost:5173,http://localhost:3000"
_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ── Security headers ──────────────────────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(movies.router)
app.include_router(interactions.router)
app.include_router(recommendations.router)
app.include_router(library.router)


@app.get("/health")
async def health():
    """Liveness + DB connectivity check."""
    try:
        async with aiosqlite.connect(database.DB_PATH) as db:
            await db.execute("SELECT 1")
        db_ok = True
    except Exception:
        db_ok = False

    status_code = 200 if db_ok else 503
    return JSONResponse(
        status_code=status_code,
        content={"status": "ok" if db_ok else "degraded", "service": "MovieFinder API", "db": db_ok},
    )
