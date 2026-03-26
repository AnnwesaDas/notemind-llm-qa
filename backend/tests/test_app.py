from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

import backend.app as app_module


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

    def fake_search_uploaded_notes(question: str, filename: str | None = None, top_k: int = 5) -> list[str]:
        captured["search"] = {"question": question, "filename": filename, "top_k": top_k}
        return ["chunk one", "chunk two"]

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
    assert payload["sources"] == ["chunk one", "chunk two"]
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
