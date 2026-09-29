from carecircle.factcheck import check_dates
from carecircle.schemas import Source

SOURCES = [
    Source(text="Metoprolol increased from 25 to 50 mg", date="2026-08-10T16:45:00+05:30"),
    Source(text="Fell in the bathroom", date="2026-08-22T06:30:00+05:30"),
    Source(text="Asked whether anyone told the doctor about the fall on 22 August"),
]


def checks(answer: str) -> dict[str, bool]:
    return {c.mention: c.supported for c in check_dates(answer, SOURCES)}


def test_supported_dates_in_several_formats() -> None:
    assert checks("Dose raised on Aug 10; fall on 22nd August 2026 (2026-08-22).") == {
        "Aug 10": True,
        "22nd August": True,
    }


def test_flags_a_date_no_memory_backs() -> None:
    assert checks("The fall happened on August 26.") == {"August 26": False}


def test_answer_without_dates() -> None:
    assert check_dates("Encourage him to walk after dinner.", SOURCES) == []
