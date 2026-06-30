from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.common import CamelModel


# ---------- Request schemas (snake_case from frontend) ----------

class CreateChatRequest(BaseModel):
    user_id: str
    title: Optional[str] = "New chat"
    document_ids: List[str] = []


class SendMessageRequest(BaseModel):
    content: str
    document_ids: List[str] = []


# ---------- Response schemas (camelCase to frontend) ----------

class ChatOut(CamelModel):
    id: str
    user_id: str
    title: str
    document_ids: List[str] = []
    created_at: datetime
    updated_at: datetime


class SourceCitationOut(CamelModel):
    document_id: str
    file_name: str
    page: int | None = None
    snippet: str
    score: float


class ChatMessageOut(CamelModel):
    id: str
    chat_id: str
    role: str
    content: str
    citations: List[SourceCitationOut] = []
    model: str | None = None
    created_at: datetime


class SendMessageResponse(CamelModel):
    user_message: ChatMessageOut
    assistant_message: ChatMessageOut
