from datetime import datetime
from typing import Literal

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


class AskRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    patient_id: str
    use_memory: bool = True


class AskResponse(BaseModel):
    answer: str
    used_memory: bool
    sources: list[Source] = Field(default_factory=list)
    safety: SafetyAlert | None = None


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
