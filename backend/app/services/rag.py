"""RAG pipeline: retrieval + prompt assembly + Ollama generation."""
from __future__ import annotations
import logging
from typing import List, Dict, Any, Optional

from app.config import settings
from app.services import embeddings, vectorstore, ollama_client

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a helpful assistant that answers questions ONLY using the provided "
    "context from the user's documents. If the answer isn't in the context, say "
    "you don't know — do not make anything up. Format your answer in Markdown."
)

NO_DOCS_MESSAGE = (
    "I don't have any processed documents to search yet. Upload a document and "
    "wait for it to finish processing, then ask me again."
)


def _format_context(chunks: List[Dict[str, Any]], max_chars: int) -> str:
    sorted_chunks = sorted(chunks, key=lambda c: -c["score"])
    parts: List[str] = []
    total = 0
    for i, c in enumerate(sorted_chunks, start=1):
        meta = c.get("metadata") or {}
        page = meta.get("page")
        fname = meta.get("file_name", "document")
        header = f"[{i}] (from {fname}" + (f", page {page})" if page is not None else ")")
        block = f"{header}: {c['text']}"
        if total + len(block) > max_chars:
            break
        parts.append(block)
        total += len(block)
    return "\n\n".join(parts)


async def answer(
    question: str,
    document_ids: Optional[List[str]],
    user_id: str,
    history: List[Dict[str, str]],
) -> Dict[str, Any]:
    """Returns {"content": str, "model": str, "citations": [...]}."""
    q_emb = embeddings.embed_query(question)
    chunks = vectorstore.query(
        query_embedding=q_emb,
        top_k=settings.rag_top_k,
        document_ids=document_ids if document_ids else None,
        user_id=user_id,
    )

    if not chunks:
        return {
            "content": NO_DOCS_MESSAGE,
            "model": settings.ollama_default_model,
            "citations": [],
        }

    context = _format_context(chunks, settings.rag_max_context_chars)
    user_block = f"CONTEXT:\n{context}\n\nQUESTION: {question}"

    messages: List[Dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history:
        if h["role"] in ("user", "assistant"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_block})

    try:
        content = await ollama_client.chat(messages, model=settings.ollama_default_model)
    except Exception as e:
        logger.exception("Ollama generation failed: %s", e)
        content = f"Sorry, the local model failed to respond: {e}"

    citations: List[Dict[str, Any]] = []
    for c in chunks:
        meta = c.get("metadata") or {}
        snippet = (c.get("text") or "")[:200]
        citations.append({
            "document_id": meta.get("document_id"),
            "file_name": meta.get("file_name", ""),
            "page": meta.get("page"),
            "snippet": snippet,
            "score": float(c.get("score", 0.0)),
            "chunk_index": meta.get("chunk_index"),
        })

    return {
        "content": content or "(empty response from model)",
        "model": settings.ollama_default_model,
        "citations": citations,
    }
