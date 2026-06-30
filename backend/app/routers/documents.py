from __future__ import annotations
import os
import uuid
import logging
from pathlib import Path
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.deps import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentOut, UploadDocumentResponse
from app.services import vectorstore
from app.tasks.process_document import process_document

logger = logging.getLogger(__name__)
router = APIRouter()

EXT_TO_TYPE = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".doc": "docx",
    ".md": "markdown",
    ".markdown": "markdown",
    ".txt": "txt",
}


def _doc_to_out(d: Document) -> DocumentOut:
    return DocumentOut(
        id=str(d.id),
        user_id=str(d.user_id),
        organization_id=str(d.organization_id) if d.organization_id else None,
        file_name=d.file_name,
        file_type=d.file_type,
        file_size_bytes=d.file_size_bytes,
        status=d.status,
        status_message=d.status_message,
        page_count=d.page_count,
        chunk_count=d.chunk_count,
        uploaded_at=d.uploaded_at,
        processed_at=d.processed_at,
    )


async def _ensure_user(db: AsyncSession, user_id: str) -> User:
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id (must be UUID).")
    res = await db.execute(select(User).where(User.id == uid))
    user = res.scalar_one_or_none()
    if user is None:
        user = User(id=uid, display_name="Anonymous")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


@router.post("/documents", status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")

    ext = Path(file.filename).suffix.lower()
    if ext not in EXT_TO_TYPE:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: pdf, docx, doc, md, markdown, txt.",
        )
    file_type = EXT_TO_TYPE[ext]

    user = await _ensure_user(db, user_id)

    contents = await file.read()
    size = len(contents)
    if size > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.max_upload_size_mb}MB limit.",
        )
    if size == 0:
        raise HTTPException(status_code=400, detail="File is empty.")

    document_id = uuid.uuid4()
    dir_path = Path(settings.storage_dir) / str(document_id)
    dir_path.mkdir(parents=True, exist_ok=True)
    storage_path = dir_path / file.filename
    with open(storage_path, "wb") as f:
        f.write(contents)

    doc = Document(
        id=document_id,
        user_id=user.id,
        organization_id=None,
        file_name=file.filename,
        file_type=file_type,
        file_size_bytes=size,
        storage_path=str(storage_path),
        status="queued",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    background_tasks.add_task(process_document, str(doc.id))

    payload = UploadDocumentResponse(document=_doc_to_out(doc))
    return JSONResponse(
        status_code=201,
        content=payload.model_dump(by_alias=True, mode="json"),
    )


@router.get("/documents")
async def list_documents(user_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id (must be UUID).")
    res = await db.execute(
        select(Document).where(Document.user_id == uid).order_by(Document.uploaded_at.desc())
    )
    docs = res.scalars().all()
    return JSONResponse(
        content=[_doc_to_out(d).model_dump(by_alias=True, mode="json") for d in docs]
    )


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    try:
        did = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document_id.")
    res = await db.execute(select(Document).where(Document.id == did))
    doc = res.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    storage_path = doc.storage_path
    await db.execute(delete(Document).where(Document.id == did))
    await db.commit()

    vectorstore.delete_document(str(did))

    try:
        p = Path(storage_path)
        if p.exists():
            p.unlink()
        if p.parent.exists() and not any(p.parent.iterdir()):
            p.parent.rmdir()
    except Exception as e:
        logger.warning("Failed to remove storage for %s: %s", document_id, e)

    return JSONResponse(status_code=204, content=None)
