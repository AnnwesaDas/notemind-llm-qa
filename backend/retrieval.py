from __future__ import annotations

from pathlib import Path

from backend.vector_store import load_index


BASE_DIR = Path(__file__).resolve().parent.parent
INDEX_PATH = BASE_DIR / "data" / "notes_index.faiss"


def load_notes_index():
    """
    Load the NoteMind FAISS index from disk.

    This module is intentionally small for Day 1 and will host
    search/retrieval logic on Day 2.
    """
    return load_index(INDEX_PATH)

# retrieval.py

def get_answer(question: str) -> str:
    """
    Placeholder retrieval function.
    Will later search the FAISS index and return relevant chunks.
    """
    return "This is a placeholder answer."