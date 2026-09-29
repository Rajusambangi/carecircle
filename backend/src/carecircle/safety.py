"""Deterministic emergency detection.

Runs before any LLM call so that a red-flag entry is escalated even if the
model or the memory service is slow or down. Patterns are deliberately broad:
a false alarm costs a click, a miss can cost a life.
"""

import re

from .schemas import SafetyAlert

EMERGENCY_NUMBER = "112"  # India national emergency; ambulance 108

_RED_FLAGS: dict[str, str] = {
    "chest pain": r"\bchest\s+(pain|tightness|pressure)\b",
    "stroke signs": r"\b(face\s+droop\w*|slurred\s+speech|one\s+side\s+(weak|numb)\w*|stroke)\b",
    "unresponsive": r"\b(unconscious|unresponsive|passed\s+out|fainted|not\s+waking)\b",
    "severe breathing difficulty": r"\b(can(no|')?t\s+breathe|gasping|struggling\s+to\s+breathe)\b",
    "head injury": r"\b(hit|bang\w*|struck)\s+(his|her|their)?\s*head\b|\bhead\s+injur\w*",
    "heavy bleeding": r"\b(heavy|severe|won'?t\s+stop)\s+bleeding\b|\bbleeding\s+heavily\b",
    "seizure": r"\b(seizure|convulsion|fits?)\b",
    "severe allergic reaction": r"\b(swollen\s+(lips|tongue|throat)|anaphyla\w*)\b",
    "confusion": r"\b(suddenly\s+confused|doesn'?t\s+recogni[sz]e)\b",
}
_COMPILED = {label: re.compile(p, re.IGNORECASE) for label, p in _RED_FLAGS.items()}

_NEGATION = re.compile(r"\b(no|not|without|denies|didn'?t|did\s+not)\b[^.]{0,25}$", re.IGNORECASE)


def check_emergency(text: str) -> SafetyAlert | None:
    matched: list[str] = []
    for label, pattern in _COMPILED.items():
        for m in pattern.finditer(text):
            # "no head injury", "did not lose consciousness" should not trigger
            if not _NEGATION.search(text[max(0, m.start() - 30) : m.start()]):
                matched.append(label)
                break
    if not matched:
        return None
    return SafetyAlert(
        message=(
            f"Possible emergency ({', '.join(matched)}). Call {EMERGENCY_NUMBER} "
            "or go to the nearest emergency department now. CareCircle has saved this note."
        ),
        matched=matched,
    )
