# OnboardPro Next.js Client Application

This Next.js application serves as the client frontend for the Employee Onboarding System.

## Getting Started

### 1. Configure Environment Variables
Copy `.env.local.example` to `.env.local` inside this directory:
```bash
cp .env.local.example .env.local
```

Modify the variables:
* `NEXT_PUBLIC_API_URL`: Points to the NestJS API server (default: `http://127.0.0.1:3000`).
* `NEXTAUTH_URL`: Points to this client host (default: `http://localhost:3002`).
* `NEXTAUTH_SECRET`: Secret hash token (must match the backend's `NEXTAUTH_SECRET`).

---

### 2. Run Locally

Install client dependencies:
```bash
npm install
```

Start the Next.js client development server:
```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) in your browser to access the onboarding portal.
* Sign in as HR: `hr@example.com` / `password123`
* Sign in as Manager: `manager@example.com` / `password123`
* Sign in as Candidate: `alice@example.com` / `password123`
