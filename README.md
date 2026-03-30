# NoteMind

[![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-API-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111111)](https://react.dev/)
[![Quickly](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![CI](https://github.com/AnnwesaDas/notemind-llm-qa/actions/workflows/ci.yml/badge.svg)](https://github.com/AnnwesaDas/notemind-llm-qa/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

NoteMind is a full-stack study assistant built with Retrieval-Augmented Generation (RAG).
Upload notes (PDF or TXT), index them with embeddings and FAISS, then ask questions with grounded answers and source chunks.

## Features

- Upload and index PDF/TXT documents
- Store per-document FAISS indexes and chunk metadata
- Ask document-grounded questions with source chunks and scores
- Optional assistant mode for general non-document chat
- React dashboard for upload, document selection, and chat

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | FastAPI, Python |
| Frontend | React 18, TypeScript, Vite |
| Retrieval | sentence-transformers, FAISS |
| Parsing | pypdf |
| LLM provider | Ollama (local HTTP API) |

## Repository Layout

```text
notemind-llm-qa/
|- backend/
|  |- app.py
|  |- ingest.py
|  |- llm.py
|  |- embeddings.py
|  |- pdf_loader.py
|  |- vector_store.py
|  `- requirements.txt
|- frontend/
|  |- src/
|  `- package.json
|- data/
|  |- uploads/
|  |- indexes/
|  `- screenshots/
|- run.ps1
`- README.md
```

## How It Works

1. A file is uploaded to data/uploads.
2. Text is extracted and split into chunks.
3. Chunks are embedded with all-MiniLM-L6-v2.
4. Embeddings are indexed in FAISS.
5. At query time, top matching chunks are retrieved.
6. The LLM answers using retrieved context only (document mode).

## API Reference

### GET /

Health endpoint.

Example response:

```json
{
  "status": "running",
  "message": "NoteMind FastAPI backend is running."
}
```

### POST /api/upload

Upload a PDF or TXT file and build a document index.

- Content type: multipart/form-data
- Field: file

Example response:

```json
{
  "filename": "Unit_2.pdf",
  "num_chunks": 24,
  "message": "Indexed successfully"
}
```

### GET /api/documents

List indexed documents discovered in data/indexes.

Example response:

```json
{
  "documents": [
    {
      "filename": "Unit_2.pdf",
      "num_chunks": 24,
      "uploaded_at_iso": "2026-03-30T12:34:56+00:00"
    }
  ]
}
```

### POST /api/query

Query endpoint with two modes:

- mode=document: retrieve from indexed docs, then answer from context
- mode=assistant: general assistant response without retrieval

Request body:

```json
{
  "question": "Summarize key concepts",
  "filename": "Unit_2.pdf",
  "mode": "document"
}
```

Example response:

```json
{
  "question": "Summarize key concepts",
  "answer": "...",
  "sources": [
    {
      "text": "...",
      "score": 0.1234,
      "chunk_index": 7
    }
  ]
}
```

Common error codes:

- 400: invalid request (for example empty question or unsupported file type)
- 404: no index/chunks available for retrieval
- 502: LLM provider request failed

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Ollama installed and running

### 1) Configure environment

Create backend/.env:

```env
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=phi3
```

Start and prepare Ollama:

```bash
ollama serve
ollama pull phi3
```

### 2) Backend setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
python -m uvicorn backend.app:app --reload
```

Backend URL: http://127.0.0.1:8000
OpenAPI docs: http://127.0.0.1:8000/docs

### 3) Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: http://localhost:8080

### 4) One-command start (Windows)

From project root:

```powershell
.\run.ps1
```

First-time dependency install:

```powershell
.\run.ps1 -InstallDeps
```

## Data and Persistence

- Uploaded files are stored in data/uploads.
- Per-document FAISS indexes are stored in data/indexes as filename.index.
- Chunk text is stored in data/indexes as filename.chunks.json.

## Local Testing

Backend tests:

```bash
pytest backend/tests -q
```

Frontend tests:

```bash
cd frontend
npm test
```

## Notes

- The frontend is configured to call the backend on http://localhost:8080 -> http://127.0.0.1:8000.
- In document mode, answers are constrained to the retrieved context and may return "Not found in provided documents" when context is insufficient.

## Production Readiness

Current status: suitable for local development and demos.

## Known Limitations

- CORS is currently configured for a single frontend origin (http://localhost:8080).
- Authentication and authorisation are not implemented.
- File validation is basic (extension-based only).
- Index artefacts are file-based; no external vector database is used.
- No rate limiting or request throttling is configured.
- Logging, metrics, and tracing are minimal.
- Error handling is API-friendly, but not yet standardised for observability pipelines.

## Suggested Next Improvements

- Add auth (session/JWT) and per-user document isolation.
- Move storage/indexing to managed services for scale.
- Introduce structured logs, metrics, and health checks for deployments.
- Add CI for backend/frontend tests and linting. **(done)**
