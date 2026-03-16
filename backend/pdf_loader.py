from __future__ import annotations

from pathlib import Path
from typing import List

from pypdf import PdfReader


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
SAMPLE_PDF_PATH = DATA_DIR / "sample_notes.pdf"


def get_sample_pdf_path() -> Path:
	"""Return the path to the sample PDF stored in the data folder."""
	if not SAMPLE_PDF_PATH.exists():
		raise FileNotFoundError(f"Sample PDF not found: {SAMPLE_PDF_PATH}")

	return SAMPLE_PDF_PATH


def extract_text_from_pdf(pdf_path: str | Path) -> str:
	"""Read every page of a PDF file and return the combined text."""
	reader = PdfReader(str(pdf_path))
	page_text: List[str] = []

	for page in reader.pages:
		# If a page does not contain text, extract_text can return None.
		page_text.append(page.extract_text() or "")

	full_text = "\n".join(page_text).strip()
	if not full_text:
		raise ValueError("The PDF does not contain readable text.")

	return full_text


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
	"""
	Split text into smaller overlapping chunks.

	A small overlap helps preserve context between neighboring chunks.
	"""
	cleaned_text = " ".join(text.split())
	if not cleaned_text:
		return []

	chunks: List[str] = []
	start = 0
	text_length = len(cleaned_text)

	while start < text_length:
		end = min(start + chunk_size, text_length)

		# Try to end on a space so words are not cut in the middle.
		if end < text_length:
			last_space = cleaned_text.rfind(" ", start, end)
			if last_space > start:
				end = last_space

		chunk = cleaned_text[start:end].strip()
		if chunk:
			chunks.append(chunk)

		if end >= text_length:
			break

		start = max(end - overlap, 0)

	return chunks