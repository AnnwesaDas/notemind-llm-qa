# NoteMind — AI-Powered Study Assistant

A full-stack RAG (Retrieval-Augmented Generation) application that lets you
upload study documents and retrieve the most relevant chunks using vector search.

---

## Project Structure
```
notemind-llm-qa/
├── backend/
│   ├── app.py              # FastAPI app — routes and server setup
│   ├── ingest.py           # File upload and ingestion logic
│   ├── llm.py              # LLM answer generation (Ollama)
│   ├── embeddings.py       # Sentence transformer embeddings
│   ├── pdf_loader.py       # PDF text extraction and chunking
│   ├── vector_store.py     # FAISS index create/save/load
│   ├── requirements.txt    # Python dependencies
│   └── __pycache__/        # Python cache
│
├── frontend/               # Main React + TypeScript application
│   ├── src/
│   │   ├── main.tsx            # React entry point
│   │   ├── App.tsx             # Main app router
│   │   ├── index.css           # Global styles + theme tokens
│   │   ├── pages/
│   │   │   ├── Index.tsx       # Landing page
│   │   │   ├── Dashboard.tsx   # Document management
│   │   │   ├── Chat.tsx        # Chat interface
│   │   │   ├── Compare.tsx     # Compare two documents
│   │   │   ├── Flashcards.tsx  # Flashcard study mode
│   │   │   └── NotFound.tsx    # 404 page
│   │   ├── components/
│   │   │   ├── AppSidebar.tsx  # Navigation sidebar
│   │   │   ├── ChatWindow.tsx  # Chat UI with API integration
│   │   │   ├── DocUploader.tsx # Drag-and-drop file upload
│   │   │   ├── DocSelector.tsx # Document picker
│   │   │   ├── CitationChip.tsx# Citation display chips
│   │   │   ├── StarField.tsx   # Animated background
│   │   │   └── ui/             # Shadcn UI components (40+)
│   │   ├── hooks/
│   │   │   ├── use-toast.ts    # Toast notifications
│   │   │   └── use-mobile.tsx  # Mobile detection
│   │   ├── lib/
│   │   │   ├── utils.ts        # Utility functions
│   │   │   └── dummyData.ts    # Sample data for UI testing
│   │   └── test/
│   │       └── example.test.ts # Vitest examples
│   ├── public/                 # Static assets
│   ├── package.json            # Node dependencies and scripts
│   ├── vite.config.ts          # Vite build config
│   ├── tailwind.config.ts      # Tailwind CSS config (purple/cyan theme)
│   ├── tsconfig.json           # TypeScript config
│   └── other config files      # ESLint, Playwright, PostCSS
│
├── data/
│   ├── notes_index.faiss       # FAISS vector index
│   └── screenshots/            # Storage for screenshots
│
├── docs/                       # Documentation
├── .venv/                      # Python virtual environment
├── backend dependencies        # FastAPI, PyPDF, etc.
├── LICENSE
├── README.md
└── run.ps1                     # Startup script
```

**Note:** Workspace has been optimized by removing unused duplicate folders and CSS files. Frontend structure follows industry-standard React organization.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | FastAPI, Python 3.x                 |
| Frontend  | React 18, TypeScript, Vite          |
| Styling   | Tailwind CSS, Shadcn UI             |
| Embeddings| sentence-transformers (MiniLM-L6-v2)|
| Vector DB | FAISS (faiss-cpu)                   |
| PDF Parse | pypdf                               |

---

## API Endpoints

### `GET /`
Health check — confirms the server is running.

**Response:**
```json
{
  "status": "running",
  "message": "NoteMind FastAPI backend is running."
}
```

---

### `POST /api/upload`
Upload a PDF or TXT file, chunk it, generate embeddings, build a FAISS index,
and persist artifacts to disk.

**Request:** `multipart/form-data` with a `file` field.

**Response:**
```json
{
  "filename": "my_notes.pdf",
  "num_chunks": 24,
  "message": "Indexed successfully"
}
```

**Errors:**
- `400` — unsupported file type (only `.pdf` and `.txt` allowed)

---

### `POST /api/query`
Retrieve top matching chunks for a question from indexed notes.

**Request:**
```json
{
  "question": "What are the key concepts in my notes?"
}
```

Optional request field:
```json
{
  "question": "What are the key concepts in my notes?",
  "filename": "my_notes.pdf"
}
```

**Response:**
```json
{
  "question": "What are the key concepts in my notes?",
  "top_chunks": [
    "chunk text 1",
    "chunk text 2"
  ]
}
```

**Errors:**
- `400` — invalid question input
- `404` — missing index/chunk files (upload first)

---

## RAG Pipeline Status

| Step                               | File(s)                         | Status      |
|------------------------------------|----------------------------------|-------------|
| Extract text from PDF              | `pdf_loader.py`                  | ✅ Complete |
| Chunk text with overlap            | `pdf_loader.py`                  | ✅ Complete |
| Generate embeddings (MiniLM-L6-v2) | `embeddings.py`, `ingest.py`     | ✅ Complete |
| Store/load/search vectors in FAISS | `vector_store.py`                | ✅ Complete |
| Build index on upload              | `ingest.py`, `app.py`            | ✅ Complete |
| Retrieval endpoint (top chunks)    | `ingest.py`, `app.py`            | ✅ Complete |
| LLM answer generation              | `llm.py`                         | ✅ Complete |

---

## Setup and Running

### Prerequisites
- Python 3.9 or higher
- Node.js 18 or higher

---

### Backend Setup
```bash
# 1. Stay at project root
cd notemind-llm-qa

# 2. Create and activate virtual environment (if not already done)
python -m venv .venv
.venv\Scripts\activate       # Windows
source .venv/bin/activate    # Mac/Linux

# 3. Install dependencies
pip install -r backend/requirements.txt

# 4. Start the server
python -m uvicorn backend.app:app --reload
```

Backend runs on: **http://127.0.0.1:8000**

API docs available at: **http://127.0.0.1:8000/docs**

---

## Day 3 Retrieval Testing

1) Upload and index a file

```bash
curl -X POST "http://127.0.0.1:8000/api/upload" \
  -F "file=@data/sample_notes.pdf"
```

2) Query top chunks

```bash
curl -X POST "http://127.0.0.1:8000/api/query" \
  -H "Content-Type: application/json" \
  -d "{\"question\":\"What is this document about?\"}"
```

3) Query a specific uploaded file

```bash
curl -X POST "http://127.0.0.1:8000/api/query" \
  -H "Content-Type: application/json" \
  -d "{\"question\":\"Summarize the key points\",\"filename\":\"sample_notes.pdf\"}"
```

This stage includes retrieval and answer synthesis from the selected LLM provider.

---

## LLM Setup (Ollama)

Create/update `backend/.env`:

```env
# Ollama settings
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=phi3
```

### Ollama quick start

```bash
ollama serve
ollama pull phi3
```

---

### Frontend Setup
```bash
# 1. Navigate into the frontend folder
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Frontend runs on: **http://localhost:8080**

---

### Running Both Together

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd notemind-llm-qa
.venv\Scripts\activate
python -m uvicorn backend.app:app --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:8080** in your browser.

### One-Command Start (Windows PowerShell)

From project root:

```powershell
.\run.ps1
```

First-time setup (installs backend + frontend dependencies, then starts both):

```powershell
.\run.ps1 -InstallDeps
```

---

## Current Status

### ✅ Working (Day 3 Backend)
- FastAPI server with CORS enabled
- Upload endpoint for PDF/TXT
- Ingestion pipeline: extract → chunk → embed → FAISS index save
- Query endpoint returns top 5 retrieved chunks
- Missing index/chunk files handled with API errors

### 🔲 Next Stage
- Add citations and confidence metadata in responses