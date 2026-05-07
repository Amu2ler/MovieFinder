"""TMDB API client — fetches movies and builds feature vectors for the recommender."""

import asyncio
import math

import httpx

TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

# TMDB genre ID → feature vector dimension (dims 0-9)
GENRE_DIM: dict[int, int] = {
    28: 0,     # Action
    18: 1,     # Drama
    53: 2,     # Thriller
    27: 3,     # Horror
    35: 4,     # Comedy
    878: 5,    # Science Fiction
    10749: 6,  # Romance
    80: 7,     # Crime
    16: 8,     # Animation
    99: 9,     # Documentary
}

# Streaming provider IDs available in France
PROVIDER_MAP: dict[int, str] = {
    8: "Netflix",
    119: "Prime Video",
    337: "Disney+",
    350: "Apple TV+",
    381: "Canal+",
    1899: "Max",
    2: "Apple iTunes",
}

# Genre IDs to query via /discover for catalog diversity
DISCOVER_GENRE_IDS = [28, 18, 35, 53, 878, 10749, 27, 16, 80, 99]


def build_feature_vector(
    genre_ids: list[int],
    year: int,
    rating: float,
    original_language: str,
    runtime: int,
    cast_count: int,
) -> list[float]:
    vec = [0.0] * 20

    for gid in genre_ids:
        if gid in GENRE_DIM:
            vec[GENRE_DIM[gid]] = 1.0

    # Decade (dims 10-12)
    if year < 2000:
        vec[10] = 1.0
    elif year < 2010:
        vec[11] = 1.0
    else:
        vec[12] = 1.0

    # Rating normalized (dim 13)
    vec[13] = round(min(rating / 10.0, 1.0), 4)

    # Heuristic themes (dims 14-19)
    if any(g in genre_ids for g in (27, 53, 80)):   # Horror / Thriller / Crime
        vec[14] = 1.0  # dark
    if 18 in genre_ids and runtime > 130:             # Drama + long runtime
        vec[15] = 0.7  # slow-burn
    if any(g in genre_ids for g in (9648, 53)):       # Mystery / Thriller
        vec[16] = 0.6  # plot-twist
    if cast_count >= 5:
        vec[17] = 0.8  # ensemble cast
    if 36 in genre_ids:                               # History
        vec[18] = 1.0  # biographical
    if original_language != "en":
        vec[19] = 1.0  # foreign language

    # L2-normalize so FAISS inner-product == cosine similarity
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]

    return vec


async def _get(client: httpx.AsyncClient, url: str, params: dict) -> dict | None:
    try:
        resp = await client.get(url, params=params)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return None


async def fetch_movies(
    api_key: str,
    target: int = 300,
    country: str = "FR",
) -> list[dict]:
    """Fetch up to `target` movies from TMDB. Returns dicts ready for DB insertion."""
    seen_ids: set[int] = set()
    candidate_ids: list[int] = []

    base_params = {"api_key": api_key, "language": "fr-FR"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Popular + top-rated (5 pages × 20 results × 2 = 200 candidates)
        for endpoint in ("movie/popular", "movie/top_rated"):
            for page in range(1, 6):
                data = await _get(client, f"{TMDB_BASE}/{endpoint}", {**base_params, "page": page})
                if not data:
                    break
                for item in data.get("results", []):
                    mid = item["id"]
                    if mid not in seen_ids:
                        seen_ids.add(mid)
                        candidate_ids.append(mid)

        # Discover by genre for diversity (~20 results per genre)
        for genre_id in DISCOVER_GENRE_IDS:
            data = await _get(
                client,
                f"{TMDB_BASE}/discover/movie",
                {
                    **base_params,
                    "with_genres": genre_id,
                    "sort_by": "vote_count.desc",
                    "vote_count.gte": 1000,
                    "page": 1,
                },
            )
            if data:
                for item in data.get("results", []):
                    mid = item["id"]
                    if mid not in seen_ids:
                        seen_ids.add(mid)
                        candidate_ids.append(mid)

        # Fetch full details for each candidate
        movies: list[dict] = []
        onboarding_count = 0

        for mid in candidate_ids[:target]:
            data = await _get(
                client,
                f"{TMDB_BASE}/movie/{mid}",
                {**base_params, "append_to_response": "credits,watch/providers"},
            )
            if not data or not data.get("poster_path"):
                await asyncio.sleep(0.05)
                continue

            genre_ids = [g["id"] for g in data.get("genres", [])]
            release = data.get("release_date") or "2000-01-01"
            year = int(release[:4]) if release else 2000
            rating = data.get("vote_average") or 0.0
            vote_count = data.get("vote_count") or 0
            language = data.get("original_language") or "en"
            runtime = data.get("runtime") or 0

            cast = [m["name"] for m in data.get("credits", {}).get("cast", [])[:6]]
            director = next(
                (m["name"] for m in data.get("credits", {}).get("crew", []) if m["job"] == "Director"),
                None,
            )
            director_id = director.lower().replace(" ", "_") if director else None

            # Streaming platforms available in `country` via subscription
            wp = data.get("watch/providers", {}).get("results", {}).get(country, {})
            platforms = [
                PROVIDER_MAP[p["provider_id"]]
                for p in wp.get("flatrate", [])
                if p["provider_id"] in PROVIDER_MAP
            ]

            fv = build_feature_vector(genre_ids, year, rating, language, runtime, len(cast))

            # Flag well-known films for onboarding calibration (max 10)
            is_onboarding = 0
            if onboarding_count < 10 and vote_count > 5000 and rating >= 7.8:
                is_onboarding = 1
                onboarding_count += 1

            movies.append({
                "tmdb_id": data["id"],
                "title": data.get("title") or data.get("original_title") or "",
                "year": year,
                "director": director,
                "director_id": director_id,
                "cast": cast,
                "genres": [g["name"] for g in data.get("genres", [])],
                "synopsis": data.get("overview") or "",
                "poster_url": f"{TMDB_IMAGE_BASE}{data['poster_path']}",
                "streaming_platforms": platforms,
                "avg_rating": rating,
                "is_onboarding": is_onboarding,
                "feature_vector": fv,
            })

            await asyncio.sleep(0.05)  # ~20 req/s — safely under TMDB's limit

    return movies
