"""Answer caregiver questions — with Hindsight memory, or without it for comparison."""

import asyncio
import logging

from ..factcheck import check_dates
from ..llm import LLM
from ..memory import MemoryStore
from ..schemas import AskResponse, Circle, Source

log = logging.getLogger(__name__)

NO_MEMORY_SYSTEM = (
    "You are a helpful assistant for a family caring for an elderly parent. You have no "
    "access to the family's history. Answer the question helpfully and briefly, in the "
    "language it is asked in. Never diagnose or change medication; suggest consulting the "
    "doctor."
)


async def answer(
    question: str,
    *,
    patient_id: str,
    use_memory: bool,
    circle: Circle,
    memory: MemoryStore,
    llm: LLM,
) -> AskResponse:
    if not use_memory:
        text = await llm.complete(NO_MEMORY_SYSTEM, question)
        return AskResponse(answer=text, used_memory=False)

    # Recall runs alongside reflect: it gives the date check a wider pool of dated facts
    # than the handful reflect lists as its sources.
    reflect_task = memory.reflect(
        patient_id,
        question,
        context=(
            f"Asked by a family caregiver of {circle.patient.name}. Answer in under 200 words "
            "using short bullet points. Lead with the most important connection across time. "
            "Reply in the language the question is written in."
        ),
        budget="mid",
    )
    result, recalled = await asyncio.gather(
        reflect_task, memory.recall(patient_id, question, max_tokens=4096), return_exceptions=True
    )
    if isinstance(result, BaseException):
        raise result
    extra: list[Source] = []
    if isinstance(recalled, BaseException):
        log.warning("recall for fact-check failed: %s", recalled)
    else:
        extra = recalled
    return AskResponse(
        answer=result.text,
        used_memory=True,
        sources=result.sources[:10],
        date_checks=check_dates(result.text, result.evidence + extra),
    )
