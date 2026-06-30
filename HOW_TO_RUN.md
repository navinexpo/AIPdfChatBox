# ChatDock AI - Windows Setup Guide

## Prerequisites (Install these first)
1. **Python 3.11** → https://www.python.org/downloads/release/python-3119/
   - ⚠️ Check "Add Python to PATH" during install
   - Python 3.14 does NOT work with PyMuPDF — use 3.11
2. **PostgreSQL** → https://www.postgresql.org/download/windows/
3. **Ollama** → https://ollama.com/download
4. **Node.js** → https://nodejs.org (LTS version)

---

## Step 1 — Setup PostgreSQL Database (Do this ONCE)

Open CMD and run:
```
psql -U postgres -f backend\setup_db.sql
```
Or manually in psql:
```sql
CREATE DATABASE docked;
CREATE USER docked WITH PASSWORD 'docked';
GRANT ALL PRIVILEGES ON DATABASE docked TO docked;
```

---

## Step 2 — Open 3 Terminals in VS Code

### Terminal 1 — Ollama (AI Model)
```
ollama serve
```
Then in a new terminal:
```
ollama pull llama3:8b
```

### Terminal 2 — Backend
```
cd backend
START_BACKEND.bat
```

### Terminal 3 — Frontend
```
cd frontend
START_FRONTEND.bat
```

---

## Open Browser
Go to: **http://localhost:5173**

---

## Troubleshooting

| Error | Fix |
|---|---|
| PyMuPDF fails to install | You are using Python 3.14 — install Python 3.11 instead |
| `asyncpg` module not found | Run from inside backend folder with venv activated |
| Database connection error | PostgreSQL must be running and database 'docked' must exist |
| Ollama connection refused | Run `ollama serve` in a separate terminal |
| Port 8000 in use | Change `--port 8000` to `--port 8001` in START_BACKEND.bat |
