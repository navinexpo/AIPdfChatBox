from datetime import datetime
from app.schemas.common import CamelModel


class DocumentOut(CamelModel):
    id: str
    user_id: str
    organization_id: str | None = None
    file_name: str
    file_type: str
    file_size_bytes: int
    status: str
    status_message: str | None = None
    page_count: int | None = None
    chunk_count: int | None = None
    uploaded_at: datetime
    processed_at: datetime | None = None


class UploadDocumentResponse(CamelModel):
    document: DocumentOut
