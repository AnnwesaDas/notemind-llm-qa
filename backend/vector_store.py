from __future__ import annotations

from pathlib import Path

import faiss
import numpy as np


def create_index(embeddings: np.ndarray) -> faiss.IndexFlatL2:
    """
    Create a FAISS index and add all embeddings to it.

    The index type used here is IndexFlatL2, which is simple and beginner-friendly.
    """
    if embeddings.ndim != 2:
        raise ValueError("Embeddings must be a 2D NumPy array.")

    if embeddings.size == 0:
        raise ValueError("Embeddings array is empty. Cannot create index.")

    vector_dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(vector_dimension)
    index.add(embeddings.astype("float32"))
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

