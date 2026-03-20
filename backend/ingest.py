from __future__ import annotations

from pathlib import Path

from fastapi import UploadFile

from backend.embeddings import generate_embeddings
from backend.pdf_loader import chunk_text, extract_text_from_pdf
from backend.vector_store import create_index, save_index


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
INDEX_PATH = DATA_DIR / "notes_index.faiss"


def _validate_extension(filename: str, allowed_extensions: set[str]) -> str:
    """Validate file extension and return it in lowercase."""
    extension = Path(filename).suffix.lower()
    if extension not in allowed_extensions:
        allowed = ", ".join(sorted(allowed_extensions))
        raise ValueError(f"Only these file types are allowed: {allowed}")
    return extension


async def save_uploaded_file(file: UploadFile, allowed_extensions: set[str]) -> Path:
    """Save an uploaded file to data/uploads and return the final path."""
    if not file.filename:
        raise ValueError("Uploaded file must have a filename.")

    _validate_extension(file.filename, allowed_extensions)

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    target_path = UPLOADS_DIR / Path(file.filename).name

    content = await file.read()
    target_path.write_bytes(content)

    return target_path


def ingest_pdf_to_faiss(pdf_path: str | Path) -> int:
    """
    Optional ingestion helper for upcoming stages.

    This function shows how existing modules are reused:
    PDF -> chunks -> embeddings -> FAISS index.
    """
    full_text = extract_text_from_pdf(pdf_path)
    chunks = chunk_text(full_text)

    if not chunks:
        raise ValueError("No chunks were created from the uploaded PDF.")

    embeddings = generate_embeddings(chunks)
    index = create_index(embeddings)
    save_index(index, INDEX_PATH)

    return len(chunks)
