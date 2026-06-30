from datetime import datetime
from app.schemas.common import CamelModel


class UserOut(CamelModel):
    id: str
    display_name: str
    organization_id: str | None = None
    created_at: datetime
