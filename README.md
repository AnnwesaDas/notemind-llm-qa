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

### Prerequisites
- Python 3.9+ 
- Node.js 18+ (with npm or bun)

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload
```
Backend runs on: **http://localhost:8000**

### Frontend Setup
```bash
cd frontend
npm install
# or if using bun:
bun install

# Start development server
npm run dev
# or with bun:
bun run dev
```
Frontend runs on: **http://localhost:8080**

### Running Both Together
1. **Terminal 1** - Backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app:app --reload
   ```

2. **Terminal 2** - Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open browser to: **http://localhost:8080**

## Features Now Working
✅ File upload (PDF/TXT) - drag & drop or browse  
✅ Chat interface - send queries to backend  
✅ CORS enabled - frontend ↔ backend communication  
✅ Real-time typing indicator  
✅ Error handling & toast notifications
