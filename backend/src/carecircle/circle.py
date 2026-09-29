import json
from functools import lru_cache
from pathlib import Path

from .schemas import CareEvent, Circle


def load_dataset(path: Path) -> dict:
    return json.loads(path.read_text())


@lru_cache
def load_circle(path: Path) -> Circle:
    return Circle.model_validate(load_dataset(path)["circle"])


def load_history(path: Path) -> list[CareEvent]:
    data = load_dataset(path)
    patient_id = data["circle"]["patient"]["id"]
    events = [CareEvent(patient_id=patient_id, **e) for e in data["history"]]
    return sorted(events, key=lambda e: e.occurred_at)
