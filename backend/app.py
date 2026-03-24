from __future__ import annotations

from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    # Package import path (e.g., uvicorn backend.app:app from project root).
    from backend.ingest import index_uploaded_file, save_uploaded_file, search_uploaded_notes
    from backend.llm import generate_answer
except ModuleNotFoundError:
    # Local import path (e.g., python backend/app.py or uvicorn app:app from backend).
    from ingest import index_uploaded_file, save_uploaded_file, search_uploaded_notes
    from llm import generate_answer


# Create the FastAPI application instance.
app = FastAPI(title="NoteMind API", version="0.1.0")


# Allow the frontend (running on localhost:8080) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    """Request body for the /api/query endpoint."""

    question: str
    filename: str | None = None


@app.get("/")
def home() -> dict[str, str]:
    """Health-style endpoint to confirm the API is running."""
    return {
        "status": "running",
        "message": "NoteMind FastAPI backend is running.",
    }


@app.post("/api/upload")
async def upload_notes(file: UploadFile = File(...)) -> dict[str, Any]:
    """
    Upload a PDF or TXT file and save it into data/uploads.

    Business logic is delegated to ingest.py to keep this file lightweight.
    """
    allowed_extensions = {".pdf", ".txt"}

    try:
        # Step 1: persist the uploaded file in data/uploads.
        saved_path = await save_uploaded_file(file=file, allowed_extensions=allowed_extensions)

        # Step 2: extract, chunk, embed, and save a FAISS index for this file.
        ingestion_result = index_uploaded_file(saved_path)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return {
        "filename": saved_path.name,
        "num_chunks": ingestion_result["num_chunks"],
        "message": "Indexed successfully",
    }


@app.post("/api/query")
def query_notes(payload: QueryRequest) -> dict[str, Any]:
    """
    Day 4 retrieval + generation endpoint.

    1) Embed question
    2) Search FAISS index
    3) Generate answer from retrieved chunks
    4) Return answer + raw source chunks
    """
    try:
        top_chunks = search_uploaded_notes(
            question=payload.question,
            filename=payload.filename,
            top_k=5,
        )

        answer = generate_answer(
            question=payload.question,
            context_chunks=top_chunks,
        )
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    return {
        "question": payload.question,
        "answer": answer,
        "sources": top_chunks,
    }
