from functools import lru_cache
from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """
    Load the Sentence Transformer model once and cache it.

    This project uses the exact model requested in the specification.
    """
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    return SentenceTransformer(model_name)


def generate_embeddings(texts: List[str]) -> np.ndarray:
    """
    Convert a list of text chunks into a NumPy array of embeddings.

    Shape: (num_texts, embedding_dim)
    """
    if not texts:
        raise ValueError("Text chunk list is empty. Cannot generate embeddings.")

    model = get_embedding_model()
    embeddings = model.encode(
        texts,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    return embeddings.astype("float32")

