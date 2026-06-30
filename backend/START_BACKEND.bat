@echo off
echo ========================================
echo   ChatDock AI - Backend Setup & Start
echo ========================================
echo.

REM Check if venv exists, if not create it
IF NOT EXIST "venv\" (
    echo [1/4] Creating virtual environment...
    python -m venv venv
    echo Done.
) ELSE (
    echo [1/4] Virtual environment already exists.
)

echo.
echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo [3/4] Installing dependencies (this may take a few minutes first time)...
pip install -r requirements.txt --quiet

echo.
echo [4/4] Creating data directories...
if not exist "data\chroma" mkdir data\chroma
if not exist "data\storage" mkdir data\storage

echo.
echo ========================================
echo  Running database migration...
echo ========================================
alembic upgrade head

echo.
echo ========================================
echo  Starting FastAPI backend on port 8000
echo ========================================
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
