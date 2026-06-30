"""Token-approximate sliding-window chunker (word-based)."""
from typing import List


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 80) -> List[str]:
    if not text or not text.strip():
        return []
    words = text.split()
    if not words:
        return []
    if chunk_size <= 0:
        chunk_size = 500
    if overlap >= chunk_size:
        overlap = max(0, chunk_size // 5)
    chunks: List[str] = []
    start = 0
    step = max(1, chunk_size - overlap)
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end]).strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(words):
            break
        start += step
    return chunks
