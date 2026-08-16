@echo off
echo ==========================================
echo Starting OnboardPro in Docker Containers
echo ==========================================

echo [1/4] Installing backend setup dependencies...
cd backend
call npm install
cd ..

echo [2/4] Starting PostgreSQL database container...
docker compose up -d postgres

echo Waiting for database to start...
timeout /t 5 >nul

echo [3/4] Deploying database migrations and seeding...
cd backend
call npx prisma migrate deploy
call npx prisma db seed
cd ..

echo [4/4] Building and starting Backend and Frontend containers...
docker compose up -d --build backend frontend

echo ==========================================
echo All steps completed! All services are running in Docker!
echo Backend API: http://localhost:8000
echo Frontend Client: http://localhost:3002
echo ==========================================
pause
