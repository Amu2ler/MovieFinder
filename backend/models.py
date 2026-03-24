
from pydantic import BaseModel


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
    movie_id: int | None = None
    custom_title: str | None = None
    list_type: str  # "to_watch" or "watched"
    rating: int | None = None  # 1-10, only for watched


class LibraryEntryUpdate(BaseModel):
    list_type: str | None = None
    rating: int | None = None
    position: int | None = None


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
