from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    pass


class UserResponse(BaseModel):
    id: int
    session_token: str
    taste_vector: list[float]
    banned_directors: list[str]
    banned_actors: list[str]
    created_at: str


class HateRequest(BaseModel):
    type: str  # "director" or "actor"
    name: str


class MovieResponse(BaseModel):
    id: int
    tmdb_id: Optional[int]
    title: str
    year: Optional[int]
    director: Optional[str]
    director_id: Optional[str]
    cast: list[str]
    genres: list[str]
    synopsis: Optional[str]
    poster_url: Optional[str]
    streaming_platforms: list[str]
    avg_rating: float
    is_onboarding: bool


class InteractionCreate(BaseModel):
    user_id: int
    movie_id: int
    action: str  # "like" or "dislike"


class InteractionResponse(BaseModel):
    id: int
    user_id: int
    movie_id: int
    action: str
    timestamp: str
    new_taste_vector: list[float]


class RecommendationItem(BaseModel):
    movie: MovieResponse
    score: float
    is_exploration: bool


class WhyThisResponse(BaseModel):
    movie_title: str
    reasons: list[str]


class LibraryEntryCreate(BaseModel):
    movie_id: Optional[int] = None
    custom_title: Optional[str] = None
    list_type: str  # "to_watch" or "watched"
    rating: Optional[int] = None  # 1-10, only for watched


class LibraryEntryUpdate(BaseModel):
    list_type: Optional[str] = None
    rating: Optional[int] = None
    position: Optional[int] = None


class LibraryEntryResponse(BaseModel):
    id: int
    user_id: int
    movie_id: Optional[int]
    custom_title: Optional[str]
    list_type: str
    rating: Optional[int]
    position: int
    movie: Optional[MovieResponse]


class LibraryResponse(BaseModel):
    liked: list[MovieResponse]
    to_watch: list[LibraryEntryResponse]
    watched: list[LibraryEntryResponse]
