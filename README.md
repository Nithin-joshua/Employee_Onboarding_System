# Employee Onboarding System Monorepo

This is a production-grade Employee Onboarding application containing a NestJS + Prisma backend API and a Next.js frontend application.

## System Prerequisites
Ensure you have the following installed locally:
- Node.js (v18+ or v20+)
- Docker (for Postgres)

---

## 1. Backend API (NestJS) Setup

### Configure Environment Variables
Copy `.env.example` to `.env` in the root folder:
```bash
cp .env.example .env
```

Ensure the following variables are configured in `.env`:
* `DATABASE_URL`: Connection string to your PostgreSQL instance.
* `JWT_SECRET`: Secret key for signing backend access tokens (required; errors on startup in production if missing).
* `NEXTAUTH_SECRET`: Secret key for frontend session security.
* `OCR_MODE`: Set to `mock` to run offline/locally without real Mistral or Supabase credentials.
* `MISTRAL_API_KEY`: Required if `OCR_MODE` is not `mock`.
* `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: Required if `OCR_MODE` is not `mock`.
* `STORAGE_PROVIDER`: Set to `local` (uses local AES vault) or `supabase` (uses Supabase cloud buckets).
* `VAULT_ENCRYPTION_KEY`: Symmetric key for local AES credential storage.
* `CORS_ORIGIN`: Comma-separated allowlist of allowed domains (e.g. `http://localhost:3002`).

### Quick Start Commands
From the root workspace folder:

1. **Spin up PostgreSQL Database:**
   ```bash
   docker compose up -d postgres
   ```
2. **Deploy Database Migrations:**
   ```bash
   npx prisma migrate deploy
   ```
3. **Seed Database (creates Manager, HR, and New Hire credentials):**
   ```bash
   npx prisma db seed
   ```
4. **Start Development Server:**
   ```bash
   npm run start:dev
   ```

---

## 2. Frontend App (Next.js) Setup

From the `frontend` subdirectory:

### Configure Environment Variables
Copy `.env.local.example` to `.env.local` inside the `frontend/` directory:
```bash
cd frontend
cp .env.local.example .env.local
```

Ensure the following variables are configured in `frontend/.env.local`:
* `NEXT_PUBLIC_API_URL`: Points to the NestJS server (default: `http://127.0.0.1:3000`).
* `NEXTAUTH_URL`: Points to the frontend client address (default: `http://localhost:3002`).
* `NEXTAUTH_SECRET`: Must match the `NEXTAUTH_SECRET` defined in the root `.env`.

### Run Development Client
From the `frontend/` directory:
```bash
npm install
npm run dev
```

---

## Running Verification / Tests
To run all tests inside the root directory:

**Unit Tests:**
```bash
npm test
```

**End-to-End (E2E) Tests:**
```bash
npm run test:e2e
```
