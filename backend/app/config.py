from functools import lru_cache
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # ── Database (localhost for local dev, postgres for Docker) ──────────────
    database_url: str = "postgresql+asyncpg://docked:docked@localhost:5432/docked"
    database_url_sync: str = "postgresql+psycopg2://docked:docked@localhost:5432/docked"

    # ── ChromaDB (local persistent dir for local dev) ────────────────────────
    chroma_persist_dir: str = "./data/chroma"
    chroma_host: str | None = None
    chroma_port: int | None = None

    # ── Ollama (localhost for local dev) ─────────────────────────────────────
    ollama_base_url: str = "http://localhost:11434"
    ollama_default_model: str = "llama3:8b"
    ollama_available_models: str = "llama3:8b,qwen2:7b,mistral:7b"

    # ── Embeddings ───────────────────────────────────────────────────────────
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_device: str = "cpu"

    # ── Chunking ─────────────────────────────────────────────────────────────
    chunk_size_tokens: int = 500
    chunk_overlap_tokens: int = 80

    # ── RAG ──────────────────────────────────────────────────────────────────
    rag_top_k: int = 3
    rag_max_context_chars: int = 3000

    # ── App ──────────────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:5173"
    max_upload_size_mb: int = 25
    storage_dir: str = "./data/storage"
    log_level: str = "INFO"

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def available_models_list(self) -> List[str]:
        return [m.strip() for m in self.ollama_available_models.split(",") if m.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
