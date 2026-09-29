"""The only module that talks to Hindsight.

One memory bank per care circle. Every memory is tagged with the patient it is
about (``patient:<id>``) so a circle can care for more than one person, plus
the event type and author so recall can be narrowed later.
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Protocol

from hindsight_client import Hindsight
from hindsight_client_api.exceptions import ApiException

from .schemas import CareEvent, Circle, ProfileResponse, Source, TimelineItem

log = logging.getLogger(__name__)

RETAIN_MISSION = (
    "This bank is the shared care record for an elderly patient, written by family "
    "caregivers, a home nurse and notes from doctor visits. Extract concrete, dated facts: "
    "symptoms and when they started, vital signs with exact values, medication names, doses "
    "and every dose change, adverse reactions and allergies, falls, doctor instructions and "
    "follow-ups requested, test results, meals and activity that affect blood sugar, and the "
    "patient's personal preferences. Always keep who reported each fact."
)

OBSERVATIONS_MISSION = (
    "Consolidate recurring care patterns: symptoms that began after a medication change, "
    "repeated vital-sign trends, lifestyle factors linked to blood sugar or blood pressure, "
    "follow-ups that were requested but not completed, and stable patient preferences."
)

REFLECT_MISSION = (
    "You are CareCircle, a care-coordination assistant for a family looking after an elderly "
    "parent. You connect what different family members, the nurse and doctors have recorded "
    "over time. Be specific: cite dates, values and who reported each fact. You coordinate and "
    "summarise; you never diagnose and never tell the family to start, stop or change a "
    "medication — you tell them what to raise with the doctor."
)

DIRECTIVES: list[tuple[str, str, int]] = [
    (
        "no-diagnosis",
        "Never state a diagnosis or instruct the family to start, stop or change a medication "
        "or dose. Frame findings as things to discuss with the treating doctor.",
        100,
    ),
    (
        "emergencies-first",
        "If the question or history mentions chest pain, stroke signs, unconsciousness, severe "
        "breathing difficulty, a head injury or heavy bleeding happening now, begin the answer "
        "by telling the family to call 112 immediately.",
        90,
    ),
    (
        "cite-evidence",
        "Support every claim with the date and the person who reported it, e.g. "
        "'(Aug 13, Nurse Lakshmi)'. If memory has no evidence, say so plainly instead of "
        "guessing.",
        80,
    ),
]

PROFILE_QUERY = (
    "Write the current care profile for {name}. Use these markdown sections: "
    "## Current medications (name, dose, timing, last change and date), "
    "## Allergies & past reactions, ## Active concerns (with when they started), "
    "## Pending follow-ups, ## Routines & preferences (how to give medicines, appointment "
    "timing, language, what calms or upsets them). Only include facts found in memory."
)


def patient_tag(patient_id: str) -> str:
    return f"patient:{patient_id}"


def profile_model_id(patient_id: str) -> str:
    return f"care-profile-{patient_id}".replace("_", "-").lower()


def format_event(event: CareEvent, circle: Circle) -> tuple[str, str]:
    """Render an event as the text Hindsight extracts facts from, plus its context."""
    author = circle.person(event.author_id)
    who = f"{author.name} ({author.role})" if author else event.author_id
    when = event.occurred_at.strftime("%a %d %b %Y, %H:%M")
    content = f"{when} — {who} logged about {circle.patient.name}: {event.text}"
    if event.summary and event.summary != event.text:
        content += f"\nSummary: {event.summary}"
    context = f"care log · {event.type.replace('_', ' ')} · severity {event.severity} · by {who}"
    return content, context


@dataclass
class ReflectResult:
    text: str
    structured: dict[str, Any] | None = None
    sources: list[Source] = field(default_factory=list)


class MemoryStore(Protocol):
    async def setup(self, circle: Circle, *, reset: bool = False) -> None: ...
    async def retain_events(self, events: list[CareEvent], circle: Circle) -> None: ...
    async def reflect(
        self,
        patient_id: str,
        query: str,
        *,
        context: str | None = None,
        response_schema: dict[str, Any] | None = None,
        budget: str = "mid",
    ) -> ReflectResult: ...
    async def recall(
        self,
        patient_id: str,
        query: str,
        *,
        temporal_window: dict[str, str] | None = None,
        max_tokens: int = 2048,
    ) -> list[Source]: ...
    async def timeline(
        self, patient_id: str, *, q: str | None = None, limit: int = 200
    ) -> list[TimelineItem]: ...
    async def profile(self, patient_id: str) -> ProfileResponse: ...
    async def refresh_profile(self, patient_id: str) -> None: ...


class HindsightMemory:
    def __init__(self, client: Hindsight, bank_id: str):
        self.client = client
        self.bank_id = bank_id

    @classmethod
    def connect(cls, base_url: str, api_key: str | None, bank_id: str) -> "HindsightMemory":
        return cls(Hindsight(base_url=base_url, api_key=api_key), bank_id)

    async def aclose(self) -> None:
        await self.client.aclose()

    # -- bank lifecycle ------------------------------------------------------

    async def setup(self, circle: Circle, *, reset: bool = False) -> None:
        if reset:
            try:
                await self.client.adelete_bank(self.bank_id)
            except ApiException as e:
                if e.status != 404:
                    raise
        p = circle.patient
        await self.client.acreate_bank(
            self.bank_id,
            retain_mission=RETAIN_MISSION,
            observations_mission=OBSERVATIONS_MISSION,
            reflect_mission=REFLECT_MISSION,
            enable_observations=True,
            background=(
                f"Care circle for {p.name}, {p.age}, {p.city}. Conditions: "
                f"{', '.join(p.conditions)}. {p.background} Caregivers: "
                + "; ".join(f"{c.name} ({c.role})" for c in circle.caregivers)
                + ". Doctors: "
                + "; ".join(f"{d.name} ({d.specialty}, {d.clinic})" for d in circle.doctors)
                + "."
            ),
        )
        await self._ensure_directives()
        await self._ensure_profile_model(circle)

    async def _ensure_directives(self) -> None:
        existing = await self.client.alist_directives(self.bank_id)
        names = {d.name for d in existing.items}
        for name, content, priority in DIRECTIVES:
            if name not in names:
                await self.client.acreate_directive(
                    self.bank_id, name=name, content=content, priority=priority
                )

    async def _ensure_profile_model(self, circle: Circle) -> None:
        p = circle.patient
        model_id = profile_model_id(p.id)
        try:
            await self.client.aget_mental_model(self.bank_id, model_id, detail="metadata")
            return
        except ApiException as e:
            if e.status != 404:
                raise
        await self.client.acreate_mental_model(
            self.bank_id,
            id=model_id,
            name=f"Care profile — {p.name}",
            source_query=PROFILE_QUERY.format(name=p.name),
            tags=[patient_tag(p.id)],
            trigger={"refresh_after_consolidation": True},
        )

    # -- write ---------------------------------------------------------------

    async def retain_events(self, events: list[CareEvent], circle: Circle) -> None:
        items = []
        for e in events:
            content, context = format_event(e, circle)
            items.append(
                {
                    "content": content,
                    "timestamp": e.occurred_at,
                    "context": context,
                    "tags": [patient_tag(e.patient_id), f"type:{e.type}", f"author:{e.author_id}"],
                    "metadata": {
                        "type": e.type,
                        "severity": e.severity,
                        "author_id": e.author_id,
                        "original_text": e.text[:1000],
                    },
                    "entities": [{"text": name} for name in e.entities] or None,
                }
            )
        await self.client.aretain_batch(self.bank_id, items)

    # -- read ----------------------------------------------------------------

    async def reflect(
        self,
        patient_id: str,
        query: str,
        *,
        context: str | None = None,
        response_schema: dict[str, Any] | None = None,
        budget: str = "mid",
    ) -> ReflectResult:
        resp = await self.client.areflect(
            self.bank_id,
            query,
            budget=budget,
            context=context,
            response_schema=response_schema,
            tags=[patient_tag(patient_id)],
            tags_match="any",
            include_facts=True,
        )
        sources: list[Source] = []
        if resp.based_on and resp.based_on.memories:
            sources = [
                Source(text=m.text, date=m.occurred_start, type=m.type)
                for m in resp.based_on.memories
            ]
        return ReflectResult(text=resp.text, structured=resp.structured_output, sources=sources)

    async def recall(
        self,
        patient_id: str,
        query: str,
        *,
        temporal_window: dict[str, str] | None = None,
        max_tokens: int = 2048,
    ) -> list[Source]:
        resp = await self.client.arecall(
            self.bank_id,
            query,
            max_tokens=max_tokens,
            tags=[patient_tag(patient_id)],
            tags_match="any",
            temporal_window=temporal_window,
        )
        return [
            Source(text=r.text, date=r.occurred_start or r.mentioned_at, type=r.type)
            for r in resp.results
        ]

    async def timeline(
        self, patient_id: str, *, q: str | None = None, limit: int = 200
    ) -> list[TimelineItem]:
        resp = await self.client.alist_memories(self.bank_id, search_query=q, limit=limit)
        tag = patient_tag(patient_id)
        items = [
            TimelineItem(
                id=m.id,
                text=m.text or "",
                date=m.occurred_start or m.var_date or m.mentioned_at,
                fact_type=m.fact_type,
                tags=m.tags or [],
            )
            for m in resp.items
            if m.state != "invalidated" and (not m.tags or tag in m.tags)
        ]
        return sorted(items, key=lambda i: i.date or "", reverse=True)

    async def profile(self, patient_id: str) -> ProfileResponse:
        content = refreshed = None
        try:
            mm = await self.client.aget_mental_model(
                self.bank_id, profile_model_id(patient_id), detail="content"
            )
            content, refreshed = mm.content, mm.last_refreshed_at
        except ApiException as e:
            if e.status != 404:
                raise
        observations = await self.client.alist_memories(self.bank_id, type="observation", limit=50)
        tag = patient_tag(patient_id)
        patterns = [
            TimelineItem(
                id=o.id,
                text=o.text or "",
                date=o.updated_at or o.consolidated_at,
                fact_type="observation",
                tags=o.tags or [],
            )
            for o in observations.items
            if o.state != "invalidated" and (not o.tags or tag in o.tags)
        ]
        total = (await self.client.alist_memories(self.bank_id, limit=1)).total
        return ProfileResponse(
            patient_id=patient_id,
            content=content,
            last_refreshed_at=refreshed,
            patterns=patterns,
            memory_count=total,
        )

    async def refresh_profile(self, patient_id: str) -> None:
        await self.client.arefresh_mental_model(self.bank_id, profile_model_id(patient_id))
