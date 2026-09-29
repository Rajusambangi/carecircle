import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import checkpoints
from .api.routes import router
from .circle import load_circle
from .config import Settings, get_settings
from .llm import LLM
from .memory import HindsightMemory, MemoryStore
from .schemas import Circle

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


def create_app(
    settings: Settings | None = None,
    *,
    memory: MemoryStore | None = None,
    llm: LLM | None = None,
    circle: Circle | None = None,
) -> FastAPI:
    """Build the app. Tests inject fakes; production wires Hindsight and Groq from settings."""
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        owned: HindsightMemory | None = None
        app.state.circle = circle or load_circle(settings.circle_data)
        app.state.llm = llm or LLM(
            settings.groq_api_key,
            settings.groq_model,
            ollama_url=settings.ollama_url,
            ollama_model=settings.ollama_model,
        )
        if memory is None:
            owned = HindsightMemory.connect(
                settings.hindsight_base_url, settings.hindsight_api_key, settings.bank_id
            )
        live = memory or owned
        assert live is not None
        app.state.memory = live
        # One store per learning-curve checkpoint; injected fakes serve every checkpoint.
        app.state.memories = {
            c.id: (owned.with_bank(checkpoints.bank_for(settings.bank_id, c.id)) if owned else live)
            for c in checkpoints.CHECKPOINTS
        }
        yield
        if owned is not None:
            await owned.aclose()

    app = FastAPI(title="CareCircle API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    return app


app = create_app()
