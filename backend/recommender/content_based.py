"""
Content-based filtering using FAISS.
Maintains an in-memory FAISS index over movie feature vectors.
"""

import json
import math

import faiss
import numpy as np

VECTOR_DIM = 20

# ── Dimension labels for the "Why this?" explainer ─────────────────────────
DIMENSION_LABELS = [
    "films d'action",          # 0
    "drames",                  # 1
    "thrillers",               # 2
    "films d'horreur",         # 3
    "comédies",                # 4
    "science-fiction",         # 5
    "romances",                # 6
    "films policiers",         # 7
    "films d'animation",       # 8
    "documentaires",           # 9
    "films classiques (avant 2000)",  # 10
    "films des années 2000",   # 11
    "films récents (2010+)",   # 12
    "films très bien notés",   # 13
    "atmosphères sombres",     # 14
    "films lents et contemplatifs",  # 15
    "retournements de situation",    # 16
    "films à grand casting",   # 17
    "films biographiques",     # 18
    "cinéma étranger",         # 19
]


class ContentBasedEngine:
    def __init__(self):
        self.index: faiss.Index | None = None
        self.movie_ids: list[int] = []  # maps FAISS index → movie DB id

    def build_index(self, movies: list[dict]) -> None:
        """Build FAISS index from list of movie dicts (must have id + feature_vector)."""
        vectors = []
        self.movie_ids = []
        for m in movies:
            fv = json.loads(m["feature_vector"]) if isinstance(m["feature_vector"], str) else m["feature_vector"]
            if len(fv) != VECTOR_DIM:
                continue
            vectors.append(fv)
            self.movie_ids.append(m["id"])

        if not vectors:
            return

        matrix = np.array(vectors, dtype=np.float32)
        # Normalize for cosine similarity (use IndexFlatIP after normalization)
        faiss.normalize_L2(matrix)
        self.index = faiss.IndexFlatIP(VECTOR_DIM)
        self.index.add(matrix)

    def get_candidates(
        self,
        taste_vector: list[float],
        k: int = 50,
    ) -> list[tuple[int, float]]:
        """
        Return up to k (movie_id, score) pairs sorted by descending similarity.
        Returns empty list if index not built or taste_vector is zero.
        """
        if self.index is None or self.index.ntotal == 0:
            return []

        tv = np.array(taste_vector, dtype=np.float32).reshape(1, -1)
        norm = np.linalg.norm(tv)
        if norm < 1e-9:
            return []
        tv /= norm

        k_actual = min(k, self.index.ntotal)
        scores, indices = self.index.search(tv, k_actual)

        results = []
        for score, idx in zip(scores[0], indices[0], strict=False):
            if idx == -1:
                continue
            results.append((self.movie_ids[idx], float(score)))
        return results


def update_taste_vector(
    current: list[float],
    movie_fv: list[float],
    action: str,
    interaction_count: int,
) -> list[float]:
    """
    Update taste vector given a new like/dislike signal.
    Uses a decaying learning rate so early signals have more weight.
    """
    lr = max(0.05, 1.0 / (1 + interaction_count * 0.1))
    sign = 1.0 if action == "like" else -0.5

    if not current or len(current) != VECTOR_DIM:
        current = [0.0] * VECTOR_DIM

    updated = [
        current[i] + sign * lr * movie_fv[i]
        for i in range(VECTOR_DIM)
    ]

    # Normalize
    norm = math.sqrt(sum(x * x for x in updated))
    if norm > 1e-9:
        updated = [x / norm for x in updated]

    return updated
