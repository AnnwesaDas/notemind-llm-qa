from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any, Literal

try:
    from backend.ingest import search_uploaded_notes
    from backend.llm import generate_answer
except ModuleNotFoundError:
    from ingest import search_uploaded_notes
    from llm import generate_answer


CompareMode = Literal["compare", "gaps", "rank"]


STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "their",
    "these",
    "this",
    "to",
    "what",
    "which",
    "with",
    "your",
}


@dataclass
class RetrievedDocument:
    id: str
    name: str
    chunks: list[dict[str, Any]]


def infer_mode(query: str, requested_mode: CompareMode | None = None) -> CompareMode:
    if requested_mode in {"compare", "gaps", "rank"}:
        return requested_mode

    normalized = query.lower()
    if any(token in normalized for token in ["rank", "best", "strongest", "most coverage", "which of"]):
        return "rank"
    if any(token in normalized for token in ["miss", "missing", "gap", "left out", "not covered"]):
        return "gaps"
    return "compare"


def _tokenize(text: str) -> set[str]:
    tokens = re.findall(r"[a-zA-Z]{3,}", text.lower())
    return {token for token in tokens if token not in STOPWORDS}


def _citations(doc: RetrievedDocument, max_items: int = 3) -> list[dict[str, Any]]:
    citations: list[dict[str, Any]] = []
    for chunk in doc.chunks[:max_items]:
        citations.append(
            {
                "document_id": doc.id,
                "document_name": doc.name,
                "chunk_index": chunk.get("chunk_index"),
                "score": chunk.get("score"),
                "text": chunk.get("text", ""),
            }
        )
    return citations


def _claim_from_chunks(chunks: list[dict[str, Any]]) -> str:
    if not chunks:
        return "No strong evidence retrieved for this document."
    return str(chunks[0].get("text", "")).strip()[:240] or "No strong evidence retrieved for this document."


def _extract_gap_concept(source_chunks: list[dict[str, Any]], other_chunks: list[dict[str, Any]]) -> str:
    source_tokens = set()
    for chunk in source_chunks:
        source_tokens |= _tokenize(str(chunk.get("text", "")))

    other_tokens = set()
    for chunk in other_chunks:
        other_tokens |= _tokenize(str(chunk.get("text", "")))

    missing = [token for token in sorted(source_tokens - other_tokens) if len(token) > 4]
    if not missing:
        return "topic coverage depth"
    return missing[0]


def _document_score(query: str, chunks: list[dict[str, Any]]) -> tuple[float, str]:
    if not chunks:
        return 0.0, "No relevant evidence was retrieved for this query."

    query_tokens = _tokenize(query)
    merged_text = " ".join(str(chunk.get("text", "")) for chunk in chunks)
    chunk_tokens = _tokenize(merged_text)

    overlap = len(query_tokens & chunk_tokens) / max(len(query_tokens), 1)
    avg_distance = sum(float(chunk.get("score", 1.0)) for chunk in chunks) / len(chunks)
    relevance = 1.0 / (1.0 + max(avg_distance, 0.0))
    depth = min(len(chunk_tokens) / 120.0, 1.0)

    score = 0.55 * relevance + 0.3 * overlap + 0.15 * depth
    score = round(max(0.0, min(score, 1.0)), 4)
    reason = (
        f"Relevance={relevance:.2f}, keyword-overlap={overlap:.2f}, coverage-depth={depth:.2f}. "
        "Higher score means this document provides denser and more query-aligned evidence."
    )
    return score, reason


def retrieve_documents(query: str, document_ids: list[str], top_k: int = 5) -> list[RetrievedDocument]:
    retrieved: list[RetrievedDocument] = []
    for doc_id in document_ids:
        chunks = search_uploaded_notes(question=query, filename=doc_id, top_k=top_k)
        retrieved.append(RetrievedDocument(id=doc_id, name=doc_id, chunks=chunks))
    return retrieved


def _synthesize(mode: CompareMode, query: str, docs: list[RetrievedDocument]) -> str:
    context_parts: list[str] = []
    for doc in docs:
        snippet = "\n".join(str(chunk.get("text", "")) for chunk in doc.chunks[:3])
        context_parts.append(f"Document: {doc.name}\n{snippet}")

    context = "\n\n".join(context_parts)
    prompt_question = (
        f"Mode: {mode}\n"
        f"User query: {query}\n"
        "Provide a grounded, concise comparison using only the context. "
        "Call out major differences and mention if evidence is weak."
    )
    return generate_answer(question=prompt_question, context_chunks=[context])


def build_compare_response(
    query: str,
    document_ids: list[str],
    requested_mode: CompareMode | None = None,
) -> dict[str, Any]:
    cleaned_query = query.strip()
    if not cleaned_query:
        raise ValueError("Query cannot be empty.")

    unique_document_ids = [doc_id.strip() for doc_id in document_ids if doc_id and doc_id.strip()]
    unique_document_ids = list(dict.fromkeys(unique_document_ids))
    if not unique_document_ids:
        raise ValueError("At least one document_id is required.")

    mode = infer_mode(cleaned_query, requested_mode)
    if mode in {"compare", "gaps"} and len(unique_document_ids) != 2:
        raise ValueError(f"Mode '{mode}' requires exactly 2 document_ids.")
    if mode == "rank" and len(unique_document_ids) < 2:
        raise ValueError("Mode 'rank' requires at least 2 document_ids.")

    retrieved_docs = retrieve_documents(query=cleaned_query, document_ids=unique_document_ids, top_k=5)
    answer = _synthesize(mode=mode, query=cleaned_query, docs=retrieved_docs)

    differences: list[dict[str, Any]] = []
    gaps: list[dict[str, Any]] = []
    ranking: list[dict[str, Any]] = []

    if len(retrieved_docs) >= 2 and mode in {"compare", "gaps"}:
        doc_a, doc_b = retrieved_docs[0], retrieved_docs[1]

        if mode == "compare":
            differences.append(
                {
                    "topic": cleaned_query,
                    "doc_a": {
                        "document_id": doc_a.id,
                        "document_name": doc_a.name,
                        "claim": _claim_from_chunks(doc_a.chunks),
                        "citations": _citations(doc_a),
                    },
                    "doc_b": {
                        "document_id": doc_b.id,
                        "document_name": doc_b.name,
                        "claim": _claim_from_chunks(doc_b.chunks),
                        "citations": _citations(doc_b),
                    },
                }
            )

        if mode == "gaps":
            concept_in_b_missing_in_a = _extract_gap_concept(doc_b.chunks, doc_a.chunks)
            concept_in_a_missing_in_b = _extract_gap_concept(doc_a.chunks, doc_b.chunks)

            gaps.extend(
                [
                    {
                        "missing_in_document_id": doc_a.id,
                        "present_in_document_id": doc_b.id,
                        "concept": concept_in_b_missing_in_a,
                        "evidence": _citations(doc_b),
                    },
                    {
                        "missing_in_document_id": doc_b.id,
                        "present_in_document_id": doc_a.id,
                        "concept": concept_in_a_missing_in_b,
                        "evidence": _citations(doc_a),
                    },
                ]
            )

    if mode == "rank":
        ranked = []
        for doc in retrieved_docs:
            score, reason = _document_score(query=cleaned_query, chunks=doc.chunks)
            ranked.append(
                {
                    "document_id": doc.id,
                    "document_name": doc.name,
                    "score": score,
                    "reason": reason,
                    "citations": _citations(doc),
                }
            )

        ranking = sorted(ranked, key=lambda item: float(item["score"]), reverse=True)

    summary = "Comparison generated from document-specific retrieved evidence."
    if mode == "gaps":
        summary = "Gap analysis generated by contrasting concepts present across the two selected documents."
    if mode == "rank":
        summary = "Ranking generated from relevance, query-token overlap, and coverage-depth scoring."

    return {
        "mode": mode,
        "query": cleaned_query,
        "documents": [{"id": doc.id, "name": doc.name} for doc in retrieved_docs],
        "answer": answer,
        "comparison": {
            "summary": summary,
            "differences": differences,
            "gaps": gaps,
            "ranking": ranking,
        },
    }
