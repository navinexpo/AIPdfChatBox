"""Background task: extract → chunk → embed → upsert to Chroma → update status."""
from __future__ import annotations
import logging
import uuid
from datetime import datetime, timezone
from sqlalchemy import select, update

from app.database import SessionLocal
from app.models.document import Document
from app.services import extraction, chunking, embeddings, vectorstore
from app.config import settings

logger = logging.getLogger(__name__)


async def process_document(document_id: str) -> None:
    doc_uuid = uuid.UUID(document_id)
    async with SessionLocal() as session:
        res = await session.execute(select(Document).where(Document.id == doc_uuid))
        doc = res.scalar_one_or_none()
        if doc is None:
            logger.warning("process_document: %s not found", document_id)
            return

        try:
            await session.execute(
                update(Document).where(Document.id == doc_uuid).values(
                    status="processing", status_message=None
                )
            )
            await session.commit()

            extracted = extraction.extract(doc.storage_path, doc.file_type)
            pages = extracted["pages"]
            page_count = extracted.get("page_count")

            all_chunks = []
            chunk_index = 0
            for page in pages:
                page_no = page.get("page")
                text = page.get("text") or ""
                pieces = chunking.chunk_text(
                    text,
                    chunk_size=settings.chunk_size_tokens,
                    overlap=settings.chunk_overlap_tokens,
                )
                for p in pieces:
                    all_chunks.append({
                        "text": p,
                        "page": page_no,
                        "chunk_index": chunk_index,
                    })
                    chunk_index += 1

            if not all_chunks:
                raise RuntimeError("No text content extracted from document.")

            texts = [c["text"] for c in all_chunks]
            embs = embeddings.embed_texts(texts)

            # Clean prior vectors then re-add (idempotent on re-process)
            vectorstore.delete_document(str(doc.id))
            vectorstore.add_chunks(
                document_id=str(doc.id),
                user_id=str(doc.user_id),
                file_name=doc.file_name,
                chunks=all_chunks,
                embeddings=embs,
            )

            await session.execute(
                update(Document).where(Document.id == doc_uuid).values(
                    status="ready",
                    page_count=page_count,
                    chunk_count=len(all_chunks),
                    processed_at=datetime.now(timezone.utc),
                    status_message=None,
                )
            )
            await session.commit()
            logger.info("Document %s processed: %d chunks", doc.id, len(all_chunks))

        except Exception as e:
            logger.exception("Failed to process document %s: %s", document_id, e)
            await session.rollback()
            try:
                async with SessionLocal() as s2:
                    await s2.execute(
                        update(Document).where(Document.id == doc_uuid).values(
                            status="failed", status_message=str(e)[:500]
                        )
                    )
                    await s2.commit()
            except Exception:
                logger.exception("Could not mark document as failed")
