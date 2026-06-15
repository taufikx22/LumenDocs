@echo off
echo ==========================================
echo Starting LumenDocs Local Web Application...
echo ==========================================

REM Start Python Backend in a separate command window
echo Launching Backend (FastAPI on port 8000)...
start "LumenDocs Backend" cmd /k "cd backend && .venv\Scripts\python run.py"

REM Start Next.js Frontend in a separate command window
echo Launching Frontend (Next.js on port 3000)...
start "LumenDocs Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo System is launching!
echo.
echo Backend API Documentation: http://localhost:8000/docs
echo Frontend Web Application: http://localhost:3000
echo ==========================================
pause
