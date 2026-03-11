"""
"Why this?" explainer.
Compares user taste_vector with movie feature_vector and finds the top
contributing dimensions, then maps them to human-readable French labels.
"""

from .content_based import DIMENSION_LABELS

DIRECTOR_LABEL = "le réalisateur {director}"
GENRE_LABELS = {
    "Action": "les films d'action",
    "Drama": "les drames",
    "Thriller": "les thrillers",
    "Horror": "les films d'horreur",
    "Comedy": "les comédies",
    "SciFi": "la science-fiction",
    "Romance": "les romances",
    "Crime": "les films policiers",
    "Animation": "les films d'animation",
    "Documentary": "les documentaires",
}


def explain(
    taste_vector: list[float],
    movie: dict,
    liked_movies: list[dict],
    top_n: int = 3,
) -> list[str]:
    """
    Return a list of human-readable reason strings for why `movie` was recommended.
    """
    import json

    reasons = []

    # --- Director match ---
    if liked_movies:
        liked_directors = [m["director"] for m in liked_movies if m.get("director")]
        if movie.get("director") and movie["director"] in liked_directors:
            reasons.append(f"Vous aimez les films de {movie['director']}")

    # --- Feature vector alignment ---
    if taste_vector and len(taste_vector) == 20:
        fv_raw = movie.get("feature_vector", "[]")
        fv = json.loads(fv_raw) if isinstance(fv_raw, str) else fv_raw

        if len(fv) == 20:
            # Element-wise product (contribution per dimension)
            contributions = [taste_vector[i] * fv[i] for i in range(20)]

            # Pick top dimensions (must be positive contribution)
            ranked = sorted(
                [(v, i) for i, v in enumerate(contributions) if v > 0.05],
                reverse=True,
            )

            for val, dim in ranked[:top_n]:
                label = DIMENSION_LABELS[dim]
                reasons.append(f"Correspond à votre goût pour {label}")
                if len(reasons) >= 3:
                    break

    # --- Genre match ---
    if len(reasons) < 2:
        fv_raw = movie.get("feature_vector", "[]")
        fv = json.loads(fv_raw) if isinstance(fv_raw, str) else fv_raw
        genres_raw = movie.get("genres", "[]")
        genres = json.loads(genres_raw) if isinstance(genres_raw, str) else genres_raw
        for genre in genres:
            label = GENRE_LABELS.get(genre)
            if label:
                candidate = f"Le genre {genre} correspond à vos préférences"
                if candidate not in reasons:
                    reasons.append(candidate)
                    break

    # --- Fallback ---
    if not reasons:
        avg = movie.get("avg_rating", 0)
        reasons.append(f"Film très bien noté ({avg}/10) dans votre style")

    return reasons[:3]
