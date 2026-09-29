"""Catch-up digest ("since you last checked") for one caregiver, from shared memory."""

from ..memory import MemoryStore
from ..schemas import Circle, Digest, DigestResponse, Person

DIGEST_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "updates": {
            "type": "array",
            "maxItems": 8,
            "items": {
                "type": "object",
                "properties": {
                    "date": {"type": "string"},
                    "text": {"type": "string"},
                    "reported_by": {"type": "string"},
                    "importance": {"type": "string", "enum": ["high", "medium", "low"]},
                },
                "required": ["date", "text", "importance"],
            },
        },
        "action_items": {"type": "array", "items": {"type": "string"}, "maxItems": 4},
    },
    "required": ["headline", "updates", "action_items"],
}

QUERY = """{name} ({role}) is opening CareCircle. They last checked on {since}.
Write their catch-up on {patient}: what happened on or after {since}, recorded by anyone
in the circle other than {name}.
- headline: one sentence, the single thing {first} most needs to know
- updates: newest first; each with its own event date, who reported it, and importance
  (high = falls, reactions, abnormal vitals, new medicines; low = routine)
- action_items: concrete things {first} could do, given their role and where they live
Only include events dated on or after {since}. If nothing happened, say so in the headline."""


async def build_digest(
    memory: MemoryStore, circle: Circle, caregiver: Person, *, since: str
) -> DigestResponse:
    result = await memory.reflect(
        circle.patient.id,
        QUERY.format(
            name=caregiver.name,
            first=caregiver.name.split()[0],
            role=caregiver.role,
            since=since,
            patient=circle.patient.name,
        ),
        response_schema=DIGEST_SCHEMA,
        budget="mid",
    )
    digest: Digest | None = None
    if result.structured:
        try:
            digest = Digest.model_validate(result.structured)
        except ValueError:
            digest = None
    return DigestResponse(
        caregiver=caregiver.name,
        since=since,
        digest=digest,
        raw_text=None if digest else result.text,
    )
