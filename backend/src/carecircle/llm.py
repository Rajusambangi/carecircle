"""LLM access: Groq first, local Ollama as fallback, with tolerant JSON parsing.

Open-weight models occasionally wrap JSON in prose or code fences, or fail a
structured call outright; callers get a parsed dict or an ``LLMError``.
If Groq is not configured, rate-limited or down, the same request is sent to
a local Ollama model so the demo keeps working offline.
"""

import asyncio
import json
import logging
import re
from typing import Any

import httpx
from groq import APIError, AsyncGroq

log = logging.getLogger(__name__)


class LLMError(RuntimeError):
    pass


_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)


def parse_json(raw: str) -> dict[str, Any]:
    candidates = [raw, *_FENCE.findall(raw)]
    start, end = raw.find("{"), raw.rfind("}")
    if start != -1 and end > start:
        candidates.append(raw[start : end + 1])
    for c in candidates:
        try:
            value = json.loads(c.strip())
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value
    raise LLMError(f"Model did not return a JSON object: {raw[:200]!r}")


def _messages(system: str, user: str) -> list[dict[str, str]]:
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


class GroqProvider:
    name = "groq"

    def __init__(self, api_key: str, model: str, attempts: int = 2):
        self._client = AsyncGroq(api_key=api_key)
        self.model = model
        self._attempts = attempts

    async def complete(self, system: str, user: str, *, json_mode: bool) -> str:
        kwargs: dict[str, Any] = {}
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        last: Exception | None = None
        for attempt in range(self._attempts):
            try:
                resp = await self._client.chat.completions.create(
                    model=self.model,
                    messages=_messages(system, user),  # type: ignore[arg-type]
                    temperature=0.2,
                    **kwargs,
                )
                return resp.choices[0].message.content or ""
            except APIError as e:
                last = e
                log.warning("Groq call failed (attempt %d): %s", attempt + 1, e)
                # json_object mode is the usual failure point; retry unconstrained
                kwargs.pop("response_format", None)
                await asyncio.sleep(0.5 * (attempt + 1))
        raise LLMError(f"Groq failed after {self._attempts} attempts: {last}")


class OllamaProvider:
    name = "ollama"

    def __init__(self, base_url: str, model: str, timeout: float = 120.0):
        self._url = base_url.rstrip("/") + "/api/chat"
        self.model = model
        self._timeout = timeout

    async def complete(self, system: str, user: str, *, json_mode: bool) -> str:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": _messages(system, user),
            "stream": False,
            "options": {"temperature": 0.2},
        }
        if json_mode:
            payload["format"] = "json"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(self._url, json=payload)
                resp.raise_for_status()
                return str(resp.json()["message"]["content"])
        except (httpx.HTTPError, KeyError, ValueError) as e:
            raise LLMError(f"Ollama ({self.model}) failed: {e}") from e


Provider = GroqProvider | OllamaProvider


class LLM:
    def __init__(
        self,
        groq_api_key: str | None = None,
        groq_model: str = "openai/gpt-oss-120b",
        *,
        ollama_url: str | None = None,
        ollama_model: str = "llama3.2",
    ):
        self.providers: list[Provider] = []
        if groq_api_key:
            self.providers.append(GroqProvider(groq_api_key, groq_model))
        if ollama_url:
            self.providers.append(OllamaProvider(ollama_url, ollama_model))

    @property
    def available(self) -> bool:
        return bool(self.providers)

    async def complete(self, system: str, user: str, *, json_mode: bool = False) -> str:
        if not self.providers:
            raise LLMError("No LLM configured: set GROQ_API_KEY or OLLAMA_BASE_URL")
        errors: list[str] = []
        for provider in self.providers:
            try:
                return await provider.complete(system, user, json_mode=json_mode)
            except LLMError as e:
                errors.append(str(e))
                log.warning("%s unavailable, trying next provider", provider.name)
        raise LLMError("; ".join(errors))

    async def complete_json(self, system: str, user: str) -> dict[str, Any]:
        raw = await self.complete(system, user, json_mode=True)
        try:
            return parse_json(raw)
        except LLMError:
            repaired = await self.complete(
                "Return ONLY the valid JSON object contained in the user's text.", raw
            )
            return parse_json(repaired)
