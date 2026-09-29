from datetime import datetime
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

EventType = Literal[
    "symptom",
    "vitals",
    "medication_change",
    "medication_taken",
    "reaction",
    "appointment",
    "doctor_instruction",
    "test_result",
    "fall",
    "mood",
    "meal",
    "activity",
    "preference",
    "emergency",
    "note",
]
EVENT_TYPES: tuple[str, ...] = EventType.__args__  # type: ignore[attr-defined]

Severity = Literal["low", "medium", "high"]


class Person(BaseModel):
    id: str
    name: str
    role: str
    last_seen: str | None = Field(default=None, description="When they last opened CareCircle")


class Doctor(Person):
    specialty: str
    clinic: str


class Patient(BaseModel):
    id: str
    name: str
    age: int
    city: str
    conditions: list[str]
    background: str


class Circle(BaseModel):
    patient: Patient
    caregivers: list[Person]
    doctors: list[Doctor]

    def person(self, person_id: str) -> Person | None:
        for p in [*self.caregivers, *self.doctors]:
            if p.id == person_id:
                return p
        return None

    def doctor(self, doctor_id: str) -> Doctor | None:
        return next((d for d in self.doctors if d.id == doctor_id), None)


class CareEvent(BaseModel):
    """One thing someone in the circle observed or was told, ready to retain."""

    id: str = Field(default_factory=lambda: uuid4().hex[:12])
    patient_id: str
    author_id: str
    occurred_at: datetime
    type: EventType = "note"
    severity: Severity = "low"
    text: str = Field(description="What the caregiver wrote, in their words")
    summary: str | None = Field(default=None, description="One-line normalized summary")
    entities: list[str] = Field(default_factory=list)


class SafetyAlert(BaseModel):
    level: Literal["emergency"] = "emergency"
    message: str
    matched: list[str]


class Alert(BaseModel):
    title: str
    detail: str
    severity: Literal["info", "warning", "urgent"] = "info"
    related_dates: list[str] = Field(default_factory=list)


class Source(BaseModel):
    text: str
    date: str | None = None
    type: str | None = None
    context: str | None = Field(default=None, description="Who recorded it and what kind of entry")


class DateCheck(BaseModel):
    """A date mentioned in an answer, and whether any source memory backs it up."""

    mention: str
    supported: bool


class LearnedFact(BaseModel):
    text: str
    type: str | None = None
    entities: list[str] = Field(default_factory=list)


class Checkpoint(BaseModel):
    id: str
    label: str
    until: str | None
    description: str
    memory_count: int | None = None


# ---- API payloads ----


class LogRequest(BaseModel):
    text: str = Field(min_length=2, max_length=4000)
    author_id: str
    patient_id: str
    occurred_at: datetime | None = None


class LogResponse(BaseModel):
    event: CareEvent
    safety: SafetyAlert | None = None
    alerts: list[Alert] = Field(default_factory=list)
    alerts_error: str | None = None
    learned: list[LearnedFact] = Field(default_factory=list)


class AskRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    patient_id: str
    use_memory: bool = True
    checkpoint: str | None = Field(default=None, description="Memory as of a checkpoint")


class AskResponse(BaseModel):
    answer: str
    used_memory: bool
    checkpoint: str | None = None
    sources: list[Source] = Field(default_factory=list)
    date_checks: list[DateCheck] = Field(default_factory=list)
    safety: SafetyAlert | None = None


class DigestRequest(BaseModel):
    patient_id: str
    caregiver_id: str
    since: str | None = None


class DigestUpdate(BaseModel):
    date: str
    text: str
    reported_by: str | None = None
    importance: Literal["high", "medium", "low"] = "medium"


class Digest(BaseModel):
    headline: str
    updates: list[DigestUpdate] = Field(default_factory=list)
    action_items: list[str] = Field(default_factory=list)


class DigestResponse(BaseModel):
    caregiver: str
    since: str
    digest: Digest | None = None
    raw_text: str | None = None


class BriefRequest(BaseModel):
    patient_id: str
    doctor_id: str
    since: str | None = Field(default=None, description="ISO date of last visit")
    visit_date: str | None = None


class MedChange(BaseModel):
    date: str
    change: str
    observed_after: str | None = None


class DatedItem(BaseModel):
    date: str
    item: str
    reported_by: str | None = None


class Brief(BaseModel):
    headline: str
    since_last_visit: list[DatedItem] = Field(default_factory=list)
    medication_changes: list[MedChange] = Field(default_factory=list)
    trends: list[str] = Field(default_factory=list)
    pending_followups: list[str] = Field(default_factory=list)
    questions_for_doctor: list[str] = Field(default_factory=list)
    care_notes: list[str] = Field(default_factory=list)


class BriefResponse(BaseModel):
    patient: str
    doctor: str
    specialty: str
    since: str | None
    visit_date: str | None
    brief: Brief | None = None
    raw_text: str | None = None
    sources: list[Source] = Field(default_factory=list)


class TimelineItem(BaseModel):
    id: str
    text: str
    date: str | None
    fact_type: str | None
    tags: list[str] = Field(default_factory=list)


class ProfileResponse(BaseModel):
    patient_id: str
    content: str | None
    last_refreshed_at: str | None
    patterns: list[TimelineItem] = Field(default_factory=list)
    memory_count: int = 0
