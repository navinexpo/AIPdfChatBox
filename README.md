# Docked — AI Document Chat (Full Stack)

Local-first RAG chat over PDF / DOCX / Markdown / TXT documents.
**No cloud APIs.** Everything runs locally: Ollama (LLM), Sentence-Transformers
(embeddings), ChromaDB (vectors), PostgreSQL (metadata).

```
frontend/   React 18 + Vite SPA (unchanged from upload)
backend/    FastAPI + SQLAlchemy + Alembic + Chroma + Ollama
docker-compose.yml
```

## Quick start (Docker)

```bash
cp backend/.env.example backend/.env
docker compose up --build
# Pull the model the first time:
docker compose exec ollama ollama pull llama3:8b
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:8000 (Swagger at `/docs`, health at `/api/health`)

The frontend's Vite dev server proxies `/api/*` → `http://localhost:8000`
(see `frontend/vite.config.ts`). The compose file sets `VITE_USE_MOCK_API=false`
so the SPA talks to the real backend.

## Local dev without Docker

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: point DATABASE_URL/CHROMA_PERSIST_DIR/STORAGE_DIR at local paths
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Requires a running Postgres and Ollama. Pull models:
```bash
ollama pull llama3:8b
```

### Frontend
```bash
cd frontend
cp .env.example .env   # set VITE_USE_MOCK_API=false
npm install
npm run dev
```

## Architecture

- `POST /api/documents` (multipart) → save file → insert `documents` row with
  `status=queued` → schedule background pipeline → return immediately.
- Background task: extract → chunk → embed (BGE) → upsert to ChromaDB
  (`docked_chunks` collection) → mark `status=ready` (or `failed`).
- `POST /api/chats/{id}/messages` → embed query → retrieve top-K chunks (filtered
  by `document_ids` or `user_id`) → assemble grounded prompt → Ollama `/api/chat`
  → persist user + assistant messages + citations → return camelCase JSON.

### API contract notes

- **Requests** use snake_case (`user_id`, `document_ids`) — matches what the
  React frontend's `src/lib/api.ts` sends.
- **Responses** use camelCase (`fileName`, `userId`, `createdAt`) — matches the
  frontend's TypeScript types. Achieved with Pydantic `alias_generator=to_camel`
  and `model_dump(by_alias=True)`.

### Endpoints

| Method | Path | Notes |
|---|---|---|
| `GET`  | `/api/health` | Postgres + Chroma + Ollama liveness |
| `POST` | `/api/documents` | multipart upload (`file`, `user_id`) |
| `GET`  | `/api/documents?user_id=…` | array of `AppDocument` |
| `DELETE` | `/api/documents/{id}` | also deletes vectors + file |
| `GET`  | `/api/chats?user_id=…` | |
| `POST` | `/api/chats` | `{ user_id, title?, document_ids? }` |
| `DELETE` | `/api/chats/{id}` | cascades to messages |
| `GET`  | `/api/chats/{id}/messages` | chronological |
| `POST` | `/api/chats/{id}/messages` | `{ content, document_ids? }` → RAG |

### Errors

All non-2xx responses: `{ "detail": "...", "code"?: "..." }` — matches
the frontend's `ApiError` type.

## Tests

```bash
cd backend
pytest -q
```

## Configuration

See `backend/.env.example`. Notable knobs:

- `OLLAMA_DEFAULT_MODEL` (default `llama3:8b`) — change to `qwen2:7b` or
  `mistral:7b` after `ollama pull …`.
- `EMBEDDING_MODEL` — bump to `BAAI/bge-base-en-v1.5` for higher-quality
  retrieval (768-dim, more CPU/RAM).
- `RAG_TOP_K`, `RAG_MAX_CONTEXT_CHARS`, `CHUNK_SIZE_TOKENS`,
  `CHUNK_OVERLAP_TOKENS` — RAG tuning.
- `MAX_UPLOAD_SIZE_MB` (default 25) — must match the frontend constant.
