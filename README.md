# SpendSense

**Version:** 1.0  
**Date:** November 3, 2025  
**Project:** SpendSense

---

## Overview

SpendSense is an explainable, consent-aware financial education platform that transforms bank transaction data into personalized insights without crossing into regulated financial advice. The system detects behavioral patterns, assigns invisible personas, and delivers tailored educational content with clear rationales grounded in user data.

**Core Principles:**
- Transparency over sophistication
- User control over automation
- Education over sales
- Fairness built in from day one

---

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- Git

### One-Command Setup

```bash
# Clone repository
git clone <repository-url>
cd SpendSense

# Install dependencies, setup database, seed data, and start servers
npm run dev
```

This single command will:
1. Install all dependencies (`npm install`)
2. Run database migrations (`npx prisma migrate dev`)
3. Generate Prisma client (`npx prisma generate`)
4. Seed synthetic data (`npx prisma db seed`)
5. Start backend server (port 3000)
6. Start frontend dev server (port 5173)

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

### Manual Setup (Alternative)

If you prefer to run commands separately:

```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate dev
npx prisma generate

# Seed synthetic data
npm run seed

# Start backend (terminal 1)
npm run dev:backend

# Start frontend (terminal 2)
npm run dev:frontend
```

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database (PostgreSQL/Supabase)
# Replace with your actual Supabase connection string from Supabase dashboard
DATABASE_URL="postgresql://postgres.USER:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"

# Authentication
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="24h"

# AI Integration (Optional)
OPENAI_API_KEY="sk-..."  # Required only if USE_LLM_STUB=false
USE_LLM_STUB="true"       # Set to "false" to use OpenAI API

# Data Generation
DATA_SEED="1337"          # Fixed seed for deterministic data generation

# Server
PORT=3000
NODE_ENV="development"
```

**Note:** 
- The `.env` file should be created in the `backend/` directory (not project root)
- **Never commit `.env` files to git** - they contain sensitive credentials
- Get your Supabase connection string from: Supabase Dashboard → Project Settings → Database → Connection String
- For local development with Supabase, use the pooled connection (port 6543)
- For migrations, use the non-pooling connection (port 5432)

**Local Run Mode (Required by Assignment):**
- Set `USE_LLM_STUB=true` to run without external API dependencies
- The system will use deterministic mock responses for chat interactions

---

## Project Structure

```
SpendSense/
├── backend/
│   ├── src/
│   │   ├── ingest/          # Data loading and validation
│   │   ├── features/        # Signal detection
│   │   ├── personas/        # Persona assignment
│   │   ├── recommend/       # Recommendation engine
│   │   ├── guardrails/       # Consent, eligibility, tone checks
│   │   ├── ui/               # API routes and middleware
│   │   ├── eval/             # Evaluation harness
│   │   └── services/         # External service integrations
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.ts           # Synthetic data generator
│   └── tests/                # Unit and integration tests
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page-level components
│   │   └── lib/              # API client and utilities
│   └── public/
├── api/                      # Vercel serverless functions
├── content/                  # Pre-tagged educational content (JSON)
├── data/
│   ├── offers/               # Partner offer JSON files
│   ├── synthetic-users/     # Generated user data (CSV/JSON)
│   └── analytics/            # Evaluation metrics and reports
├── docs/                     # Documentation
│   ├── analysis/             # Analysis documents
│   ├── planning/             # Planning documents
│   ├── testing/              # Testing documentation
│   ├── DECISIONS.md          # Key architectural decisions
│   ├── SCHEMA.md             # Data model documentation
│   └── LIMITATIONS.md        # Known limitations
├── specs/                    # PRDs and specifications
├── memory-bank/              # Project memory and context
├── submissionMaterials/      # Submission documentation and artifacts
└── README.md                 # This file
```

---

## Available Scripts

### Development

- `npm run dev` - One-command setup: install, migrate, seed, start both servers
- `npm run dev:backend` - Start backend server only (port 3000)
- `npm run dev:frontend` - Start frontend dev server only (port 5173)

### Database

- `npm run db:migrate` - Run Prisma migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:seed` - Seed synthetic data (100 users, ~50K transactions)
- `npm run db:reset` - Reset database (drop, migrate, seed)

### Data Generation

- `npm run seed` - Generate and seed synthetic data
- `npm run export:csv` - Export data to CSV files
- `npm run export:json` - Export data to JSON files
- `npm run export:parquet` - Export transactions to Parquet (optional)

### Testing

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report

### Evaluation

- `npm run eval` - Run evaluation harness (coverage, explainability, latency, auditability)
- `npm run eval:metrics` - Generate metrics JSON/CSV files
- `npm run eval:report` - Generate 1-2 page summary report

### Build

- `npm run build` - Build both backend and frontend for production
- `npm run build:backend` - Build backend only
- `npm run build:frontend` - Build frontend only

---

## Key Features

### 1. Synthetic Data Generator
- Generates 100 synthetic users matching Plaid's data structure
- Diverse financial profiles across 5 personas
- 2 years of transaction history (~50K transactions)
- Deterministic generation (fixed seed: `DATA_SEED=1337`)

### 2. Behavioral Signal Detection
- **Subscriptions:** Recurring merchant detection (≥3 in 90 days)
- **Savings:** Net inflow, growth rate, emergency fund coverage
- **Credit:** Utilization tiers, interest charges, overdue flags
- **Income:** Payroll patterns, cash-flow buffer

### 3. Persona Assignment System
- 5 personas: High Utilization, Variable Income, Subscription-Heavy, Savings Builder, Net Worth Maximizer
- Scoring algorithm with prioritization logic
- Primary and secondary persona assignments
- 30-day and 180-day windows

### 4. Recommendation Engine
- Template-based rationales (cites specific data points)
- Pre-tagged content catalog (~3-5 articles per persona)
- Partner offers with eligibility rules
- Decision traces for auditability

### 5. Consent & Guardrails
- Explicit consent required before processing
- Consent gating on all compute paths
- Tone blocklist (no shaming language)
- Eligibility checks (first-order signals only)
- Automated pre-publish checks with operator gate

### 6. Operator View
- View signals, personas, recommendations for any user
- Approve/hide recommendations
- Override persona assignments (for testing)
- Audit log of all operator actions
- Decision trace viewer

### 7. Chat Interface
- OpenAI GPT-4o-mini with strict function calling
- 9 read-only tools (consent-gated)
- Deterministic responses (temperature=0)
- Educational focus (no financial advice)

---

## Submission Checklist

**All submission materials are organized in the `submissionMaterials/` folder.**

Per the assignment requirements, submit the following artifacts:

### ✅ Code Repository
- [x] GitHub repository (public or private with access granted)
- [x] Complete codebase with all features implemented
- [x] All dependencies listed in `package.json`
- [x] One-command setup working (`npm run dev`)

### ✅ Documentation (in `submissionMaterials/`)
- [x] **Technical Writeup (1-2 pages):** `submissionMaterials/TECHNICAL_WRITEUP.md`
  - System architecture overview
  - Key technical decisions
  - Implementation highlights
  - Known limitations

- [x] **AI Tools and Prompts Documentation:** `submissionMaterials/AI_TOOLS_AND_PROMPTS.md`
  - OpenAI API usage (chat, function calling)
  - System prompts
  - Tool definitions
  - Determinism settings

- [x] **Data Model/Schema Documentation:** `submissionMaterials/SCHEMA.md`
  - Complete database schema
  - Field definitions
  - Relationships
  - Indexes

- [x] **Decision Log:** `submissionMaterials/DECISIONS.md`
  - Key architectural decisions
  - Rationale for choices
  - Trade-offs considered

- [x] **Limitations Document:** `submissionMaterials/LIMITATIONS.md`
  - Known limitations
  - Fairness deferral note
  - Future enhancements

### ✅ Evaluation Artifacts (in `submissionMaterials/`)
- [x] **Performance Metrics (JSON/CSV):** `submissionMaterials/evaluation-metrics.json` and `evaluation-metrics.csv`
  - Coverage: % users with persona + ≥3 behaviors (100%)
  - Explainability: % recommendations with rationales (100%)
  - Latency: Time to generate recommendations per user (<5s, P95 = 884ms)
  - Auditability: % recommendations with decision traces (100%)

- [x] **Evaluation Summary Report (1-2 pages):** `submissionMaterials/evaluation-report.txt`
  - Overall system performance
  - Success criteria met
  - Known limitations
  - Future improvements

- [ ] **Per-User Decision Traces:** `backend/data/analytics/decision_traces/` (JSON files per user)
  - User ID
  - Detected signals
  - Persona assignments with scores
  - Generated recommendations
  - Rationales
  - Eligibility checks
  - Timestamps

### ✅ Testing
- [ ] **Test Cases and Validation Results:** `backend/tests/` directory
  - ≥10 passing tests (requirement)
  - Test coverage report
  - Validation results documented

### ✅ Demo Materials
- [ ] **Demo Video or Live Presentation:**
  - Screen recording showing:
    - One-command setup
    - User dashboard with recommendations
    - Operator view with decision traces
    - Chat interface
    - Evaluation harness output

### ✅ Regeneration Commands

All submission artifacts can be regenerated with these commands:

```bash
# Generate synthetic data
npm run seed

# Run evaluation harness
npm run eval

# Generate metrics JSON/CSV
npm run eval:metrics

# Generate evaluation report
npm run eval:report

# Export decision traces
npm run eval:traces

# Run tests
npm test

# Generate test coverage report
npm run test:coverage
```

---

## Testing

### Run All Tests

```bash
npm test
```

### Test Coverage

```bash
npm run test:coverage
```

**Minimum Coverage:** ≥10 tests (per assignment requirement)

**Test Areas:**
- Subscription cadence detection
- Credit utilization flags and tiers
- Min-payment-only detection
- Consent gating
- Offer eligibility rules
- Tone blocklist enforcement
- Rationale template generation
- Metrics harness output

---

## Evaluation Harness

### Run Evaluation

```bash
npm run eval
```

This will compute:
- **Coverage:** % of users with assigned persona + ≥3 behaviors (target: 100%)
- **Explainability:** % of recommendations with rationales (target: 100%)
- **Relevance:** Average relevance score (target: ≥0.7)
- **Latency:** Time to generate recommendations per user (target: <5 seconds)
- **Auditability:** % of recommendations with decision traces (target: 100%)

### Generate Metrics Files

```bash
# Generate JSON metrics
npm run eval:metrics

# Generate CSV metrics
npm run eval:metrics -- --format csv

# Generate evaluation report
npm run eval:report
```

**Output Files:**
- `backend/data/analytics/evaluation-metrics.json`
- `backend/data/analytics/evaluation-metrics.csv`
- `backend/data/analytics/evaluation-report.txt`
- `backend/data/analytics/decision_traces/*.json` (per-user traces)

---

## API Endpoints

**Base URL:** `http://localhost:3000/api`

### Authentication
- `POST /api/users` - Create user account (matches prompt `POST /users` with `/api` prefix)
- `POST /api/auth/login` - Login with email/password (additional)

### User & Consent
- `POST /api/consent` - Record or update consent (matches prompt `POST /consent` with `/api` prefix)
- `GET /api/users/me` - Get current user profile (additional)

### Profile & Recommendations
- `GET /api/profile/:userId` - Get behavioral profile (signals, personas) - matches prompt `GET /profile/{user_id}` with `/api` prefix
- `GET /api/recommendations/:userId` - Get recommendations (with `?refresh=true` for recompute) - matches prompt `GET /recommendations/{user_id}` with `/api` prefix
- `POST /api/feedback` - Record user action on recommendation - matches prompt `POST /feedback` with `/api` prefix (pass `recommendation_id` in body)

### Chat
- `POST /api/chat` - Send message to chat assistant (additional)

### Operator
- `GET /api/operator/review` - Operator approval queue (flagged recommendations) - matches prompt `GET /operator/review` with `/api` prefix
- `GET /api/operator/dashboard` - Operator dashboard overview (additional)
- `GET /api/operator/users` - List all users (additional)
- `GET /api/operator/user/:userId` - Get detailed user profile (additional)
- `POST /api/operator/recommendation/:recommendationId/hide` - Hide recommendation (additional)
- `POST /api/operator/recommendation/:recommendationId/approve` - Approve flagged recommendation (additional)
- `POST /api/operator/user/:userId/persona-override` - Override persona assignment (additional)

See `SS_Architecture_PRD.md` for complete API documentation.

---

## Technology Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Vite
- React Router v6
- Axios
- Zustand

### Backend
- Node.js 20+ with TypeScript
- Express.js
- Prisma ORM
- PostgreSQL (Supabase)
- date-fns
- Zod

### AI Integration
- OpenAI GPT-4o-mini (chat with function calling)
- Deterministic stub mode for local runs

### Testing
- Jest
- Supertest

---

## Limitations

See `docs/LIMITATIONS.md` for complete list of known limitations.

**Key Limitations:**
- Static synthetic data (no live Plaid integration)
- No OAuth (JWT-only authentication)
- No email/push notifications
- Web only (no mobile app)
- Fairness analysis deferred (no demographic data)

---

## Future Enhancements

See `docs/DECISIONS.md` for prioritized roadmap.

**Phase 2:**
- Real Plaid API integration
- Email notifications
- Enhanced security (2FA, rate limiting)
- Performance optimizations

**Phase 3:**
- Real-time transaction streaming
- Advanced ML models
- Multi-bank aggregation
- A/B testing framework

---

## Deployment

### Vercel Deployment

**Prerequisites:**
- Vercel account (free tier is sufficient)
- GitHub repository connected to Vercel

**Option 1: Deploy via Vercel CLI**

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project (first time only)
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Option 2: Deploy via GitHub Integration**

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository: `mlx93/spendsense-mlx`
4. **Configure Framework Preset (during import):**
   - **Framework Preset:** Select "Other" (or "Other" if not listed)
   - **Root Directory:** Leave as `./` (root)
   - **Build Command:** `npm run build`
   - **Output Directory:** `frontend/dist`
   - **Install Command:** `npm install` (auto-detected)
   
   **Note:** If you need to change the Framework Preset after import:
   - Go to **Project Settings** → **General** → **Framework Preset**
   - Change to "Other" if needed

5. **Add Environment Variables:**
   - During import, click **"Environment Variables"** or
   - After import, go to **Project Settings** → **Environment Variables**
   - Add the following variables (click "Add" for each):
   
**Required Variables:**
  ```
  # Replace USER, PASSWORD, and REGION with your actual Supabase credentials
  DATABASE_URL=postgresql://postgres.USER:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
  JWT_SECRET=<generate-secure-random-string-here>
  JWT_EXPIRES_IN=24h
  USE_LLM_STUB=true
  DATA_SEED=1337
  ```
   
   **Optional (if using OpenAI API):**
   ```
   OPENAI_API_KEY=sk-... (only if USE_LLM_STUB=false)
   ```
   
   **Note:** `NODE_ENV` is automatically set by Vercel to `production` - you don't need to add it manually.

6. Click **"Deploy"**

**Important Notes:**
- **Database:** This project uses Supabase PostgreSQL. Set `DATABASE_URL` to your Supabase connection string (use pooled connection for runtime, non-pooling for migrations).
- **Generate JWT_SECRET:** Use a secure random string. You can generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  Or use an online generator: https://generate-secret.vercel.app/32
- **Local Run Mode:** The assignment requires "run locally without external dependencies." Set `USE_LLM_STUB=true` to use deterministic mock responses.
- **Custom Domain:** You can add a custom domain in **Project Settings** → **Domains**.

**Environment Variables in Vercel:**
- **Location:** Project Settings → Environment Variables
- **Scopes:** You can set different values for Production, Preview, and Development environments
- **Add variables:** Click "Add" button, enter key and value, select environment(s), click "Save"

**Deployment Status:**
- Preview deployments: Created automatically for each push to feature branches
- Production deployments: Created automatically for pushes to `main` branch (if configured)

---

## Contributing

This is an open-source financial education platform project.

---

## License

This project is licensed under the MIT License.

---

**Document Version:** 1.0  
**Last Updated:** November 3, 2025

