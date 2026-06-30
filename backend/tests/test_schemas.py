from datetime import datetime, timezone
from app.schemas.document import DocumentOut


def test_document_camel_case():
    d = DocumentOut(
        id="x", user_id="u", organization_id=None, file_name="a.pdf",
        file_type="pdf", file_size_bytes=10, status="ready",
        status_message=None, page_count=1, chunk_count=1,
        uploaded_at=datetime.now(timezone.utc), processed_at=None,
    )
    j = d.model_dump(by_alias=True, mode="json")
    assert "fileName" in j and "userId" in j and "fileSizeBytes" in j
    assert "file_name" not in j
