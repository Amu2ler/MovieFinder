"""
Item-item collaborative filtering using NumPy.
Falls back to pure content-based when fewer than MIN_USERS have interacted.
"""

import json
import numpy as np
from typing import Optional

MIN_USERS = 3  # minimum users needed before collab filtering kicks in


def build_interaction_matrix(
    interactions: list[dict],
    all_movie_ids: list[int],
    all_user_ids: list[int],
) -> Optional[np.ndarray]:
    """
    Build a users × movies interaction matrix.
    +1 for like, -1 for dislike.
    Returns None if not enough users.
    """
    if len(all_user_ids) < MIN_USERS:
        return None

    user_index = {uid: i for i, uid in enumerate(all_user_ids)}
    movie_index = {mid: j for j, mid in enumerate(all_movie_ids)}

    matrix = np.zeros((len(all_user_ids), len(all_movie_ids)), dtype=np.float32)
    for inter in interactions:
        u = user_index.get(inter["user_id"])
        m = movie_index.get(inter["movie_id"])
        if u is None or m is None:
            continue
        matrix[u, m] = 1.0 if inter["action"] == "like" else -1.0

    return matrix


def item_item_similarity(matrix: np.ndarray) -> np.ndarray:
    """Cosine similarity between movie columns."""
    # matrix: users × movies  →  transpose to movies × users
    M = matrix.T  # shape: (movies, users)
    norms = np.linalg.norm(M, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    M_norm = M / norms
    return M_norm @ M_norm.T  # (movies, movies)


def get_collab_scores(
    user_id: int,
    interactions: list[dict],
    all_movie_ids: list[int],
    all_user_ids: list[int],
) -> dict[int, float]:
    """
    Returns a dict {movie_id: score} of collaborative scores for the given user.
    Score is weighted sum of item similarities to movies the user liked.
    Returns empty dict if not enough data.
    """
    matrix = build_interaction_matrix(interactions, all_movie_ids, all_user_ids)
    if matrix is None:
        return {}

    user_index = {uid: i for i, uid in enumerate(all_user_ids)}
    movie_index = {mid: j for j, mid in enumerate(all_movie_ids)}
    idx_to_movie = {j: mid for mid, j in movie_index.items()}

    u_idx = user_index.get(user_id)
    if u_idx is None:
        return {}

    sim = item_item_similarity(matrix)
    user_row = matrix[u_idx]  # (movies,)

    scores = sim @ user_row  # weighted sum of similarities
    return {idx_to_movie[j]: float(scores[j]) for j in range(len(all_movie_ids))}
