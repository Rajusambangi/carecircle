"""Check a new care-log entry against everything the circle has recorded before."""

from ..memory import MemoryStore
from ..schemas import Alert, CareEvent, Circle

ALERTS_SCHEMA = {
    "type": "object",
    "properties": {
        "alerts": {
            "type": "array",
            "maxItems": 3,
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "detail": {"type": "string"},
                    "severity": {"type": "string", "enum": ["info", "warning", "urgent"]},
                    "related_dates": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["title", "detail", "severity"],
            },
        }
    },
    "required": ["alerts"],
}

QUERY = """A new care-log entry was just recorded for {patient} on {date} by {author}:
"{text}"

Compare it with the patient's history and report ONLY meaningful connections, such as:
- a past allergy or adverse reaction to the same or a related medication
- a symptom that started or worsened after a medication or dose change (give the dates)
- the same symptom reported earlier by other people (a recurring or worsening pattern)
- a doctor instruction or follow-up that is now overdue
- a known patient preference relevant to this entry
Each alert: short title, a detail that cites dates and who reported them, and what to raise
with the doctor. Use "urgent" only for a past reaction to a drug being started now or a
fall/injury pattern. Return an empty list if nothing in memory is clearly related."""


async def find_alerts(memory: MemoryStore, event: CareEvent, circle: Circle) -> list[Alert]:
    author = circle.person(event.author_id)
    result = await memory.reflect(
        event.patient_id,
        QUERY.format(
            patient=circle.patient.name,
            date=event.occurred_at.strftime("%d %b %Y"),
            author=author.name if author else event.author_id,
            text=event.summary or event.text,
        ),
        response_schema=ALERTS_SCHEMA,
        budget="mid",
    )
    raw = (result.structured or {}).get("alerts") or []
    alerts: list[Alert] = []
    for a in raw:
        try:
            alerts.append(Alert.model_validate(a))
        except ValueError:
            continue
    return alerts[:3]
