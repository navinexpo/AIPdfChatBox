from __future__ import annotations
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.routers import documents, chats, health
from app.services import embeddings

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("docked")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Docked backend...")
    try:
        embeddings.load_model()
    except Exception as e:
        logger.exception("Failed to preload embedding model: %s", e)
    yield
    logger.info("Shutting down Docked backend.")


app = FastAPI(title="Docked AI Document Chat", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed."
    return JSONResponse(status_code=exc.status_code, content={"detail": detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    msg = exc.errors()[0].get("msg") if exc.errors() else "Invalid request."
    return JSONResponse(status_code=422, content={"detail": msg, "code": "VALIDATION_ERROR"})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error.", "code": "INTERNAL"},
    )


app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(documents.router, prefix="/api", tags=["documents"])
app.include_router(chats.router, prefix="/api", tags=["chats"])


@app.get("/")
async def root():
    return {"name": "Docked AI Document Chat API", "docs": "/docs", "health": "/api/health"}
