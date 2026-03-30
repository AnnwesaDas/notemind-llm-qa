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
CompareStatus = Literal["ok", "insufficient_overlap", "insufficient_evidence"]


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

GENERIC_COMPARE_PHRASES = {
    "theoretical foundation",
    "practical application",
    "complementary angles",
    "real-world examples",
    "methodology differs significantly",
    "empirical observation",
    "broader framework",
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
MIN_CLAIM_SUPPORT_CONFIDENCE = 0.30


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


def _split_sentences(text: str) -> list[str]:
    if not text:
        return []
    raw = re.split(r"(?<=[.!?])\s+", text)
    return [sentence.strip() for sentence in raw if sentence.strip()]


def _extract_supported_points(query: str, doc: RetrievedDocument, max_points: int = 4) -> list[dict[str, Any]]:
    query_tokens = _tokenize(query)
    points: list[dict[str, Any]] = []

    for chunk in doc.chunks:
        chunk_text = _safe_text(chunk.get("text"))
        if not chunk_text:
            continue
        for sentence in _split_sentences(chunk_text):
            sentence_tokens = _tokenize(sentence)
            overlap = len(sentence_tokens & query_tokens)
            if overlap == 0:
                continue

            points.append(
                {
                    "point": sentence,
                    "citations": [
                        {
                            "document_id": doc.id,
                            "document_name": doc.name,
                            "chunk_index": chunk.get("chunk_index"),
                            "score": chunk.get("score"),
                            "text": chunk_text,
                        }
                    ],
                    "support_overlap": overlap / max(len(query_tokens), 1),
                }
            )

    # Keep the highest-overlap unique points first.
    dedup: dict[str, dict[str, Any]] = {}
    for item in sorted(points, key=lambda x: float(x["support_overlap"]), reverse=True):
        dedup.setdefault(item["point"], item)

    return list(dedup.values())[:max_points]


def _build_intermediate_structure(query: str, docs: list[RetrievedDocument]) -> dict[str, Any]:
    doc_summaries = []
    concept_sets: list[set[str]] = []

    for doc in docs:
        supported_points = _extract_supported_points(query=query, doc=doc, max_points=4)
        summary_text = " ".join(item["point"] for item in supported_points)
        concepts = _tokenize(summary_text)
        concept_sets.append(concepts)
        doc_summaries.append(
            {
                "document_id": doc.id,
                "document_name": doc.name,
                "supported_points": supported_points,
            }
        )

    shared_topics: list[str] = []
    if concept_sets:
        shared = set(concept_sets[0])
        for concept_set in concept_sets[1:]:
            shared &= concept_set
        shared_topics = sorted(shared)

    return {
        "query": query,
        "doc_summaries": doc_summaries,
        "shared_topics": shared_topics,
        "differences": [],
        "abstain": False,
        "abstain_reason": "",
    }


def _contains_unsupported_generic_phrase(text: str, evidence_text: str) -> bool:
    normalized_text = text.lower()
    normalized_evidence = evidence_text.lower()
    for phrase in GENERIC_COMPARE_PHRASES:
        if phrase in normalized_text and phrase not in normalized_evidence:
            return True
    return False


def _claim_confidence(
    claim: str,
    support_a: list[dict[str, Any]],
    support_b: list[dict[str, Any]],
    overlap_score: float,
) -> float:
    claim_tokens = _tokenize(claim)
    text_a = " ".join(_safe_text(item.get("text")) for item in support_a)
    text_b = " ".join(_safe_text(item.get("text")) for item in support_b)
    evidence_tokens = _tokenize(text_a + " " + text_b)
    lexical_support = len(claim_tokens & evidence_tokens) / max(len(claim_tokens), 1)

    confidence = 0.6 * lexical_support + 0.4 * overlap_score
    return round(max(0.0, min(confidence, 1.0)), 4)


def _build_verified_differences(
    query: str,
    doc_a: RetrievedDocument,
    doc_b: RetrievedDocument,
    intermediate: dict[str, Any],
    overlap_score: float,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    rejected_claims: list[dict[str, Any]] = []

    a_summary = intermediate["doc_summaries"][0]
    b_summary = intermediate["doc_summaries"][1]
    points_a = a_summary["supported_points"]
    points_b = b_summary["supported_points"]

    if not points_a or not points_b:
        return [], [{"claim": "No candidate claims", "reason": "missing_support_points"}]

    point_a = points_a[0]
    point_b = points_b[0]

    claim = (
        f"For query '{query}', {doc_a.name} highlights: {point_a['point']} "
        f"while {doc_b.name} highlights: {point_b['point']}"
    )

    support_a = point_a["citations"]
    support_b = point_b["citations"]

    # Must have support on both sides and lexical support in evidence.
    confidence = _claim_confidence(claim=claim, support_a=support_a, support_b=support_b, overlap_score=overlap_score)
    if confidence < MIN_CLAIM_SUPPORT_CONFIDENCE:
        rejected_claims.append({"claim": claim, "reason": "low_claim_support_confidence"})
        return [], rejected_claims

    combined_evidence_text = " ".join(_safe_text(item.get("text")) for item in support_a + support_b)
    if _contains_unsupported_generic_phrase(claim, combined_evidence_text):
        rejected_claims.append({"claim": claim, "reason": "unsupported_by_evidence"})
        return [], rejected_claims

    verified = [
        {
            "claim": claim,
            "topic": query,
            "support_a": support_a,
            "support_b": support_b,
            "confidence": confidence,
            "doc_a": {
                "document_id": doc_a.id,
                "document_name": doc_a.name,
                "claim": point_a["point"],
                "citations": support_a,
            },
            "doc_b": {
                "document_id": doc_b.id,
                "document_name": doc_b.name,
                "claim": point_b["point"],
                "citations": support_b,
            },
        }
    ]
    return verified, rejected_claims


def _deterministic_compare_answer(verified_differences: list[dict[str, Any]]) -> str:
    if not verified_differences:
        return "I could not find enough shared evidence to compare these documents reliably."

    parts: list[str] = []
    for item in verified_differences:
        doc_a = item["doc_a"]["document_name"]
        doc_b = item["doc_b"]["document_name"]
        claim_a = item["doc_a"]["claim"]
        claim_b = item["doc_b"]["claim"]
        parts.append(f"{doc_a}: {claim_a}")
        parts.append(f"{doc_b}: {claim_b}")

    return " ".join(parts)


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
        "Rules:\n"
        "- Use only explicit evidence from context.\n"
        "- Do not infer pedagogical style, methodology, abstraction level, theory/practice framing unless explicit.\n"
        "- Do not use phrases like theoretical foundation, practical application, complementary angles, real-world examples, empirical observation unless directly evidenced.\n"
        "- If evidence is weak or unrelated, say so.\n"
        "- Prefer no comparison over weak comparison.\n"
        "Return concise grounded output."
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
    status: CompareStatus = "ok"
    supported_comparison_points: list[dict[str, Any]] = []
    rejected_claims: list[dict[str, Any]] = []

    evidence_by_doc: dict[str, list[dict[str, Any]]] = {
        doc.id: _citations(doc) for doc in retrieved_docs
    }
    flat_citations: list[dict[str, Any]] = [item for values in evidence_by_doc.values() for item in values]

    intermediate = _build_intermediate_structure(query=cleaned_query, docs=retrieved_docs)

    answer: str

    if mode in {"compare", "gaps"}:
        doc_a, doc_b = retrieved_docs[0], retrieved_docs[1]
        reason = _pair_overlap_reason(query=cleaned_query, left_doc=doc_a, right_doc=doc_b, mode=mode)

        if not reason["is_supported"]:
            status = "insufficient_overlap"
            intermediate["abstain"] = True
            intermediate["abstain_reason"] = "overlap_below_threshold"
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
                "supported_comparison_points": [],
                "rejected_claims": rejected_claims,
                "evidence": {
                    "doc_a": _citations(doc_a),
                    "doc_b": _citations(doc_b),
                },
                "citations": flat_citations,
                "intermediate": intermediate,
                "comparison": {
                    "summary": summary,
                    "differences": [],
                    "gaps": [],
                    "ranking": [],
                },
            }

        verified_differences, rejected_claims = _build_verified_differences(
            query=cleaned_query,
            doc_a=doc_a,
            doc_b=doc_b,
            intermediate=intermediate,
            overlap_score=float(reason["overlap_score"]),
        )

        supported_comparison_points = verified_differences
        intermediate["differences"] = verified_differences

        if not verified_differences and mode == "compare":
            status = "insufficient_evidence"
            intermediate["abstain"] = True
            intermediate["abstain_reason"] = "no_verified_dual_support_claims"
            answer = "I could not find enough shared evidence to compare these documents reliably."
        else:
            answer = _synthesize(mode=mode, query=cleaned_query, docs=retrieved_docs)
            evidence_text = " ".join(_safe_text(c.get("text")) for c in flat_citations)
            if _contains_unsupported_generic_phrase(answer, evidence_text):
                rejected_claims.append(
                    {
                        "claim": answer,
                        "reason": "unsupported_generic_phrase_in_generation",
                    }
                )
                answer = _deterministic_compare_answer(verified_differences)

        if mode == "compare":
            differences = verified_differences

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
                status = "insufficient_evidence"
                intermediate["abstain"] = True
                intermediate["abstain_reason"] = "no_reliable_gap_detected"
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
            status = "insufficient_evidence"
            intermediate["abstain"] = True
            intermediate["abstain_reason"] = "ranking_confidence_below_threshold"
            answer = (
                "Ranking confidence is low because the selected documents show weak relevance or overlap "
                "for this query. No strong winner can be claimed reliably."
            )
        else:
            answer = _synthesize(mode=mode, query=cleaned_query, docs=retrieved_docs)

    summary = "Comparison generated from document-specific retrieved evidence."
    if mode == "gaps":
        if status == "insufficient_evidence":
            summary = "No reliable gap detected from retrieved evidence."
        else:
            summary = "Gap analysis generated by contrasting concepts present across the two selected documents."
    if mode == "rank":
        if status == "insufficient_evidence":
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
        "supported_comparison_points": supported_comparison_points,
        "rejected_claims": rejected_claims,
        "evidence": evidence_by_doc,
        "citations": flat_citations,
        "intermediate": intermediate,
        "comparison": {
            "summary": summary,
            "differences": differences,
            "gaps": gaps,
            "ranking": ranking,
        },
    }
