import asyncio
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query, Request

from ..agents import alerts, ask, brief, extractor
from ..llm import LLM
from ..memory import MemoryStore
from ..safety import check_emergency
from ..schemas import (
    AskRequest,
    AskResponse,
    BriefRequest,
    BriefResponse,
    Circle,
    LogRequest,
    LogResponse,
    ProfileResponse,
    TimelineItem,
)

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

LOCAL_TZ = ZoneInfo("Asia/Kolkata")


def _deps(request: Request) -> tuple[Circle, MemoryStore, LLM]:
    s = request.app.state
    return s.circle, s.memory, s.llm


def _check_patient(circle: Circle, patient_id: str) -> None:
    if patient_id != circle.patient.id:
        raise HTTPException(404, f"Unknown patient '{patient_id}'")


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/circle", response_model=Circle)
async def get_circle(request: Request) -> Circle:
    return request.app.state.circle


@router.post("/log", response_model=LogResponse)
async def log_entry(body: LogRequest, request: Request) -> LogResponse:
    circle, memory, llm = _deps(request)
    _check_patient(circle, body.patient_id)
    if circle.person(body.author_id) is None:
        raise HTTPException(422, f"Unknown author '{body.author_id}'")

    safety = check_emergency(body.text)
    logged_at = body.occurred_at or datetime.now(LOCAL_TZ)
    if logged_at.tzinfo is None:
        logged_at = logged_at.replace(tzinfo=LOCAL_TZ)
    event = await extractor.extract_event(
        llm,
        text=body.text,
        patient_id=body.patient_id,
        author_id=body.author_id,
        logged_at=logged_at,
        safety=safety,
    )

    # Alerts are computed against history *before* this entry lands, in parallel with retain.
    alert_task = asyncio.create_task(alerts.find_alerts(memory, event, circle))
    try:
        await memory.retain_events([event], circle)
    except Exception as e:
        alert_task.cancel()
        log.exception("retain failed")
        raise HTTPException(502, f"Could not save to memory: {e}") from e

    found, alerts_error = [], None
    try:
        found = await alert_task
    except Exception as e:
        log.warning("alert check failed: %s", e)
        alerts_error = "Pattern check is unavailable right now; the entry was saved."
    return LogResponse(event=event, safety=safety, alerts=found, alerts_error=alerts_error)


@router.post("/ask", response_model=AskResponse)
async def ask_question(body: AskRequest, request: Request) -> AskResponse:
    circle, memory, llm = _deps(request)
    _check_patient(circle, body.patient_id)
    try:
        resp = await ask.answer(
            body.question,
            patient_id=body.patient_id,
            use_memory=body.use_memory,
            circle=circle,
            memory=memory,
            llm=llm,
        )
    except Exception as e:
        log.exception("ask failed")
        raise HTTPException(502, f"Could not answer right now: {e}") from e
    resp.safety = check_emergency(body.question)
    return resp


@router.post("/brief", response_model=BriefResponse)
async def doctor_brief(body: BriefRequest, request: Request) -> BriefResponse:
    circle, memory, _ = _deps(request)
    _check_patient(circle, body.patient_id)
    doctor = circle.doctor(body.doctor_id)
    if doctor is None:
        raise HTTPException(404, f"Unknown doctor '{body.doctor_id}'")
    try:
        return await brief.build_brief(
            memory, circle, doctor, since=body.since, visit_date=body.visit_date
        )
    except Exception as e:
        log.exception("brief failed")
        raise HTTPException(502, f"Could not build the brief: {e}") from e


@router.get("/timeline", response_model=list[TimelineItem])
async def timeline(
    request: Request,
    patient_id: str,
    q: str | None = None,
    limit: int = Query(200, ge=1, le=500),
) -> list[TimelineItem]:
    circle, memory, _ = _deps(request)
    _check_patient(circle, patient_id)
    try:
        return await memory.timeline(patient_id, q=q or None, limit=limit)
    except Exception as e:
        raise HTTPException(502, f"Could not load memories: {e}") from e


@router.get("/profile", response_model=ProfileResponse)
async def profile(request: Request, patient_id: str) -> ProfileResponse:
    circle, memory, _ = _deps(request)
    _check_patient(circle, patient_id)
    try:
        return await memory.profile(patient_id)
    except Exception as e:
        raise HTTPException(502, f"Could not load the care profile: {e}") from e


@router.post("/profile/refresh", status_code=202)
async def refresh_profile(request: Request, patient_id: str) -> dict[str, str]:
    circle, memory, _ = _deps(request)
    _check_patient(circle, patient_id)
    try:
        await memory.refresh_profile(patient_id)
    except Exception as e:
        raise HTTPException(502, f"Could not refresh the care profile: {e}") from e
    return {"status": "refreshing"}
