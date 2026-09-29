"""One-page doctor visit brief generated from the circle's memory."""

from ..memory import MemoryStore
from ..schemas import Brief, BriefResponse, Circle, Doctor

_STR_LIST = {"type": "array", "items": {"type": "string"}}

BRIEF_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "since_last_visit": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "date": {"type": "string"},
                    "item": {"type": "string"},
                    "reported_by": {"type": "string"},
                },
                "required": ["date", "item"],
            },
        },
        "medication_changes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "date": {"type": "string"},
                    "change": {"type": "string"},
                    "observed_after": {"type": "string"},
                },
                "required": ["date", "change"],
            },
        },
        "trends": _STR_LIST,
        "pending_followups": _STR_LIST,
        "questions_for_doctor": _STR_LIST,
        "care_notes": _STR_LIST,
    },
    "required": ["headline", "since_last_visit", "medication_changes", "questions_for_doctor"],
}

QUERY = """Prepare a one-page visit brief for {doctor} ({specialty}, {clinic}) about {patient},
for the visit on {visit}. Cover what happened {since_text}.
Prioritise what a {specialty} doctor needs. Fields:
- headline: one sentence, the single most important thing the doctor should know
- since_last_visit: key dated events (symptoms, falls, abnormal vitals) with who reported them
- medication_changes: every dose change, with what was observed afterwards and when
- trends: vital-sign or symptom trends with actual numbers
- pending_followups: tests or actions a doctor requested that are not yet done
- questions_for_doctor: 3-5 specific questions the family should ask
- care_notes: patient preferences that matter during the visit
Only use facts from memory. Keep each item under 30 words."""


async def build_brief(
    memory: MemoryStore,
    circle: Circle,
    doctor: Doctor,
    *,
    since: str | None,
    visit_date: str | None,
) -> BriefResponse:
    p = circle.patient
    result = await memory.reflect(
        p.id,
        QUERY.format(
            doctor=doctor.name,
            specialty=doctor.specialty,
            clinic=doctor.clinic,
            patient=p.name,
            visit=visit_date or "the next visit",
            since_text=f"since the last visit on {since}" if since else "in the last 3 months",
        ),
        response_schema=BRIEF_SCHEMA,
        budget="high",
    )
    brief: Brief | None = None
    if result.structured:
        try:
            brief = Brief.model_validate(result.structured)
        except ValueError:
            brief = None
    return BriefResponse(
        patient=p.name,
        doctor=doctor.name,
        specialty=doctor.specialty,
        since=since,
        visit_date=visit_date,
        brief=brief,
        raw_text=None if brief else result.text,
        sources=result.sources[:12],
    )
