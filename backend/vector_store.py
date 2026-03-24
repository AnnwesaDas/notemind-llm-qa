from __future__ import annotations

from pathlib import Path
from typing import Any

import faiss
import numpy as np


def create_faiss_index(embeddings: np.ndarray) -> faiss.IndexFlatL2:
    """
    Create a FAISS index and add all embeddings to it.

    We use IndexFlatL2 (Euclidean distance), which is simple and beginner-friendly.
    """
    if embeddings.ndim != 2:
        raise ValueError("Embeddings must be a 2D NumPy array.")

    if embeddings.size == 0:
        raise ValueError("Embeddings array is empty. Cannot create index.")

    normalized_embeddings = embeddings.astype("float32")
    vector_dimension = normalized_embeddings.shape[1]
    index = faiss.IndexFlatL2(vector_dimension)
    index.add(normalized_embeddings)
    return index


def save_index(index: faiss.Index, index_path: str | Path = "data/notes_index.faiss") -> None:
    """Save the FAISS index to a local file."""
    path = Path(index_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(path))


def load_index(index_path: str | Path = "data/notes_index.faiss") -> faiss.Index:
    """Load a FAISS index from a local file."""
    path = Path(index_path)
    if not path.exists():
        raise FileNotFoundError(f"FAISS index file not found: {path}")

    return faiss.read_index(str(path))


def search_index(
    index: faiss.Index,
    query_embedding: np.ndarray,
    top_k: int = 5,
) -> dict[str, list[Any]]:
    """
    Search top-k nearest vectors in a FAISS index.

    Returns both the vector indices and their L2 distance scores.
    Lower score means the vector is closer.
    """
    if top_k <= 0:
        raise ValueError("top_k must be greater than 0.")

    if query_embedding.ndim == 1:
        query_embedding = query_embedding.reshape(1, -1)

    if query_embedding.ndim != 2 or query_embedding.shape[0] != 1:
        raise ValueError("query_embedding must be shape (dim,) or (1, dim).")

    distances, indices = index.search(query_embedding.astype("float32"), top_k)
    return {
        "indices": indices[0].tolist(),
        "scores": distances[0].tolist(),
    }


def create_index(embeddings: np.ndarray) -> faiss.IndexFlatL2:
    """Backward-compatible alias for older code paths."""
    return create_faiss_index(embeddings)

