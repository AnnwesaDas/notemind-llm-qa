# NoteMind - LLM-Powered Study Assistant

A full-stack application combining FastAPI backend with React frontend for intelligent document analysis and Q&A.

## Project Structure

```text
notemind-llm-qa/
├── backend/
│   ├── app.py                    # FastAPI application & routes
│   ├── ingest.py                 # File upload & processing
│   ├── retrieval.py              # FAISS retrieval helpers (stub)
│   ├── llm.py                    # LLM answer generation
│   ├── embeddings.py             # Sentence transformer embeddings
│   ├── pdf_loader.py             # PDF processing
│   ├── vector_store.py           # FAISS vector storage
│   └── requirements.txt           # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx              # React entry point
│   │   ├── App.tsx               # Main app router
│   │   ├── index.css             # Global styles
│   │   ├── vite-env.d.ts         # Vite environment types
│   │   │
│   │   ├── pages/
│   │   │   ├── Index.tsx         # Landing page
│   │   │   ├── Dashboard.tsx     # Document management
│   │   │   ├── Chat.tsx          # Chat interface
│   │   │   ├── Compare.tsx       # Compare documents
│   │   │   ├── Flashcards.tsx    # Flashcard generation
│   │   │   └── NotFound.tsx      # 404 page
│   │   │
│   │   ├── components/
│   │   │   ├── AppSidebar.tsx    # Navigation sidebar
│   │   │   ├── ChatWindow.tsx    # Chat UI with API integration
│   │   │   ├── DocUploader.tsx   # File upload with drag-drop
│   │   │   ├── DocSelector.tsx   # Document picker
│   │   │   ├── CitationChip.tsx  # Citation display
│   │   │   ├── NavLink.tsx       # Navigation links
│   │   │   └── ui/               # Shadcn UI components
│   │   │
│   │   ├── hooks/
│   │   │   ├── use-toast.ts      # Toast notifications
│   │   │   └── use-mobile.tsx    # Mobile detection
│   │   │
│   │   ├── lib/
│   │   │   ├── utils.ts          # Utility functions
│   │   │   └── dummyData.ts      # Sample data
│   │   │
│   │   └── test/
│   │       ├── example.test.ts   # Unit tests
│   │       └── setup.ts          # Test setup
│   │
│   ├── public/                    # Static assets
│   ├── package.json               # Node dependencies & scripts
│   ├── vite.config.ts             # Vite build config
│   ├── tailwind.config.ts         # Tailwind CSS config
│   ├── tsconfig.json              # TypeScript config
│   └── vitest.config.ts           # Vitest config
│
├── data/
│   ├── uploads/                   # User uploaded files
│   └── notes_index.faiss          # FAISS vector index
│
└── README.md
```

## Backend Components

- **app.py**: FastAPI application, CORS middleware, API route definitions
- **ingest.py**: Handles file uploads and saves to `data/uploads/`
- **retrieval.py**: FAISS-based document retrieval (in development)
- **llm.py**: LLM integration for answer generation
- **embeddings.py**: Sentence transformer for document embeddings
- **pdf_loader.py**: PDF text extraction
- **vector_store.py**: FAISS vector database operations

## Frontend Components

- **ChatWindow**: Real-time chat with backend `/api/query` integration
- **DocUploader**: Drag-and-drop file upload to `/api/upload`
- **Dashboard**: Document management interface
- **Chat**: Query interface with conversation history
- **Compare**: Side-by-side document comparison
- **Flashcards**: Auto-generated study flashcards

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
