# NoteMind - Stage 1 Backend

This version of NoteMind implements only the first stage of the project.

It reads a PDF file from the `data` folder, extracts the text, splits the text into chunks, converts the chunks into embeddings, and stores those embeddings in a FAISS index.

## Files

```text
backend/
|-- app.py
|-- embeddings.py
|-- pdf_loader.py
|-- vector_store.py
`-- requirements.txt

data/
`-- sample_notes.pdf
```

## What Each File Does

- `pdf_loader.py` reads the PDF and splits the extracted text into chunks.
- `embeddings.py` converts chunks into embeddings using Sentence Transformers.
- `vector_store.py` creates, saves, and loads a FAISS index.
- `app.py` exposes a Flask endpoint called `/process_notes`.

## Flask Endpoint

### `GET` or `POST /process_notes`

This endpoint performs the whole first-stage pipeline:

1. Load `data/sample_notes.pdf`
2. Extract all text from the PDF
3. Split the text into overlapping chunks
4. Generate embeddings for each chunk
5. Create a FAISS index
6. Save the index locally

Example JSON response:

```json
{
  "status": "success",
  "chunks_created": 8
}
```

## Run Instructions

```bash
pip install -r backend/requirements.txt
python backend/app.py
```
