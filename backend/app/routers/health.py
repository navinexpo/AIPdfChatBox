from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.services import vectorstore, ollama_client

router = APIRouter()


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    pg_ok = False
    try:
        await db.execute(text("SELECT 1"))
        pg_ok = True
    except Exception:
        pg_ok = False

    chroma_ok = vectorstore.health()
    ollama_ok = await ollama_client.health()

    ok = pg_ok and chroma_ok and ollama_ok
    return {
        "status": "ok" if ok else "degraded",
        "postgres": pg_ok,
        "chroma": chroma_ok,
        "ollama": ollama_ok,
    }
