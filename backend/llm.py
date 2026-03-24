from __future__ import annotations

import os
from functools import lru_cache

from openai import OpenAI


@lru_cache(maxsize=1)
def _get_openai_client() -> OpenAI:
    """Create and cache an OpenAI client using OPENAI_API_KEY."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")

    return OpenAI(api_key=api_key)


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
