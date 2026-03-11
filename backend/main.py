from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables, get_db
from seed_data import seed
from recommender.engine import build_faiss_index
from routers import users, movies, interactions, recommendations, library
import aiosqlite
from pathlib import Path


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables, seed data, build FAISS index
    await create_tables()
    await seed()

    DB_PATH = Path(__file__).parent / "moviefinder.db"
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await build_faiss_index(db)

    yield
    # Shutdown: nothing to clean up


app = FastAPI(
    title="MovieFinder API",
    description="High-Fidelity Movie Recommendation Engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(movies.router)
app.include_router(interactions.router)
app.include_router(recommendations.router)
app.include_router(library.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "MovieFinder API"}
