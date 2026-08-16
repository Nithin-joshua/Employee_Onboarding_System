# Employee Onboarding System

This repository contains a production-grade Employee Onboarding application split into a backend service and a frontend client.

---

## Folder Structure

The project is organized into two primary service folders:

```text
employee-system/
├── backend/                  # NestJS API & Prisma Database Layer
│   ├── src/                  # NestJS application source code
│   ├── prisma/               # Database schema, migrations, and seeds
│   ├── test/                 # Integration and E2E tests
│   ├── .env.example          # Template for backend environment variables
│   ├── package.json          # Backend dependencies and scripts
│   └── tsconfig.json         # TypeScript configuration
│
└── frontend/                 # Next.js User Interface
    ├── src/                  # Next.js pages and components
    ├── .env.local.example    # Template for frontend environment variables
    ├── package.json          # Frontend dependencies and scripts
    └── next.config.js        # Next.js configuration
```

---

## 1. Database Configuration

The backend uses **PostgreSQL** as its database, managed through **Prisma ORM**.

### Prerequisites
- Docker & Docker Compose (for running PostgreSQL locally)
- Node.js (v18+ or v20+)

### Setup Steps
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Copy the environment template to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Configure the following database environment variables in `.env`:
   - `DATABASE_URL`: Connection string to your PostgreSQL instance (e.g., `postgresql://postgres:secretpassword@localhost:5433/onboarding_db?schema=public`).
   - `POSTGRES_USER`: The username for the database owner (e.g., `postgres`).
   - `POSTGRES_PASSWORD`: The password for the database owner.
   - `POSTGRES_DB`: The database name (e.g., `onboarding_db`).

4. Spin up the PostgreSQL database container:
   ```bash
   docker compose up -d postgres
   ```

5. Deploy the Prisma database migrations:
   ```bash
   npx prisma migrate deploy
   ```

6. Seed the database with initial roles (Manager, HR, New Hire):
   ```bash
   npx prisma db seed
   ```

---

## 2. Authentication (JWT Setup)

JSON Web Tokens (JWT) are used to secure communication between the frontend client and the NestJS backend APIs.

### Setup Steps
1. In your backend `.env` file, locate the `JWT_SECRET` variable.
2. Generate a secure, cryptographically random key of at least 32 characters. You can use the following command:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Set the output value as the `JWT_SECRET` in your backend `.env`:
   ```env
   JWT_SECRET=your_generated_jwt_secret_value
   ```
4. The system validates this secret on startup. If it is missing or insecure, the backend will fail to start in production.

---

## 3. Document Encryption (Vault Password / Encryption Key)

The onboarding system secures sensitive employee documents (such as IDs, tax forms, and contracts) using AES-256 symmetric encryption prior to storage.

### Setup Steps
1. In your backend `.env` file, locate the `VAULT_ENCRYPTION_KEY` variable (often referred to as the vault password).
2. Generate a secure 32-byte key (represented as a 64-character hexadecimal string) using this command:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Assign this value to `VAULT_ENCRYPTION_KEY` in `.env`:
   ```env
   VAULT_ENCRYPTION_KEY=your_generated_vault_encryption_key_value
   ```
4. **CRITICAL WARNING:** Ensure you do not lose this key. Any files uploaded while this key was active will become permanently unreadable if the key is lost or modified.

---

## 4. Running the Applications

### Starting the Backend (NestJS)
From the `backend` directory:
```bash
npm install
npm run start:dev
```

### Starting the Frontend (Next.js)
From the `frontend` directory:
1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
2. Configure variables in `frontend/.env.local`:
   - `NEXT_PUBLIC_API_URL`: Points to the backend NestJS server (e.g., `http://127.0.0.1:8000`).
   - `NEXTAUTH_SECRET`: Frontend authentication secret (should match backend secret or be another secure key).
3. Run the development server:
   ```bash
   npm install
   npm run dev
   ```

---

## Running Verification / Tests

From the `backend` directory:

**Unit Tests:**
```bash
npm test
```

**End-to-End (E2E) Tests:**
```bash
npm run test:e2e
```


