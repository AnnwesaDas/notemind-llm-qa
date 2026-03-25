from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import UploadFile
import numpy as np

try:
    # Package import path (e.g., from project root).
    from backend.pdf_loader import chunk_text, extract_text_from_pdf
    from backend.vector_store import create_faiss_index, load_index, save_index, search_index
except ModuleNotFoundError:
    # Local import path (e.g., when running from backend directory).
    from pdf_loader import chunk_text, extract_text_from_pdf
    from vector_store import create_faiss_index, load_index, save_index, search_index





BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
INDEXES_DIR = DATA_DIR / "indexes"
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

    embeddings = embed_chunks(chunks)
    index = create_faiss_index(embeddings)
    save_index(index, INDEX_PATH)

    return len(chunks)


def process_uploaded_file(file_path: str | Path) -> dict[str, Any]:
    """
    Process an uploaded PDF/TXT file into chunks and return ingestion metadata.

    The function intentionally keeps all file processing logic in ingest.py so
    API routes can remain thin.
    """
    path = Path(file_path)
    extension = path.suffix.lower()

    # Read source text based on file type.
    if extension == ".pdf":
        try:
            text = extract_text_from_pdf(path)
        except Exception as error:
            raise ValueError(f"Could not read PDF content: {error}") from error
    elif extension == ".txt":
        try:
            text = path.read_text(encoding="utf-8").strip()
        except (OSError, UnicodeDecodeError) as error:
            raise ValueError(f"Could not read TXT content: {error}") from error
    else:
        raise ValueError("Unsupported file type. Only .pdf and .txt are allowed.")

    # Ensure readable text exists before chunking.
    if not text:
        raise ValueError("Uploaded file did not contain readable text.")

    # Split text into chunks for retrieval-ready ingestion output.
    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("No chunks were created from the uploaded file.")

    sample_chunk = chunks[0][:200]
    return {
        "num_chunks": len(chunks),
        "sample_chunk": sample_chunk,
        "chunks": chunks,
    }


def embed_chunks(chunks: list[str]) -> np.ndarray:
    """
    Convert text chunks into embeddings using all-MiniLM-L6-v2.

    The model loading is cached in backend/embeddings.py, so repeated calls are fast.
    """
    if not chunks:
        raise ValueError("Chunk list is empty. Cannot embed chunks.")

    try:
        from backend.embeddings import generate_embeddings
    except ModuleNotFoundError:
        from embeddings import generate_embeddings

    return generate_embeddings(chunks)


def _get_index_path(filename: str) -> Path:
    """Build index path as ./data/indexes/{filename}.index"""
    return INDEXES_DIR / f"{filename}.index"


def _get_chunk_store_path(filename: str) -> Path:
    """Store original chunks so FAISS search results can map back to text."""
    return INDEXES_DIR / f"{filename}.chunks.json"


def index_uploaded_file(file_path: str | Path) -> dict[str, Any]:
    """
    Full Day 3 pipeline for uploaded notes:
    extract text -> chunk -> embed -> index -> persist index + chunk map.
    """
    path = Path(file_path)
    processed = process_uploaded_file(path)
    chunks = processed["chunks"]

    embeddings = embed_chunks(chunks)
    index = create_faiss_index(embeddings)

    INDEXES_DIR.mkdir(parents=True, exist_ok=True)
    index_path = _get_index_path(path.name)
    chunk_store_path = _get_chunk_store_path(path.name)

    save_index(index, index_path)
    chunk_store_path.write_text(json.dumps(chunks, ensure_ascii=False), encoding="utf-8")

    return {
        "filename": path.name,
        "num_chunks": len(chunks),
        "index_path": str(index_path),
    }


def _resolve_query_target(filename: str | None = None) -> tuple[Path, Path]:
    """
    Resolve which index/chunk files should be used for querying.

    If filename is omitted, the latest index file in data/indexes is used.
    """
    INDEXES_DIR.mkdir(parents=True, exist_ok=True)

    if filename:
        index_path = _get_index_path(filename)
        chunks_path = _get_chunk_store_path(filename)
        return index_path, chunks_path

    candidates = sorted(INDEXES_DIR.glob("*.index"), key=lambda path: path.stat().st_mtime, reverse=True)
    if not candidates:
        raise FileNotFoundError("No FAISS index found. Upload a file first.")

    index_path = candidates[0]
    filename_stem = index_path.name.removesuffix(".index")
    chunks_path = _get_chunk_store_path(filename_stem)
    return index_path, chunks_path


def search_uploaded_notes(question: str, filename: str | None = None, top_k: int = 5) -> list[str]:
    """
    Embed a question, search FAISS, and return the best matching text chunks.
    """
    cleaned_question = question.strip()
    if not cleaned_question:
        raise ValueError("Question cannot be empty.")

    index_path, chunks_path = _resolve_query_target(filename=filename)
    if not index_path.exists():
        raise FileNotFoundError(f"Index file not found: {index_path}")
    if not chunks_path.exists():
        raise FileNotFoundError(f"Chunk store file not found: {chunks_path}")

    chunks = json.loads(chunks_path.read_text(encoding="utf-8"))
    index = load_index(index_path)

    question_embedding = embed_chunks([cleaned_question])
    search_result = search_index(index=index, query_embedding=question_embedding, top_k=top_k)

    matched_chunks: list[str] = []
    for chunk_index in search_result["indices"]:
        if isinstance(chunk_index, int) and 0 <= chunk_index < len(chunks):
            matched_chunks.append(chunks[chunk_index])

    return matched_chunks


def list_indexed_documents() -> list[dict[str, Any]]:
    """Return indexed documents available under data/indexes."""
    INDEXES_DIR.mkdir(parents=True, exist_ok=True)

    documents: list[dict[str, Any]] = []
    candidates = sorted(
        INDEXES_DIR.glob("*.index"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )

    for index_path in candidates:
        filename = index_path.name.removesuffix(".index")
        chunk_store_path = _get_chunk_store_path(filename)

        num_chunks = 0
        if chunk_store_path.exists():
            try:
                chunk_data = json.loads(chunk_store_path.read_text(encoding="utf-8"))
                if isinstance(chunk_data, list):
                    num_chunks = len(chunk_data)
            except (json.JSONDecodeError, OSError):
                num_chunks = 0

        documents.append(
            {
                "filename": filename,
                "num_chunks": num_chunks,
                "uploaded_at_iso": datetime.fromtimestamp(
                    index_path.stat().st_mtime,
                    tz=timezone.utc,
                ).isoformat(),
            }
        )

    return documents
