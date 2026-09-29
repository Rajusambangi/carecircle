from datetime import datetime
from zoneinfo import ZoneInfo

from carecircle.agents.extractor import extract_event
from carecircle.llm import parse_json
from carecircle.memory import format_event
from carecircle.safety import check_emergency
from carecircle.schemas import CareEvent

from .conftest import FakeLLM

NOW = datetime(2026, 9, 28, 9, 0, tzinfo=ZoneInfo("Asia/Kolkata"))


async def test_extracts_structured_event() -> None:
    llm = FakeLLM(
        {
            "type": "medication_change",
            "severity": "high",
            "summary": "Dr. Mehta wants to start Bactrim DS twice daily for 5 days.",
            "occurred_at": "2026-09-28T08:30:00+05:30",
            "entities": ["Bactrim DS", "Dr. Anil Mehta"],
        }
    )
    e = await extract_event(
        llm,
        text="Dr Mehta wants to start Bactrim",
        patient_id="ramesh",
        author_id="priya",
        logged_at=NOW,
        safety=None,
    )
    assert e.type == "medication_change"
    assert e.entities == ["Bactrim DS", "Dr. Anil Mehta"]
    assert e.occurred_at.hour == 8


async def test_falls_back_to_raw_note_when_llm_fails() -> None:
    e = await extract_event(
        FakeLLM(None),
        text="Dad was quiet today",
        patient_id="ramesh",
        author_id="priya",
        logged_at=NOW,
        safety=None,
    )
    assert e.type == "note"
    assert e.text == "Dad was quiet today"


async def test_future_dates_and_bad_types_are_ignored() -> None:
    llm = FakeLLM({"type": "banana", "occurred_at": "2030-01-01T00:00:00+05:30"})
    e = await extract_event(
        llm, text="x", patient_id="ramesh", author_id="priya", logged_at=NOW, safety=None
    )
    assert e.type == "note"
    assert e.occurred_at == NOW


async def test_emergency_overrides_model_type() -> None:
    text = "He has chest pain"
    e = await extract_event(
        FakeLLM({"type": "symptom", "severity": "low"}),
        text=text,
        patient_id="ramesh",
        author_id="priya",
        logged_at=NOW,
        safety=check_emergency(text),
    )
    assert (e.type, e.severity) == ("emergency", "high")


def test_parse_json_handles_fences_and_prose() -> None:
    assert parse_json('Sure!\n```json\n{"a": 1}\n```') == {"a": 1}
    assert parse_json('Here you go: {"a": 2} hope that helps') == {"a": 2}


def test_format_event_names_the_reporter(circle) -> None:
    content, context = format_event(
        CareEvent(
            patient_id="ramesh",
            author_id="lakshmi",
            occurred_at=NOW,
            type="vitals",
            text="BP 112/70",
        ),
        circle,
    )
    assert "Lakshmi Nair (home nurse" in content
    assert "Ramesh Sharma" in content
    assert "vitals" in context
