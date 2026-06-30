"""ChromaDB persistent client wrapper. Single collection: docked_chunks."""
from __future__ import annotations
import logging
from typing import List, Dict, Any, Optional

from app.config import settings

logger = logging.getLogger(__name__)

_client = None
_collection = None
COLLECTION_NAME = "docked_chunks"


def _get_client():
    global _client
    if _client is None:
        import chromadb
        if settings.chroma_host and settings.chroma_port:
            _client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
        else:
            _client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    return _client


def get_collection():
    global _collection
    if _collection is None:
        client = _get_client()
        _collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def add_chunks(
    document_id: str,
    user_id: str,
    file_name: str,
    chunks: List[Dict[str, Any]],
    embeddings: List[List[float]],
) -> None:
    """chunks: list of {"text": str, "page": int|None, "chunk_index": int}"""
    if not chunks:
        return
    coll = get_collection()
    ids = [f"{document_id}:{c['chunk_index']}" for c in chunks]
    docs = [c["text"] for c in chunks]
    metas = []
    for c in chunks:
        meta = {
            "document_id": str(document_id),
            "user_id": str(user_id),
            "file_name": file_name,
            "chunk_index": int(c["chunk_index"]),
        }
        if c.get("page") is not None:
            meta["page"] = int(c["page"])
        metas.append(meta)
    coll.add(ids=ids, embeddings=embeddings, documents=docs, metadatas=metas)


def delete_document(document_id: str) -> None:
    try:
        coll = get_collection()
        coll.delete(where={"document_id": str(document_id)})
    except Exception as e:
        logger.warning("Failed to delete vectors for %s: %s", document_id, e)


def query(
    query_embedding: List[float],
    top_k: int,
    document_ids: Optional[List[str]] = None,
    user_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    coll = get_collection()
    where: Dict[str, Any] | None = None
    if document_ids:
        where = {"document_id": {"$in": [str(d) for d in document_ids]}}
    elif user_id:
        where = {"user_id": str(user_id)}

    res = coll.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where,
    )
    out: List[Dict[str, Any]] = []
    ids = (res.get("ids") or [[]])[0]
    docs = (res.get("documents") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]
    for i, _id in enumerate(ids):
        dist = dists[i] if i < len(dists) else 1.0
        score = max(0.0, min(1.0, 1.0 - float(dist)))
        out.append({
            "id": _id,
            "text": docs[i] if i < len(docs) else "",
            "metadata": metas[i] if i < len(metas) else {},
            "score": score,
        })
    return out


def health() -> bool:
    try:
        get_collection().count()
        return True
    except Exception as e:
        logger.warning("Chroma health failed: %s", e)
        return False
