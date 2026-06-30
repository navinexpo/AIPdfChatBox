from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.models.chat import Chat, ChatDocument
from app.models.chat_message import ChatMessage, MessageCitation
from app.models.user import User
from app.models.document import Document
from app.schemas.chat import (
    ChatOut, ChatMessageOut, CreateChatRequest, SendMessageRequest,
    SendMessageResponse, SourceCitationOut,
)
from app.services import rag

router = APIRouter()


# ---------- helpers ----------

async def _ensure_user(db: AsyncSession, user_id: str) -> User:
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id.")
    res = await db.execute(select(User).where(User.id == uid))
    user = res.scalar_one_or_none()
    if user is None:
        user = User(id=uid, display_name="Anonymous")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def _chat_to_out(db: AsyncSession, chat: Chat) -> ChatOut:
    res = await db.execute(
        select(ChatDocument.document_id).where(ChatDocument.chat_id == chat.id)
    )
    doc_ids = [str(r[0]) for r in res.all()]
    return ChatOut(
        id=str(chat.id),
        user_id=str(chat.user_id),
        title=chat.title,
        document_ids=doc_ids,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
    )


async def _message_to_out(db: AsyncSession, msg: ChatMessage) -> ChatMessageOut:
    res = await db.execute(
        select(MessageCitation, Document.file_name)
        .join(Document, Document.id == MessageCitation.document_id, isouter=True)
        .where(MessageCitation.message_id == msg.id)
    )
    citations = []
    for cit, fname in res.all():
        citations.append(SourceCitationOut(
            document_id=str(cit.document_id),
            file_name=fname or "",
            page=cit.page,
            snippet=cit.snippet,
            score=float(cit.score),
        ))
    return ChatMessageOut(
        id=str(msg.id),
        chat_id=str(msg.chat_id),
        role=msg.role,
        content=msg.content,
        citations=citations,
        model=msg.model,
        created_at=msg.created_at,
    )


# ---------- endpoints ----------

@router.get("/chats")
async def list_chats(user_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id.")
    res = await db.execute(
        select(Chat).where(Chat.user_id == uid).order_by(Chat.updated_at.desc())
    )
    chats = res.scalars().all()
    out: List[dict] = []
    for c in chats:
        co = await _chat_to_out(db, c)
        out.append(co.model_dump(by_alias=True, mode="json"))
    return JSONResponse(content=out)


@router.post("/chats", status_code=201)
async def create_chat(body: CreateChatRequest, db: AsyncSession = Depends(get_db)):
    user = await _ensure_user(db, body.user_id)
    chat = Chat(user_id=user.id, title=body.title or "New chat")
    db.add(chat)
    await db.flush()
    for did in body.document_ids or []:
        try:
            did_uuid = uuid.UUID(did)
        except ValueError:
            continue
        db.add(ChatDocument(chat_id=chat.id, document_id=did_uuid))
    await db.commit()
    await db.refresh(chat)
    out = await _chat_to_out(db, chat)
    return JSONResponse(status_code=201, content=out.model_dump(by_alias=True, mode="json"))


@router.delete("/chats/{chat_id}", status_code=204)
async def delete_chat(chat_id: str, db: AsyncSession = Depends(get_db)):
    try:
        cid = uuid.UUID(chat_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chat_id.")
    res = await db.execute(select(Chat).where(Chat.id == cid))
    chat = res.scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found.")
    await db.execute(delete(Chat).where(Chat.id == cid))
    await db.commit()
    return JSONResponse(status_code=204, content=None)


@router.get("/chats/{chat_id}/messages")
async def get_chat_messages(chat_id: str, db: AsyncSession = Depends(get_db)):
    try:
        cid = uuid.UUID(chat_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chat_id.")
    res = await db.execute(
        select(ChatMessage).where(ChatMessage.chat_id == cid).order_by(ChatMessage.created_at.asc())
    )
    msgs = res.scalars().all()
    out = []
    for m in msgs:
        mo = await _message_to_out(db, m)
        out.append(mo.model_dump(by_alias=True, mode="json"))
    return JSONResponse(content=out)


@router.post("/chats/{chat_id}/messages")
async def send_message(chat_id: str, body: SendMessageRequest, db: AsyncSession = Depends(get_db)):
    try:
        cid = uuid.UUID(chat_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chat_id.")
    if not body.content or not body.content.strip():
        raise HTTPException(status_code=400, detail="Message content is required.")

    res = await db.execute(select(Chat).where(Chat.id == cid))
    chat = res.scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found.")

    # Persist user message
    user_msg = ChatMessage(chat_id=chat.id, role="user", content=body.content, model=None)
    db.add(user_msg)
    await db.flush()

    # Load conversation history (everything prior, chronological)
    hist_res = await db.execute(
        select(ChatMessage).where(ChatMessage.chat_id == chat.id)
        .order_by(ChatMessage.created_at.asc())
    )
    history_rows = hist_res.scalars().all()
    history = [
        {"role": m.role, "content": m.content}
        for m in history_rows if m.id != user_msg.id
    ]

    # Run RAG
    result = await rag.answer(
        question=body.content,
        document_ids=body.document_ids or None,
        user_id=str(chat.user_id),
        history=history,
    )

    assistant_msg = ChatMessage(
        chat_id=chat.id, role="assistant",
        content=result["content"], model=result["model"],
    )
    db.add(assistant_msg)
    await db.flush()

    for c in result["citations"]:
        try:
            doc_uuid = uuid.UUID(c["document_id"]) if c.get("document_id") else None
        except Exception:
            doc_uuid = None
        if doc_uuid is None:
            continue
        db.add(MessageCitation(
            message_id=assistant_msg.id,
            document_id=doc_uuid,
            page=c.get("page"),
            snippet=c.get("snippet") or "",
            score=float(c.get("score", 0.0)),
            chunk_index=c.get("chunk_index"),
        ))

    # Update chat: updated_at, and title if still "New chat"
    new_title = chat.title
    if (chat.title or "").strip().lower() == "new chat":
        q = body.content.strip().replace("\n", " ")
        new_title = q[:48] + ("…" if len(q) > 48 else "")
    await db.execute(
        update(Chat).where(Chat.id == chat.id).values(
            title=new_title, updated_at=datetime.now(timezone.utc),
        )
    )
    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)

    user_out = await _message_to_out(db, user_msg)
    asst_out = await _message_to_out(db, assistant_msg)
    payload = SendMessageResponse(user_message=user_out, assistant_message=asst_out)
    return JSONResponse(content=payload.model_dump(by_alias=True, mode="json"))
