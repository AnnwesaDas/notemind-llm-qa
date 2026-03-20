# NoteMind - FastAPI Backend 

This version of NoteMind starts the FastAPI migration while keeping the existing
core modules reusable (`pdf_loader.py`, `embeddings.py`, `vector_store.py`).

## Files

```text
backend/
|-- app.py
|-- ingest.py
|-- retrieval.py
|-- llm.py
|-- embeddings.py
|-- pdf_loader.py
|-- vector_store.py
`-- requirements.txt

data/
|-- uploads/
`-- notes_index.faiss
```

## What Each File Does

- `app.py` contains only API wiring (routes, CORS, request/response handling).
- `ingest.py` handles file ingestion helpers (saving uploads, future indexing flow).
- `retrieval.py` is the home for FAISS retrieval helpers (stub for now).
- `llm.py` provides a placeholder LLM answer function.
- `pdf_loader.py`, `embeddings.py`, and `vector_store.py` remain unchanged and reusable.

## API Endpoints

### `POST /api/upload`

- Accepts one uploaded file (`.pdf` or `.txt`).
- Saves the file to `data/uploads/`.
- Returns a success message and filename.

### `POST /api/query`

Accepts JSON payload:

```json
{
  "question": "What are my key notes?"
}
```

Returns:

```json
{
  "answer": "This is a placeholder answer"
}
```

## Run Instructions

```bash
pip install -r backend/requirements.txt
uvicorn backend.app:app --reload
```
