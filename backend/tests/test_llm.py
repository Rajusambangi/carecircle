import pytest

from carecircle.llm import LLM, LLMError


class StubProvider:
    def __init__(self, name: str, reply: str | None):
        self.name = name
        self.reply = reply
        self.calls = 0

    async def complete(self, system: str, user: str, *, json_mode: bool) -> str:
        self.calls += 1
        if self.reply is None:
            raise LLMError(f"{self.name} down")
        return self.reply


def make_llm(*providers: StubProvider) -> LLM:
    llm = LLM()
    llm.providers = list(providers)  # type: ignore[arg-type]
    return llm


async def test_uses_first_provider_when_healthy() -> None:
    groq, ollama = StubProvider("groq", "from groq"), StubProvider("ollama", "from ollama")
    assert await make_llm(groq, ollama).complete("s", "u") == "from groq"
    assert ollama.calls == 0


async def test_falls_back_to_ollama_when_groq_fails() -> None:
    groq, ollama = StubProvider("groq", None), StubProvider("ollama", '{"type": "note"}')
    assert await make_llm(groq, ollama).complete_json("s", "u") == {"type": "note"}
    assert groq.calls == 1


async def test_raises_when_every_provider_fails() -> None:
    with pytest.raises(LLMError, match="groq down; ollama down"):
        await make_llm(StubProvider("groq", None), StubProvider("ollama", None)).complete("s", "u")


async def test_no_providers_configured() -> None:
    with pytest.raises(LLMError, match="No LLM configured"):
        await LLM().complete("s", "u")
