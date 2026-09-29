"""Memory checkpoints for the learning-curve demo.

Each checkpoint is a separate Hindsight bank seeded with the history up to a
date, so the same question can be asked of "CareCircle after one week" and
"CareCircle today" side by side.
"""

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class CheckpointDef:
    id: str
    label: str
    until: date | None  # None = full history (the live bank)
    description: str


CHECKPOINTS: list[CheckpointDef] = [
    CheckpointDef("week1", "Week 1", date(2026, 7, 8), "A few vitals and first preferences"),
    CheckpointDef("day45", "Day 45", date(2026, 8, 14), "Dose change and first dizzy spells"),
    CheckpointDef("today", "Today", None, "90 days, 4 people, every entry"),
]
LIVE = "today"


def bank_for(base_bank_id: str, checkpoint_id: str) -> str:
    return base_bank_id if checkpoint_id == LIVE else f"{base_bank_id}-{checkpoint_id}"


def get(checkpoint_id: str) -> CheckpointDef | None:
    return next((c for c in CHECKPOINTS if c.id == checkpoint_id), None)
