from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from carecircle.main import create_app

from .conftest import FakeLLM, FakeMemory


@pytest.fixture
def memory() -> FakeMemory:
    return FakeMemory()


@pytest.fixture
def client(memory: FakeMemory, circle) -> Iterator[TestClient]:
    app = create_app(
        memory=memory, llm=FakeLLM({"type": "symptom", "severity": "medium"}), circle=circle
    )
    with TestClient(app) as c:
        yield c


def test_circle(client: TestClient) -> None:
    body = client.get("/api/circle").json()
    assert body["patient"]["name"] == "Ramesh Sharma"
    assert {d["id"] for d in body["doctors"]} == {"dr_mehta", "dr_kulkarni"}


def test_log_retains_and_returns_alerts(client: TestClient, memory: FakeMemory) -> None:
    memory.structured = {
        "alerts": [
            {
                "title": "Past reaction to Bactrim",
                "detail": "Rash in Mar 2024 (Priya).",
                "severity": "urgent",
            },
            {"bad": "shape"},
        ]
    }
    r = client.post(
        "/api/log",
        json={
            "text": "Dr Mehta wants to start Bactrim",
            "author_id": "priya",
            "patient_id": "ramesh",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert [a["title"] for a in body["alerts"]] == ["Past reaction to Bactrim"]
    assert body["safety"] is None
    assert len(memory.events) == 1
    assert memory.reflect_calls[0]["response_schema"] is not None


def test_log_flags_emergency(client: TestClient, memory: FakeMemory) -> None:
    r = client.post(
        "/api/log",
        json={"text": "Dad has chest pain right now", "author_id": "arjun", "patient_id": "ramesh"},
    )
    body = r.json()
    assert body["safety"]["level"] == "emergency"
    assert memory.events[0].type == "emergency"


def test_log_rejects_unknown_author(client: TestClient) -> None:
    r = client.post(
        "/api/log", json={"text": "hello", "author_id": "stranger", "patient_id": "ramesh"}
    )
    assert r.status_code == 422


def test_log_reports_memory_failure(client: TestClient, memory: FakeMemory) -> None:
    memory.fail_retain = True
    r = client.post(
        "/api/log", json={"text": "BP 120/80", "author_id": "lakshmi", "patient_id": "ramesh"}
    )
    assert r.status_code == 502


def test_ask_with_and_without_memory(client: TestClient, memory: FakeMemory) -> None:
    q = {"question": "Why is Dad dizzy?", "patient_id": "ramesh"}
    on = client.post("/api/ask", json={**q, "use_memory": True}).json()
    off = client.post("/api/ask", json={**q, "use_memory": False}).json()
    assert on["used_memory"] and "Metoprolol" in on["answer"] and on["sources"]
    assert not off["used_memory"] and off["answer"] == "Generic advice."
    assert len(memory.reflect_calls) == 1


def test_brief_structured(client: TestClient, memory: FakeMemory) -> None:
    memory.structured = {
        "headline": "Dizziness and low pulse since Metoprolol increase",
        "since_last_visit": [
            {"date": "2026-08-22", "item": "Fall in bathroom", "reported_by": "Priya"}
        ],
        "medication_changes": [{"date": "2026-08-10", "change": "Metoprolol 25→50 mg"}],
        "questions_for_doctor": ["Could the dose explain the dizziness?"],
    }
    r = client.post(
        "/api/brief",
        json={
            "patient_id": "ramesh",
            "doctor_id": "dr_kulkarni",
            "since": "2026-08-10",
            "visit_date": "2026-09-30",
        },
    )
    body = r.json()
    assert body["brief"]["headline"].startswith("Dizziness")
    assert body["specialty"] == "Cardiology"


def test_brief_falls_back_to_text(client: TestClient) -> None:
    r = client.post("/api/brief", json={"patient_id": "ramesh", "doctor_id": "dr_mehta"})
    body = r.json()
    assert body["brief"] is None and body["raw_text"]


def test_unknown_patient(client: TestClient) -> None:
    assert client.get("/api/profile", params={"patient_id": "nobody"}).status_code == 404
