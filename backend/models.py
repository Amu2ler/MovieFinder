from typing import Literal

from pydantic import BaseModel, Field


# ── Users ─────────────────────────────────────────────────────────────────────
class UserPublic(BaseModel):
    """User data returned to authenticated clients (NO session_token)."""

    id: int
    taste_vector: list[float]
    banned_directors: list[str]
    banned_actors: list[str]
    created_at: str


class UserCreateResponse(UserPublic):
    """Returned ONCE at user creation — includes the session token."""

    session_token: str


class HateRequest(BaseModel):
    type: Literal["director", "actor"]
    name: str = Field(min_length=1, max_length=200)


# ── Movies ────────────────────────────────────────────────────────────────────
class MovieResponse(BaseModel):
    id: int
    tmdb_id: int | None
    title: str
    year: int | None
    director: str | None
    director_id: str | None
    cast: list[str]
    genres: list[str]
    synopsis: str | None
    poster_url: str | None
    streaming_platforms: list[str]
    avg_rating: float
    is_onboarding: bool


# ── Interactions ──────────────────────────────────────────────────────────────
class InteractionCreate(BaseModel):
    movie_id: int = Field(ge=1)
    action: Literal["like", "dislike"]


class InteractionResponse(BaseModel):
    id: int
    user_id: int
    movie_id: int
    action: Literal["like", "dislike"]
    timestamp: str


# ── Recommendations ───────────────────────────────────────────────────────────
class RecommendationItem(BaseModel):
    movie: MovieResponse
    score: float
    is_exploration: bool


class WhyThisResponse(BaseModel):
    movie_title: str
    reasons: list[str]


# ── Library ───────────────────────────────────────────────────────────────────
class LibraryEntryCreate(BaseModel):
    movie_id: int | None = Field(default=None, ge=1)
    custom_title: str | None = Field(default=None, min_length=1, max_length=200)
    list_type: Literal["to_watch", "watched"]
    rating: int | None = Field(default=None, ge=1, le=10)


class LibraryEntryUpdate(BaseModel):
    list_type: Literal["to_watch", "watched"] | None = None
    rating: int | None = Field(default=None, ge=1, le=10)
    position: int | None = Field(default=None, ge=0)


class LibraryEntryResponse(BaseModel):
    id: int
    user_id: int
    movie_id: int | None
    custom_title: str | None
    list_type: str
    rating: int | None
    position: int
    movie: MovieResponse | None


class LibraryResponse(BaseModel):
    liked: list[MovieResponse]
    to_watch: list[LibraryEntryResponse]
    watched: list[LibraryEntryResponse]
