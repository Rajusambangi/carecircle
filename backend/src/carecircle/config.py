import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_ROOT / ".env")


@dataclass(frozen=True)
class Settings:
    hindsight_base_url: str
    hindsight_api_key: str | None
    bank_id: str
    groq_api_key: str | None
    groq_model: str
    ollama_url: str | None
    ollama_model: str
    circle_data: Path
    cors_origins: list[str]


def get_settings() -> Settings:
    return Settings(
        hindsight_base_url=os.getenv("HINDSIGHT_BASE_URL", "https://api.hindsight.vectorize.io"),
        hindsight_api_key=os.getenv("HINDSIGHT_API_KEY") or None,
        bank_id=os.getenv("HINDSIGHT_BANK_ID", "carecircle-sharma"),
        groq_api_key=os.getenv("GROQ_API_KEY") or None,
        groq_model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
        # Set OLLAMA_BASE_URL empty to disable the local fallback
        ollama_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434") or None,
        ollama_model=os.getenv("OLLAMA_MODEL", "llama3.2"),
        circle_data=BACKEND_ROOT / os.getenv("CIRCLE_DATA", "data/sharma_family.json"),
        cors_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5175").split(
            ","
        ),
    )
