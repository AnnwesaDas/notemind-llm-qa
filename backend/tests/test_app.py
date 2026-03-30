from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

import backend.app as app_module
import backend.compare as compare_module


client = TestClient(app_module.app)


def test_home_returns_running_status() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["status"] == "running"


def test_query_assistant_mode_returns_answer(monkeypatch) -> None:
    monkeypatch.setattr(app_module, "generate_general_answer", lambda question: f"assistant:{question}")

    response = client.post(
        "/api/query",
        json={
            "question": "hello",
            "mode": "assistant",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["answer"] == "assistant:hello"
    assert payload["sources"] == []


def test_query_document_mode_uses_retrieval(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def fake_search_uploaded_notes(question: str, filename: str | None = None, top_k: int = 5) -> list[dict]:
        captured["search"] = {"question": question, "filename": filename, "top_k": top_k}
        return [
            {"text": "chunk one", "score": 0.9, "chunk_index": 0},
            {"text": "chunk two", "score": 0.8, "chunk_index": 1},
        ]

    def fake_generate_answer(question: str, context_chunks: list[str]) -> str:
        captured["generate"] = {"question": question, "chunks": context_chunks}
        return "synthesized answer"

    monkeypatch.setattr(app_module, "search_uploaded_notes", fake_search_uploaded_notes)
    monkeypatch.setattr(app_module, "generate_answer", fake_generate_answer)

    response = client.post(
        "/api/query",
        json={
            "question": "What is chapter one about?",
            "filename": "notes.pdf",
            "mode": "document",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["answer"] == "synthesized answer"
    assert payload["sources"] == [
        {"text": "chunk one", "score": 0.9, "chunk_index": 0},
        {"text": "chunk two", "score": 0.8, "chunk_index": 1},
    ]
    assert captured["search"] == {
        "question": "What is chapter one about?",
        "filename": "notes.pdf",
        "top_k": 5,
    }
    assert captured["generate"] == {
        "question": "What is chapter one about?",
        "chunks": ["chunk one", "chunk two"],
    }


def test_query_document_mode_returns_404_when_index_missing(monkeypatch) -> None:
    def fake_search_uploaded_notes(question: str, filename: str | None = None, top_k: int = 5) -> list[str]:
        raise FileNotFoundError("No FAISS index found. Upload a file first.")

    monkeypatch.setattr(app_module, "search_uploaded_notes", fake_search_uploaded_notes)

    response = client.post(
        "/api/query",
        json={
            "question": "Where is the summary?",
            "mode": "document",
        },
    )

    assert response.status_code == 404
    assert "No FAISS index found" in response.json()["detail"]


def test_upload_returns_ingestion_summary(monkeypatch) -> None:
    async def fake_save_uploaded_file(file, allowed_extensions):
        return Path("data/uploads/test.pdf")

    def fake_index_uploaded_file(file_path):
        return {"num_chunks": 3}

    monkeypatch.setattr(app_module, "save_uploaded_file", fake_save_uploaded_file)
    monkeypatch.setattr(app_module, "index_uploaded_file", fake_index_uploaded_file)

    response = client.post(
        "/api/upload",
        files={"file": ("test.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["filename"] == "test.pdf"
    assert payload["num_chunks"] == 3


def test_compare_mode_between_two_related_docs(monkeypatch) -> None:
    def fake_search(question: str, filename: str | None = None, top_k: int = 5) -> list[dict]:
        if filename == "docA.pdf":
            return [
                {"text": "Doc A explains recursion with base and recursive cases.", "score": 0.12, "chunk_index": 2}
            ]
        return [
            {"text": "Doc B explains recursion via stack unwinding examples.", "score": 0.22, "chunk_index": 4}
        ]

    monkeypatch.setattr(compare_module, "search_uploaded_notes", fake_search)
    monkeypatch.setattr(compare_module, "generate_answer", lambda question, context_chunks: "compare summary")

    response = client.post(
        "/api/compare",
        json={
            "query": "How do these explain recursion differently?",
            "document_ids": ["docA.pdf", "docB.pdf"],
            "mode": "compare",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "compare"
    assert payload["status"] == "ok"
    assert payload["answer"] == "compare summary"
    assert len(payload["comparison"]["differences"]) == 1
    assert payload["comparison"]["differences"][0]["doc_a"]["document_id"] == "docA.pdf"
    assert payload["comparison"]["differences"][0]["doc_b"]["document_id"] == "docB.pdf"


def test_compare_mode_returns_insufficient_overlap_for_unrelated_docs(monkeypatch) -> None:
    def fake_search(question: str, filename: str | None = None, top_k: int = 5) -> list[dict]:
        if filename == "history.pdf":
            return [
                {"text": "The French Revolution began in 1789 and transformed political institutions.", "score": 0.68, "chunk_index": 3},
            ]
        return [
            {"text": "Mitochondria produce ATP through oxidative phosphorylation in cellular respiration.", "score": 0.72, "chunk_index": 1},
        ]

    monkeypatch.setattr(compare_module, "search_uploaded_notes", fake_search)
    monkeypatch.setattr(compare_module, "generate_answer", lambda question, context_chunks: "should not be used")

    response = client.post(
        "/api/compare",
        json={
            "query": "How do they explain recursion?",
            "document_ids": ["history.pdf", "biology.pdf"],
            "mode": "compare",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "compare"
    assert payload["status"] == "insufficient_overlap"
    assert "do not appear to discuss the same topic" in payload["answer"]
    assert payload["comparison"]["differences"] == []
    assert "doc_a" in payload["evidence"] and "doc_b" in payload["evidence"]


def test_compare_mode_partial_overlap_returns_uncertain_result(monkeypatch) -> None:
    def fake_search(question: str, filename: str | None = None, top_k: int = 5) -> list[dict]:
        if filename == "doc1.pdf":
            return [
                {"text": "Recursion is when a function calls itself with a base case.", "score": 0.48, "chunk_index": 0},
            ]
        return [
            {"text": "Functions in JavaScript can be nested and reused in modules.", "score": 0.55, "chunk_index": 2},
        ]

    monkeypatch.setattr(compare_module, "search_uploaded_notes", fake_search)
    monkeypatch.setattr(compare_module, "generate_answer", lambda question, context_chunks: "should not be used")

    response = client.post(
        "/api/compare",
        json={
            "query": "How do these explain recursion differently?",
            "document_ids": ["doc1.pdf", "doc2.pdf"],
            "mode": "compare",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "insufficient_overlap"
    assert payload["reason"]["overlap_score"] < 0.5
    assert payload["comparison"]["differences"] == []


def test_gaps_mode_unrelated_docs_returns_no_reliable_gap(monkeypatch) -> None:
    def fake_search(question: str, filename: str | None = None, top_k: int = 5) -> list[dict]:
        if filename == "art.pdf":
            return [{"text": "Impressionism emphasized light and brush strokes.", "score": 0.7, "chunk_index": 1}]
        return [{"text": "Sorting algorithms include quicksort mergesort and heapsort.", "score": 0.66, "chunk_index": 3}]

    monkeypatch.setattr(compare_module, "search_uploaded_notes", fake_search)
    monkeypatch.setattr(compare_module, "generate_answer", lambda question, context_chunks: "should not be used")

    response = client.post(
        "/api/compare",
        json={
            "query": "What did this miss about recursion?",
            "document_ids": ["art.pdf", "algo.pdf"],
            "mode": "gaps",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "gaps"
    assert payload["status"] == "insufficient_overlap"
    assert payload["comparison"]["gaps"] == []


def test_rank_mode_multiple_docs_low_confidence_when_irrelevant(monkeypatch) -> None:
    def fake_search(question: str, filename: str | None = None, top_k: int = 5) -> list[dict]:
        if filename == "a.pdf":
            return [{"text": "Roman architecture used arches.", "score": 0.89, "chunk_index": 0}]
        if filename == "b.pdf":
            return [{"text": "Photosynthesis uses chlorophyll.", "score": 0.92, "chunk_index": 1}]
        return [{"text": "Supply and demand influence prices.", "score": 0.9, "chunk_index": 2}]

    monkeypatch.setattr(compare_module, "search_uploaded_notes", fake_search)
    monkeypatch.setattr(compare_module, "generate_answer", lambda question, context_chunks: "should not be used")

    response = client.post(
        "/api/compare",
        json={
            "query": "Which document covers dynamic programming best?",
            "document_ids": ["a.pdf", "b.pdf", "c.pdf"],
            "mode": "rank",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "rank"
    assert payload["status"] == "low_confidence"
    assert "No strong winner" in payload["answer"]
    assert len(payload["comparison"]["ranking"]) == 3
    ranking = payload["comparison"]["ranking"]
    assert ranking[0]["score"] >= ranking[1]["score"] >= ranking[2]["score"]


def test_gaps_mode_related_docs_returns_grounded_gap(monkeypatch) -> None:
    def fake_search(question: str, filename: str | None = None, top_k: int = 5) -> list[dict]:
        if filename == "week3.pdf":
            return [
                {
                    "text": "Recursion and divide-and-conquer are covered, but memoization is not introduced.",
                    "score": 0.22,
                    "chunk_index": 1,
                },
                {
                    "text": "Subproblems are solved by recursive decomposition.",
                    "score": 0.26,
                    "chunk_index": 2,
                },
            ]
        return [
            {
                "text": "Dynamic programming introduces memoization and tabulation to reuse overlapping subproblem results.",
                "score": 0.14,
                "chunk_index": 4,
            },
            {
                "text": "State transition formulation avoids repeated recursion through cached results.",
                "score": 0.17,
                "chunk_index": 5,
            },
        ]

    monkeypatch.setattr(compare_module, "search_uploaded_notes", fake_search)
    monkeypatch.setattr(compare_module, "generate_answer", lambda question, context_chunks: "gap summary")

    response = client.post(
        "/api/compare",
        json={
            "query": "What recursion and memoization concepts are missing in week 3 compared to week 5?",
            "document_ids": ["week3.pdf", "week5.pdf"],
            "mode": "gaps",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "gaps"
    assert payload["status"] in {"ok", "low_confidence"}
    if payload["status"] == "ok":
        assert len(payload["comparison"]["gaps"]) >= 1
        assert payload["answer"] == "gap summary"


def test_compare_invalid_input_handling() -> None:
    response_empty_query = client.post(
        "/api/compare",
        json={
            "query": "",
            "document_ids": ["docA.pdf", "docB.pdf"],
            "mode": "compare",
        },
    )
    assert response_empty_query.status_code == 400

    response_missing_docs = client.post(
        "/api/compare",
        json={
            "query": "compare recursion",
            "document_ids": [],
            "mode": "compare",
        },
    )
    assert response_missing_docs.status_code == 400

    response_bad_count = client.post(
        "/api/compare",
        json={
            "query": "compare recursion",
            "document_ids": ["only-one.pdf"],
            "mode": "compare",
        },
    )
    assert response_bad_count.status_code == 400
