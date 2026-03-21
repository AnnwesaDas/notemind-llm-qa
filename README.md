# NoteMind — AI-Powered Study Assistant

A full-stack RAG (Retrieval-Augmented Generation) application that lets you
upload study documents and ask questions about them using AI.

---

## Project Structure
```
notemind-llm-qa/
├── backend/
│   ├── app.py              # FastAPI app — routes and server setup
│   ├── ingest.py           # File upload and ingestion logic
│   ├── retrieval.py        # FAISS retrieval logic (stub for now)
│   ├── llm.py              # LLM answer generation (stub for now)
│   ├── embeddings.py       # Sentence transformer embeddings
│   ├── pdf_loader.py       # PDF text extraction and chunking
│   ├── vector_store.py     # FAISS index create/save/load
│   ├── requirements.txt    # Python dependencies
│   └── data/
│       └── uploads/        # Uploaded files are saved here
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx            # React entry point
│   │   ├── App.tsx             # Main app router
│   │   ├── index.css           # Global styles
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
│   │   │   └── ui/             # Shadcn UI components
│   │   ├── hooks/
│   │   │   ├── use-toast.ts    # Toast notifications
│   │   │   └── use-mobile.tsx  # Mobile detection
│   │   └── lib/
│   │       ├── utils.ts        # Utility functions
│   │       └── dummyData.ts    # Sample data for UI testing
│   ├── package.json            # Node dependencies and scripts
│   ├── vite.config.ts          # Vite build config
│   ├── tailwind.config.ts      # Tailwind CSS config
│   └── tsconfig.json           # TypeScript config
│
├── data/
│   └── sample_notes.pdf        # Sample PDF for testing
│
└── README.md
```

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | FastAPI, Python 3.13                |
| Frontend  | React 18, TypeScript, Vite          |
| Styling   | Tailwind CSS, Shadcn UI             |
| Embeddings| sentence-transformers (MiniLM-L6-v2)|
| Vector DB | FAISS                               |
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
Upload a PDF or TXT file. Saves it to `data/uploads/`.

**Request:** `multipart/form-data` with a `file` field.

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "filename": "my_notes.pdf"
}
```

**Errors:**
- `400` — unsupported file type (only `.pdf` and `.txt` allowed)

---

### `POST /api/query`
Ask a question about your uploaded notes.

**Request:**
```json
{
  "question": "What are the key concepts in my notes?"
}
```

**Response:**
```json
{
  "answer": "This is a placeholder answer."
}
```

> Note: Real retrieval and LLM integration coming in Day 2.

---

## RAG Pipeline Status

| Step                        | File              | Status         |
|-----------------------------|-------------------|----------------|
| Extract text from PDF       | `pdf_loader.py`   | ✅ Complete    |
| Chunk text with overlap     | `pdf_loader.py`   | ✅ Complete    |
| Generate embeddings         | `embeddings.py`   | ✅ Complete    |
| Store embeddings in FAISS   | `vector_store.py` | ✅ Complete    |
| Upload file via API         | `ingest.py`       | ✅ Complete    |
| Search FAISS by query       | `retrieval.py`    | 🔲 Day 2      |
| Generate answer with LLM    | `llm.py`          | 🔲 Day 2      |
| Connect retrieval to API    | `app.py`          | 🔲 Day 2      |

---

## Setup and Running

### Prerequisites
- Python 3.9 or higher
- Node.js 18 or higher

---

### Backend Setup
```bash
# 1. Navigate into the backend folder
cd backend

# 2. Create and activate virtual environment (if not already done)
python -m venv .venv
.venv\Scripts\activate       # Windows
source .venv/bin/activate    # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the server
uvicorn app:app --reload
```

Backend runs on: **http://127.0.0.1:8000**

API docs available at: **http://127.0.0.1:8000/docs**

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
cd backend
.venv\Scripts\activate
uvicorn app:app --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:8080** in your browser.

---

## Current Status

### ✅ Working (Day 1)
- FastAPI server running with CORS enabled
- File upload endpoint accepting PDF and TXT files
- Files saved to `data/uploads/`
- Dummy query endpoint returning placeholder answer
- Full frontend UI with chat, dashboard, flashcards, and compare pages
- PDF loading, chunking, embedding, and FAISS indexing modules ready

### 🔲 Coming Next (Day 2)
- Wire up FAISS search to the query endpoint
- Embed user questions and find matching chunks
- Integrate an LLM to generate real answers from retrieved context
- Return cited answers linked to source documents
