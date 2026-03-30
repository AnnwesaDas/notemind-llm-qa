from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any, Literal

import numpy as np

try:
    from backend.embeddings import generate_embeddings
    from backend.ingest import search_uploaded_notes
    from backend.llm import generate_answer
except ModuleNotFoundError:
    from embeddings import generate_embeddings
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


@dataclass
class DocumentSignals:
    document_id: str
    document_name: str
    relevance: float
    query_coverage: float
    concepts: set[str]
    top_text: str


MIN_DOC_RELEVANCE = 0.25
MIN_QUERY_COVERAGE = 0.10
MIN_OVERLAP_SCORE_COMPARE = 0.30
MIN_OVERLAP_SCORE_GAPS = 0.22
MIN_SHARED_CONCEPTS_COMPARE = 2
MIN_SHARED_CONCEPTS_GAPS = 1
MIN_SEMANTIC_COMPARE = 0.20
MIN_SEMANTIC_GAPS = 0.10
MIN_RANK_CONFIDENCE = 0.30


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


def _extract_gap_candidates(source_chunks: list[dict[str, Any]], other_chunks: list[dict[str, Any]]) -> list[str]:
    source_tokens = set()
    for chunk in source_chunks:
        source_tokens |= _tokenize(str(chunk.get("text", "")))

    other_tokens = set()
    for chunk in other_chunks:
        other_tokens |= _tokenize(str(chunk.get("text", "")))

    return [token for token in sorted(source_tokens - other_tokens) if len(token) > 4]


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


def _safe_text(value: Any) -> str:
    return str(value or "").strip()


def _build_document_signals(query: str, doc: RetrievedDocument) -> DocumentSignals:
    merged_text = " ".join(_safe_text(chunk.get("text")) for chunk in doc.chunks)
    concepts = _tokenize(merged_text)
    query_tokens = _tokenize(query)

    if doc.chunks:
        avg_distance = sum(float(chunk.get("score", 1.0)) for chunk in doc.chunks) / len(doc.chunks)
    else:
        avg_distance = 1e9

    retrieval_strength = 1.0 / (1.0 + max(avg_distance, 0.0))
    query_coverage = len(query_tokens & concepts) / max(len(query_tokens), 1)
    relevance = round(0.65 * retrieval_strength + 0.35 * query_coverage, 4)

    top_text = _safe_text(doc.chunks[0].get("text")) if doc.chunks else ""
    return DocumentSignals(
        document_id=doc.id,
        document_name=doc.name,
        relevance=relevance,
        query_coverage=round(query_coverage, 4),
        concepts=concepts,
        top_text=top_text,
    )


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0.0:
        return 0.0
    return float(np.dot(a, b) / denom)


def _semantic_overlap(left_text: str, right_text: str) -> float:
    if not left_text or not right_text:
        return 0.0

    try:
        vectors = generate_embeddings([left_text, right_text])
        if vectors.shape[0] != 2:
            return 0.0
        similarity = _cosine_similarity(vectors[0], vectors[1])
        return round(max(0.0, min((similarity + 1.0) / 2.0, 1.0)), 4)
    except Exception:
        return 0.0


def _pair_overlap_reason(
    query: str,
    left_doc: RetrievedDocument,
    right_doc: RetrievedDocument,
    mode: CompareMode,
) -> dict[str, Any]:
    left = _build_document_signals(query=query, doc=left_doc)
    right = _build_document_signals(query=query, doc=right_doc)

    shared_concepts = sorted(left.concepts & right.concepts)
    concept_overlap = len(shared_concepts) / max(min(len(left.concepts), len(right.concepts)), 1)
    semantic_similarity = _semantic_overlap(left.top_text, right.top_text)
    overlap_score = (
        0.35 * min(left.relevance, right.relevance)
        + 0.25 * concept_overlap
        + 0.25 * semantic_similarity
        + 0.15 * min(left.query_coverage, right.query_coverage)
    )
    overlap_score = round(max(0.0, min(overlap_score, 1.0)), 4)

    shared_limit = MIN_SHARED_CONCEPTS_COMPARE if mode == "compare" else MIN_SHARED_CONCEPTS_GAPS
    semantic_limit = MIN_SEMANTIC_COMPARE if mode == "compare" else MIN_SEMANTIC_GAPS
    overlap_limit = MIN_OVERLAP_SCORE_COMPARE if mode == "compare" else MIN_OVERLAP_SCORE_GAPS

    is_supported = (
        left.relevance >= MIN_DOC_RELEVANCE
        and right.relevance >= MIN_DOC_RELEVANCE
        and left.query_coverage >= MIN_QUERY_COVERAGE
        and right.query_coverage >= MIN_QUERY_COVERAGE
        and len(shared_concepts) >= shared_limit
        and semantic_similarity >= semantic_limit
        and overlap_score >= overlap_limit
    )

    return {
        "is_supported": is_supported,
        "doc_relevance": [
            {
                "document_id": left.document_id,
                "document_name": left.document_name,
                "relevance": left.relevance,
                "query_coverage": left.query_coverage,
            },
            {
                "document_id": right.document_id,
                "document_name": right.document_name,
                "relevance": right.relevance,
                "query_coverage": right.query_coverage,
            },
        ],
        "shared_concepts": shared_concepts[:15],
        "semantic_similarity": semantic_similarity,
        "overlap_score": overlap_score,
    }


def _multi_doc_rank_confidence(query: str, docs: list[RetrievedDocument]) -> tuple[float, dict[str, Any]]:
    signals = [_build_document_signals(query=query, doc=doc) for doc in docs]
    if not signals:
        return 0.0, {"doc_relevance": [], "shared_concepts": [], "overlap_score": 0.0}

    avg_relevance = sum(signal.relevance for signal in signals) / len(signals)
    avg_coverage = sum(signal.query_coverage for signal in signals) / len(signals)

    shared = set(signals[0].concepts)
    for signal in signals[1:]:
        shared &= signal.concepts

    pairwise_similarities: list[float] = []
    for i in range(len(signals)):
        for j in range(i + 1, len(signals)):
            pairwise_similarities.append(_semantic_overlap(signals[i].top_text, signals[j].top_text))
    semantic_similarity = sum(pairwise_similarities) / len(pairwise_similarities) if pairwise_similarities else 0.0

    confidence = 0.45 * avg_relevance + 0.35 * avg_coverage + 0.20 * semantic_similarity
    confidence = round(max(0.0, min(confidence, 1.0)), 4)

    reason = {
        "doc_relevance": [
            {
                "document_id": signal.document_id,
                "document_name": signal.document_name,
                "relevance": signal.relevance,
                "query_coverage": signal.query_coverage,
            }
            for signal in signals
        ],
        "shared_concepts": sorted(shared)[:15],
        "semantic_similarity": round(semantic_similarity, 4),
        "overlap_score": confidence,
    }
    return confidence, reason


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

    differences: list[dict[str, Any]] = []
    gaps: list[dict[str, Any]] = []
    ranking: list[dict[str, Any]] = []
    reason: dict[str, Any] = {"doc_relevance": [], "shared_concepts": [], "overlap_score": 0.0}
    status = "ok"

    evidence_by_doc: dict[str, list[dict[str, Any]]] = {
        doc.id: _citations(doc) for doc in retrieved_docs
    }

    answer: str

    if mode in {"compare", "gaps"}:
        doc_a, doc_b = retrieved_docs[0], retrieved_docs[1]
        reason = _pair_overlap_reason(query=cleaned_query, left_doc=doc_a, right_doc=doc_b, mode=mode)

        if not reason["is_supported"]:
            status = "insufficient_overlap"
            answer = (
                "These documents do not appear to discuss the same topic closely enough to support "
                "a reliable comparison for this query."
            )
            summary = "Insufficient shared evidence across selected documents."

            return {
                "mode": mode,
                "query": cleaned_query,
                "status": status,
                "documents": [{"id": doc.id, "name": doc.name} for doc in retrieved_docs],
                "answer": answer,
                "reason": {
                    "doc_relevance": reason["doc_relevance"],
                    "shared_concepts": reason["shared_concepts"],
                    "semantic_similarity": reason["semantic_similarity"],
                    "overlap_score": reason["overlap_score"],
                },
                "evidence": {
                    "doc_a": _citations(doc_a),
                    "doc_b": _citations(doc_b),
                },
                "comparison": {
                    "summary": summary,
                    "differences": [],
                    "gaps": [],
                    "ranking": [],
                },
            }

        answer = _synthesize(mode=mode, query=cleaned_query, docs=retrieved_docs)

        if mode == "compare":
            # Differences are only emitted when both documents have sufficient overlap support.
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
            signal_map = {
                item["document_id"]: item for item in reason["doc_relevance"]
            }

            candidates_b_minus_a = _extract_gap_candidates(doc_b.chunks, doc_a.chunks)
            candidates_a_minus_b = _extract_gap_candidates(doc_a.chunks, doc_b.chunks)

            a_relevance = float(signal_map.get(doc_a.id, {}).get("relevance", 0.0))
            b_relevance = float(signal_map.get(doc_b.id, {}).get("relevance", 0.0))

            if candidates_b_minus_a and b_relevance >= MIN_DOC_RELEVANCE and (b_relevance - a_relevance) >= 0.06:
                gaps.append(
                    {
                        "missing_in_document_id": doc_a.id,
                        "present_in_document_id": doc_b.id,
                        "concept": candidates_b_minus_a[0],
                        "evidence": _citations(doc_b),
                    }
                )

            if candidates_a_minus_b and a_relevance >= MIN_DOC_RELEVANCE and (a_relevance - b_relevance) >= 0.06:
                gaps.append(
                    {
                        "missing_in_document_id": doc_b.id,
                        "present_in_document_id": doc_a.id,
                        "concept": candidates_a_minus_b[0],
                        "evidence": _citations(doc_a),
                    }
                )

            if not gaps:
                status = "low_confidence"
                answer = "No reliable gap detected from the retrieved evidence for this query."

    elif mode == "rank":
        confidence, reason = _multi_doc_rank_confidence(query=cleaned_query, docs=retrieved_docs)

        ranked = []
        for doc in retrieved_docs:
            score, item_reason = _document_score(query=cleaned_query, chunks=doc.chunks)
            ranked.append(
                {
                    "document_id": doc.id,
                    "document_name": doc.name,
                    "score": score,
                    "reason": item_reason,
                    "citations": _citations(doc),
                }
            )

        ranking = sorted(ranked, key=lambda item: float(item["score"]), reverse=True)

        if confidence < MIN_RANK_CONFIDENCE:
            status = "low_confidence"
            answer = (
                "Ranking confidence is low because the selected documents show weak relevance or overlap "
                "for this query. No strong winner can be claimed reliably."
            )
        else:
            answer = _synthesize(mode=mode, query=cleaned_query, docs=retrieved_docs)

    summary = "Comparison generated from document-specific retrieved evidence."
    if mode == "gaps":
        if status == "low_confidence":
            summary = "No reliable gap detected from retrieved evidence."
        else:
            summary = "Gap analysis generated by contrasting concepts present across the two selected documents."
    if mode == "rank":
        if status == "low_confidence":
            summary = "Ranking confidence is low due to weak document relevance/overlap for this query."
        else:
            summary = "Ranking generated from relevance, query-token overlap, and coverage-depth scoring."

    return {
        "mode": mode,
        "query": cleaned_query,
        "status": status,
        "documents": [{"id": doc.id, "name": doc.name} for doc in retrieved_docs],
        "answer": answer,
        "reason": {
            "doc_relevance": reason.get("doc_relevance", []),
            "shared_concepts": reason.get("shared_concepts", []),
            "semantic_similarity": reason.get("semantic_similarity", 0.0),
            "overlap_score": reason.get("overlap_score", 0.0),
        },
        "evidence": evidence_by_doc,
        "comparison": {
            "summary": summary,
            "differences": differences,
            "gaps": gaps,
            "ranking": ranking,
        },
    }
