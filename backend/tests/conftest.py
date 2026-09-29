from dataclasses import dataclass, field
from typing import Any

import pytest

from carecircle.circle import load_circle
from carecircle.config import get_settings
from carecircle.llm import LLM
from carecircle.memory import ReflectResult
from carecircle.schemas import (
    CareEvent,
    Circle,
    LearnedFact,
    ProfileResponse,
    Source,
    TimelineItem,
)


@dataclass
class FakeMemory:
    """In-memory stand-in for HindsightMemory that records calls."""

    events: list[CareEvent] = field(default_factory=list)
    reflect_calls: list[dict[str, Any]] = field(default_factory=list)
    structured: dict[str, Any] | None = None
    fail_retain: bool = False

    async def setup(self, circle: Circle, *, reset: bool = False) -> None:
        pass

    async def retain_events(self, events: list[CareEvent], circle: Circle) -> None:
        if self.fail_retain:
            raise RuntimeError("hindsight down")
        self.events.extend(events)

    async def reflect(self, patient_id: str, query: str, **kwargs: Any) -> ReflectResult:
        self.reflect_calls.append({"patient_id": patient_id, "query": query, **kwargs})
        return ReflectResult(
            text="From memory: dizziness began Aug 13, 3 days after Metoprolol was increased.",
            structured=self.structured,
            sources=[Source(text="Metoprolol increased 25→50 mg", date="2026-08-10", type="world")],
        )

    async def recall(self, patient_id: str, query: str, **kwargs: Any) -> list[Source]:
        return []

    async def timeline(self, patient_id: str, **kwargs: Any) -> list[TimelineItem]:
        return [
            TimelineItem(id="1", text=e.text, date=e.occurred_at.isoformat(), fact_type="world")
            for e in self.events
        ]

    async def profile(self, patient_id: str) -> ProfileResponse:
        return ProfileResponse(
            patient_id=patient_id, content="## Current medications", last_refreshed_at=None
        )

    async def refresh_profile(self, patient_id: str) -> None:
        pass

    async def learned_from(self, event: CareEvent) -> list[LearnedFact]:
        return [LearnedFact(text=f"Learned: {event.text}", type="world", entities=event.entities)]

    async def memory_count(self) -> int:
        return len(self.events)


class FakeLLM(LLM):
    def __init__(
        self, json_reply: dict[str, Any] | None = None, text_reply: str = "Generic advice."
    ):
        super().__init__()
        self.json_reply = json_reply
        self.text_reply = text_reply

    @property
    def available(self) -> bool:
        return True

    async def complete(self, system: str, user: str, *, json_mode: bool = False) -> str:
        return self.text_reply

    async def complete_json(self, system: str, user: str) -> dict[str, Any]:
        if self.json_reply is None:
            from carecircle.llm import LLMError

            raise LLMError("no reply")
        return self.json_reply


@pytest.fixture
def circle() -> Circle:
    return load_circle(get_settings().circle_data)
