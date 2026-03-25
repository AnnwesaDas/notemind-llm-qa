from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import requests
from openai import OpenAI
from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BACKEND_DIR / ".env")
load_dotenv(dotenv_path=BACKEND_DIR.parent / ".env")


@lru_cache(maxsize=1)
def _get_openai_client() -> OpenAI:
    """Create and cache an OpenAI client using OPENAI_API_KEY."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")

    return OpenAI(api_key=api_key)


def query_llm(prompt: str) -> str:
    """Query a local Ollama model and return the generated response text."""
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
    model = os.getenv("OLLAMA_MODEL", "phi3")

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

    cleaned_chunks = [chunk.strip() for chunk in context_chunks if chunk and chunk.strip()]
    if not cleaned_chunks:
        return "Not found in provided documents"

    context = "\n\n".join(cleaned_chunks)
    prompt = (
        "You are an AI study assistant. Answer the question using ONLY the provided context.\n\n"
        f"Context:\n{context}\n\n"
        f"Question:\n{cleaned_question}\n\n"
        "Instructions:\n"
        "- Be clear and concise\n"
        "- If answer not in context, say 'Not found in provided documents'"
    )

    llm_provider = os.getenv("LLM_PROVIDER", "openai").strip().lower()

    if llm_provider == "ollama":
        answer = query_llm(prompt)
    else:
        model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

        try:
            client = _get_openai_client()
            response = client.responses.create(
                model=model_name,
                input=prompt,
            )
        except Exception as error:
            raise RuntimeError(f"OpenAI API request failed: {error}") from error

        answer = (response.output_text or "").strip()

    if not answer:
        return "Not found in provided documents"

    return answer
