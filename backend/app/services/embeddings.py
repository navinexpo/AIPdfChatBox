"""Sentence-Transformers embeddings wrapper. Model loaded once at startup."""
from __future__ import annotations
import logging
from typing import List, Optional

from app.config import settings

logger = logging.getLogger(__name__)

_model = None
_QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: "


def load_model() -> None:
    """Load the model into memory (called at app startup)."""
    global _model
    if _model is not None:
        return
    from sentence_transformers import SentenceTransformer
    logger.info("Loading embedding model: %s on %s", settings.embedding_model, settings.embedding_device)
    _model = SentenceTransformer(settings.embedding_model, device=settings.embedding_device)
    logger.info("Embedding model loaded.")


def _get_model():
    if _model is None:
        load_model()
    return _model


def embed_texts(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    m = _get_model()
    return m.encode(texts, normalize_embeddings=True, show_progress_bar=False).tolist()

# Embedding Query
def embed_query(query: str) -> List[float]:
    m = _get_model()
    return m.encode([_QUERY_INSTRUCTION + query], normalize_embeddings=True, show_progress_bar=False).tolist()[0]
