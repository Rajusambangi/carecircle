import pytest

from carecircle.safety import check_emergency


@pytest.mark.parametrize(
    "text",
    [
        "Dad is complaining of chest pain and sweating",
        "His speech is slurred and face drooping on the left",
        "Mom fainted in the kitchen",
        "He hit his head on the bathroom tiles",
        "He can't breathe properly",
    ],
)
def test_red_flags_trigger(text: str) -> None:
    alert = check_emergency(text)
    assert alert is not None
    assert "112" in alert.message


@pytest.mark.parametrize(
    "text",
    [
        "BP 118/72, pulse 58, felt dizzy for a few seconds",
        "Fell in the bathroom. No head injury and he did not lose consciousness.",
        "Knee pain after the rain, took Paracetamol",
    ],
)
def test_normal_notes_do_not_trigger(text: str) -> None:
    assert check_emergency(text) is None
