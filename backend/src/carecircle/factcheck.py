"""Check that every date an answer mentions is backed by a source memory.

A care assistant that invents or shifts a date is worse than useless, so each
answer carries a list of the dates it mentions and whether any memory it was
built from carries that date (in its event date or its text).
"""

import re
from datetime import datetime

from .schemas import DateCheck, Source

_MONTHS = {
    m: i + 1
    for i, names in enumerate(
        [
            ("jan", "january"),
            ("feb", "february"),
            ("mar", "march"),
            ("apr", "april"),
            ("may",),
            ("jun", "june"),
            ("jul", "july"),
            ("aug", "august"),
            ("sep", "sept", "september"),
            ("oct", "october"),
            ("nov", "november"),
            ("dec", "december"),
        ]
    )
    for m in names
}
# Longest names first so "september" wins over "sep".
_MONTH = r"(" + "|".join(sorted(_MONTHS, key=len, reverse=True)) + r")\.?"
_DAY = r"(\d{1,2})(?:st|nd|rd|th)?"
# "Aug 22", "August 22nd, 2026" or "22 Aug", "22nd of August 2026"
_MONTH_DAY = re.compile(rf"\b{_MONTH}\s+{_DAY}\b", re.IGNORECASE)
_DAY_MONTH = re.compile(rf"\b{_DAY}\s+(?:of\s+)?{_MONTH}\b", re.IGNORECASE)
_ISO = re.compile(r"\b\d{4}-(\d{2})-(\d{2})\b")

Key = tuple[int, int]  # (month, day)


def _mentions(text: str) -> dict[Key, str]:
    """Map each (month, day) found in text to how it was written."""
    found: dict[Key, str] = {}
    for m in _MONTH_DAY.finditer(text):
        month, day = _MONTHS.get(m.group(1).lower().rstrip(".")), int(m.group(2))
        if month and 1 <= day <= 31:
            found.setdefault((month, day), m.group(0))
    for m in _DAY_MONTH.finditer(text):
        month, day = _MONTHS.get(m.group(2).lower().rstrip(".")), int(m.group(1))
        if month and 1 <= day <= 31:
            found.setdefault((month, day), m.group(0))
    for m in _ISO.finditer(text):
        month, day = int(m.group(1)), int(m.group(2))
        if 1 <= month <= 12 and 1 <= day <= 31:
            found.setdefault((month, day), m.group(0))
    return found


def _source_dates(sources: list[Source]) -> set[Key]:
    keys: set[Key] = set()
    for s in sources:
        if s.date:
            try:
                d = datetime.fromisoformat(s.date.replace("Z", "+00:00"))
                keys.add((d.month, d.day))
            except ValueError:
                pass
        keys.update(_mentions(s.text))
        if s.context:
            keys.update(_mentions(s.context))
    return keys


def check_dates(answer: str, sources: list[Source]) -> list[DateCheck]:
    known = _source_dates(sources)
    if not known:
        return []  # nothing to check against: no verdict rather than a false alarm
    return [
        DateCheck(mention=written, supported=key in known)
        for key, written in _mentions(answer).items()
    ]
