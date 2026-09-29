"""Turn a caregiver's free-text note into a structured CareEvent."""

import logging
from datetime import datetime

from ..llm import LLM, LLMError
from ..schemas import EVENT_TYPES, CareEvent, SafetyAlert

log = logging.getLogger(__name__)

SYSTEM = f"""You structure notes written by family caregivers of an elderly patient.
Return a JSON object with keys:
- "type": one of {list(EVENT_TYPES)}
- "severity": "low" | "medium" | "high" (high = fall, injury, reaction, very abnormal vitals)
- "summary": one factual sentence in third person keeping every number, drug name and dose
- "occurred_at": ISO-8601 datetime. Resolve relative times ("this morning", "yesterday
  evening") against the logged-at time. Default to the logged-at time.
- "entities": list of medication names, doctor names, symptoms and tests mentioned
Pick "medication_change" when a dose is started, stopped or changed, "reaction" for a
suspected side effect or allergy, "doctor_instruction" for anything a doctor asked for.
Never add facts that are not in the note."""


async def extract_event(
    llm: LLM,
    *,
    text: str,
    patient_id: str,
    author_id: str,
    logged_at: datetime,
    safety: SafetyAlert | None,
) -> CareEvent:
    base = CareEvent(
        patient_id=patient_id,
        author_id=author_id,
        occurred_at=logged_at,
        text=text,
        type="emergency" if safety else "note",
        severity="high" if safety else "low",
    )
    try:
        data = await llm.complete_json(SYSTEM, f"Logged at: {logged_at.isoformat()}\nNote: {text}")
    except LLMError as e:
        # The raw note is still worth remembering; Hindsight extracts facts itself.
        log.warning("Extraction failed, storing raw note: %s", e)
        return base

    update: dict = {}
    if data.get("type") in EVENT_TYPES and not safety:
        update["type"] = data["type"]
    if data.get("severity") in ("low", "medium", "high") and not safety:
        update["severity"] = data["severity"]
    if isinstance(data.get("summary"), str):
        update["summary"] = data["summary"].strip()
    if isinstance(data.get("entities"), list):
        update["entities"] = [str(x) for x in data["entities"] if str(x).strip()][:12]
    try:
        occurred = datetime.fromisoformat(str(data.get("occurred_at")))
        if occurred.tzinfo is None:
            occurred = occurred.replace(tzinfo=logged_at.tzinfo)
        # Notes describe the past; ignore hallucinated future dates.
        if occurred <= logged_at:
            update["occurred_at"] = occurred
    except ValueError:
        pass
    return base.model_copy(update=update)
