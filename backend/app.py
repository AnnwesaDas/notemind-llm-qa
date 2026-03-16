from __future__ import annotations

from pathlib import Path
from typing import Any

from flask import Flask, jsonify

from embeddings import generate_embeddings
from pdf_loader import chunk_text, extract_text_from_pdf, get_sample_pdf_path
from vector_store import create_index, save_index


app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
INDEX_PATH = BASE_DIR / "data" / "notes_index.faiss"


@app.route("/", methods=["GET"])
def home() -> Any:
	"""Show a simple message on the base URL."""
	return jsonify(
		{
			"status": "running",
			"message": "NoteMind backend is running. Open /process_notes to process the sample PDF.",
		}
	)


@app.route("/process_notes", methods=["GET", "POST"])
def process_notes() -> Any:
	"""
	Process the sample PDF from the data folder.

	This endpoint performs the complete first stage of the project:
	1. Load the PDF
	2. Extract the text
	3. Split the text into chunks
	4. Generate embeddings
	5. Store embeddings in a FAISS index file
	"""
	try:
		pdf_path = get_sample_pdf_path()
		full_text = extract_text_from_pdf(pdf_path)
		chunks = chunk_text(full_text)

		if not chunks:
			return jsonify({"status": "error", "message": "No chunks were created from the PDF."}), 400

		embeddings = generate_embeddings(chunks)
		index = create_index(embeddings)
		save_index(index, INDEX_PATH)

		return jsonify({"status": "success", "chunks_created": len(chunks)})
	except FileNotFoundError as error:
		return jsonify({"status": "error", "message": str(error)}), 404
	except ValueError as error:
		return jsonify({"status": "error", "message": str(error)}), 400
	except Exception as error:
		return jsonify({"status": "error", "message": f"Unexpected error: {error}"}), 500


if __name__ == "__main__":
	app.run(host="0.0.0.0", port=5000, debug=True)
