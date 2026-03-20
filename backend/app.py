from __future__ import annotations

from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ingest import save_uploaded_file
from retrieval import get_answer
from llm import generate_answer


# Create the FastAPI application instance.
app = FastAPI(title="NoteMind API", version="0.1.0")


# Allow the frontend (running on localhost:3000) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    """Request body for the /api/query endpoint."""

    question: str


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
        saved_path = await save_uploaded_file(file=file, allowed_extensions=allowed_extensions)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return {
        "success": True,
        "message": "File uploaded successfully",
        "filename": saved_path.name,
    }


@app.post("/api/query")
def query_notes(payload: QueryRequest) -> dict[str, str]:
    """
    Accept a user question and return a placeholder answer.

    Retrieval + LLM orchestration will be expanded in Day 2.
    """
    answer = generate_answer(question=payload.question)
    return {"answer": answer}
