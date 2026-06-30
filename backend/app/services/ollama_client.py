"""Ollama HTTP client wrapper."""
from __future__ import annotations
import logging
from typing import List, Dict, Any
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def chat(messages: List[Dict[str, str]], model: str | None = None, timeout: float = 600.0) -> str:
    """Call Ollama /api/chat with messages array. Returns assistant content string."""
    model = model or settings.ollama_default_model
    payload = {"model": model, "messages": messages, "stream": False}
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(f"{settings.ollama_base_url}/api/chat", json=payload)
        r.raise_for_status()
        data = r.json()
        return (data.get("message") or {}).get("content", "") or ""
        return (data.get("message") or {}).get("content", "") or ""


async def generate(prompt: str, model: str | None = None, timeout: float = 180.0) -> str:
    model = model or settings.ollama_default_model
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
        )
        r.raise_for_status()
        return r.json().get("response", "") or ""


async def health() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{settings.ollama_base_url}/api/tags")
            return r.status_code == 200
    except Exception as e:
        logger.warning("Ollama health failed: %s", e)
        return False
