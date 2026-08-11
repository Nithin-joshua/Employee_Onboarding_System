@echo off
echo ==========================================
echo Starting OnboardPro Setup and Startup
echo ==========================================

echo [1/5] Installing root backend dependencies...
call npm install

echo [2/5] Starting PostgreSQL database container...
docker compose up -d postgres

echo Waiting for database to start...
timeout /t 5 >nul

echo [3/5] Deploying database migrations...
call npx prisma migrate deploy

echo [4/5] Seeding database with dev credentials...
call npx prisma db seed

echo [5/5] Starting development servers...
echo Starting backend NestJS server in a new window...
start cmd /k "npm run start:dev"

echo Starting frontend Next.js server in a new window...
start cmd /k "cd frontend && npm run dev"

echo ==========================================
echo All steps completed!
echo Backend API: http://localhost:3000
echo Frontend Client: http://localhost:3002
echo ==========================================
pause
