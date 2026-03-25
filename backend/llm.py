from __future__ import annotations

import os
import re
from pathlib import Path

import requests
from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BACKEND_DIR / ".env")
load_dotenv(dotenv_path=BACKEND_DIR.parent / ".env")


DEFAULT_OLLAMA_URL = "http://localhost:11434/api/generate"
DEFAULT_OLLAMA_MODEL = "phi3"


def _is_non_document_query(question: str) -> bool:
    """Detect short greeting/chit-chat prompts that should not run doc QA."""
    normalized = question.strip().lower()
    if not normalized:
        return True

    greetings = {
        "hi",
        "hello",
        "hey",
        "yo",
        "sup",
        "hola",
        "good morning",
        "good afternoon",
        "good evening",
        "how are you",
        "thanks",
        "thank you",
    }
    if normalized in greetings:
        return True

    # Treat tiny non-specific prompts as non-document queries.
    alpha_tokens = re.findall(r"[a-zA-Z]+", normalized)
    if len(alpha_tokens) <= 2 and not normalized.endswith("?"):
        return True

    return False


def query_llm(prompt: str) -> str:
    """Query a local Ollama model and return the generated response text."""
    ollama_url = os.getenv("OLLAMA_URL", DEFAULT_OLLAMA_URL)
    model = os.getenv("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)

    try:
        response = requests.post(
            ollama_url,
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
            },
            timeout=120,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as error:
        raise RuntimeError(f"Ollama API request failed: {error}") from error

    answer = str(data.get("response", "")).strip()
    if not answer:
        raise RuntimeError("Ollama response was empty.")

    return answer


def generate_answer(question: str, context_chunks: list[str]) -> str:
    """
    Generate an answer using only retrieved context chunks.

    If relevant information is missing from context, the model is instructed
    to reply with: "Not found in provided documents".
    """
    cleaned_question = question.strip()
    if not cleaned_question:
        raise ValueError("Question cannot be empty.")

    if _is_non_document_query(cleaned_question):
        return "Not found in provided documents"

    cleaned_chunks = [chunk.strip() for chunk in context_chunks if chunk and chunk.strip()]
    if not cleaned_chunks:
        return "Not found in provided documents"

    context = "\n\n".join(cleaned_chunks)
    question = cleaned_question
    prompt = f"""
You are an AI study assistant.

Answer ONLY using the provided context.

Context:
{context}

Question:
{question}

STRICT RULES:
- Use ONLY information from the context
- Do NOT add extra knowledge
- Keep answer under 5-6 lines
- If answer not found, say: "Not found in provided documents"
"""

    answer = query_llm(prompt)

    if not answer:
        return "Not found in provided documents"

    return answer


def generate_general_answer(question: str) -> str:
    """Generate a normal conversational response without document retrieval."""
    cleaned_question = question.strip()
    if not cleaned_question:
        raise ValueError("Question cannot be empty.")

    prompt = f"""
You are a helpful AI assistant.

Respond naturally and clearly to the user question.
Keep the response concise and practical.

Question:
{cleaned_question}
"""

    answer = query_llm(prompt)
    if not answer:
        raise RuntimeError("Assistant response was empty.")

    return answer
