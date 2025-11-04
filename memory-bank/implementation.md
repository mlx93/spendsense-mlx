# SpendSense Implementation Memory Bank

## Overview
Complete implementation of SpendSense - an explainable, consent-aware financial education platform. Full-stack TypeScript application with React frontend, Express backend, Prisma ORM, and SQLite database.

**Status:** ✅ Fully functional - All phases complete
**Date:** November 2024
**Database:** Seeded with 100 users + 1 operator, 318 accounts, 189K+ transactions, 407 recommendations

---

## Architecture Summary

### Tech Stack
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite (Prisma ORM) - Development, PostgreSQL ready for production
- **Authentication:** JWT (jsonwebtoken)
- **Testing:** Jest + ts-jest
- **AI Integration:** OpenAI GPT-4o-mini (with function calling)

### Project Structure
```
SpendSense/
├── backend/
│   ├── src/
│   │   ├── features/          # Signal detection (subscription, savings, credit, income)
│   │   ├── personas/           # Persona scoring and assignment
│   │   ├── recommend/         # Content/offer matching, rationale generation, agentic review
│   │   ├── guardrails/        # Consent, eligibility, tone validation
│   │   ├── ui/                # Express routes and middleware
│   │   ├── services/chat/     # OpenAI chat integration
│   │   ├── eval/              # Evaluation metrics
│   │   └── shared/           # Constants and utilities
│   ├── prisma/
│   │   ├── schema.prisma      # 12-table database schema
│   │   └── seed.ts           # Synthetic data generator
│   └── tests/                 # Test suite (8 test files, 19 tests)
├── frontend/
│   ├── src/
│   │   ├── pages/            # Dashboard, Insights, Library, Settings, Operator
│   │   ├── components/        # Layout, shared components
│   │   └── lib/              # Auth context, API client
├── content/                  # Educational content JSON files (6 items)
└── data/offers/              # Partner offer JSON files (21 items)
```

---

## Key Implementation Details

### Phase 1: Data Generation (`backend/prisma/seed.ts`)
- **100 synthetic users** (20 per persona type) + 1 operator
- **318 accounts** (checking, savings, credit cards, etc.)
- **189,078 transactions** (2 years of historical data)
- **109 liabilities** (credit card debt details)
- **Deterministic:** Uses `DATA_SEED=1337` and `faker.js` with seeded RNG
- **Plaid-compatible:** Strict adherence to Plaid API structure

**Critical Fix:** Path resolution for content/offers loading
- Changed from `process.cwd()` to `__dirname` relative paths
- Content loads from `../../content` and offers from `../../data/offers`

### Phase 2: Signal Detection (`backend/src/features/`)
**4 signal analyzers implemented:**

1. **Subscription Detector** (`subscriptionDetector.ts`)
   - Detects recurring merchants with monthly/weekly cadence
   - Handles amount variability (±10% or ±$5)
   - Stores: count, monthly_spend, recurring_merchants

2. **Savings Analyzer** (`savingsAnalyzer.ts`)
   - Tracks net inflows to savings accounts
   - Calculates growth rate and emergency fund coverage
   - Stores: net_inflow, growth_rate, emergency_fund_months

3. **Credit Analyzer** (`creditAnalyzer.ts`)
   - Calculates utilization across all credit cards
   - Detects minimum-payment-only patterns
   - Tracks interest charges and overdue status
   - Stores: max_utilization, interest_charges, is_overdue, min_payment_only

4. **Income Stability Analyzer** (`incomeStabilityAnalyzer.ts`)
   - Identifies payroll deposits (keywords: payroll, direct deposit, ADP, etc.)
   - Calculates income frequency (weekly/bi-weekly/monthly/irregular)
   - Computes income variability (coefficient of variation)
   - Calculates cash-flow buffer
   - **Critical Fix:** Variable name mismatch (`incomeVariability` vs `income_variability`)

**Windows:** Both 30-day and 180-day windows computed for all signals

### Phase 3: Persona Assignment (`backend/src/personas/`)
**5 Persona Types:**
1. `high_utilization` - Credit card utilization > 70%
2. `variable_income` - Irregular income patterns
3. `subscription_heavy` - 5+ active subscriptions
4. `savings_builder` - Actively saving, < 3 months emergency fund
5. `net_worth_maximizer` - Maximizing returns, emergency fund covered

**Scoring Engine** (`scoringEngine.ts`):
- Scores each persona based on signal thresholds
- Assigns primary (rank=1) and secondary (rank=2) personas
- **Prioritization Rule:** Net Worth Maximizer takes precedence if qualified
- Stores results in `Persona` table with scores and ranks

### Phase 4: Recommendation Engine (`backend/src/recommend/`)
**Components:**

1. **Content Matcher** (`contentMatcher.ts`)
   - Filters by `persona_fit` array
   - Checks signal overlap
   - Ranks by `editorial_priority` (deterministic)

2. **Offer Matcher** (`offerMatcher.ts`)
   - Checks eligibility rules via `eligibilityChecker`
   - Validates required signals
   - Excludes conflicting existing accounts
   - Ranks deterministically

3. **Rationale Generator** (`rationaleGenerator.ts`)
   - **Template-based** (not LLM-generated for determinism)
   - Loads templates from `data/rationales/`
   - Substitutes variables: `{utilization}`, `{monthly_spend}`, etc.
   - Fetches user accounts for context
   - **Critical Fix:** Added `userId` parameter for account fetching

4. **Agentic Review** (`agenticReview.ts`)
   - Tone blocklist validation
   - Eligibility revalidation
   - Optional LLM compliance review (disabled by default)
   - Stores review status and reason

**Recommendation Generation:**
- 3-5 education items per user
- 1-3 offers per user
- All include rationales and decision traces

### Phase 5: API Routes (`backend/src/ui/routes/`)
**Implemented Endpoints:**

1. **Authentication** (`auth.ts`)
   - `POST /api/auth/login` - JWT token generation
   - **Critical Fix:** Case-insensitive email lookup (SQLite limitation)

2. **User Management** (`users.ts`)
   - `POST /api/users` - User registration
   - Stores emails in lowercase for consistency

3. **Profile** (`profile.ts`)
   - `POST /api/consent` - Update consent status
   - `GET /api/profile/:userId` - Get user profile (signals, personas, accounts)
   - Authorization: Users can only access own profile (operators can access any)

4. **Recommendations** (`recommendations.ts`)
   - `GET /api/recommendations/:userId` - Get personalized recommendations
   - `POST /api/feedback` - Record user actions (dismiss, save, complete)
   - Supports `?refresh=true` to recompute signals and regenerate recommendations

5. **Chat** (`chat.ts`)
   - `POST /api/chat` - OpenAI GPT-4o-mini integration
   - 9 read-only function tools (get_user_signals, search_transactions, etc.)
   - Deterministic settings: `temperature=0`, `top_p=1`

6. **Operator** (`operator.ts`)
   - `GET /api/operator/dashboard` - System statistics
   - `GET /api/operator/review` - Flagged recommendations queue
   - `GET /api/operator/users` - User list
   - `GET /api/operator/user/:userId` - Detailed user profile
   - `POST /api/operator/recommendation/:id/hide` - Hide recommendation
   - `POST /api/operator/recommendation/:id/approve` - Approve recommendation
   - `POST /api/operator/user/:userId/persona-override` - Manual persona assignment
   - All actions logged in `OperatorAuditLog`

**Middleware:**
- `auth.middleware.ts` - JWT verification, attaches `userId`, `userRole`, `consentStatus`
- `consent.middleware.ts` - Blocks requests if `consentStatus=false`
- `errorHandler.middleware.ts` - Standardized error responses

**Critical Fixes:**
- Added CORS middleware for frontend-backend communication
- Case-insensitive email lookup for login
- JWT type assertions to fix TypeScript errors

### Phase 6: Frontend (`frontend/src/`)
**Pages Implemented:**

1. **LoginPage** (`pages/LoginPage.tsx`)
   - Login/Registration form
   - Shows demo credentials
   - **Fix:** Updated to show actual seeded emails

2. **DashboardPage** (`pages/DashboardPage.tsx`)
   - Displays recommendations
   - Shows alerts (credit utilization, savings warnings)
   - User actions: expand, dismiss, save

3. **InsightsPage** (`pages/InsightsPage.tsx`)
   - Financial snapshot
   - Spending patterns
   - Credit health
   - Savings progress
   - Income analysis

4. **LibraryPage** (`pages/LibraryPage.tsx`)
   - Browse all educational content
   - Filtering and search

5. **SettingsPage** (`pages/SettingsPage.tsx`)
   - Consent toggle
   - Account preferences
   - Dismissed items

6. **OperatorPage** (`pages/OperatorPage.tsx`)
   - System stats
   - Flagged recommendations queue
   - User list
   - Manual override controls

**Auth Context** (`lib/authContext.tsx`):
- Manages JWT token in localStorage
- Provides `login`, `register`, `logout` functions
- Protects routes with `ProtectedRoute` component

**API Client** (`lib/apiClient.ts`):
- Axios instance with base URL
- Request interceptor adds JWT token to headers
- Handles authentication automatically

### Phase 7: Guardrails (`backend/src/guardrails/`)
1. **Consent Manager** (`consentManager.ts`)
   - `checkConsent(userId)` - Returns consent status
   - `updateConsent(userId, status)` - Updates consent, clears recommendations on revoke

2. **Eligibility Checker** (`eligibilityChecker.ts`)
   - Rule-based evaluation: `field`, `operator` (>=, <=, ==, !=, >, <), `value`
   - Evaluates against user signals and account data
   - Returns `{passed: boolean, failedRules: []}`

3. **Tone Validator** (`toneValidator.ts`)
   - Blocklist validation (`toneBlocklist.ts` - 50+ prohibited phrases)
   - Optional LLM review (disabled by default)
   - Enforces supportive, non-shaming tone

### Phase 8: Evaluation Metrics (`backend/src/eval/`)
**4 Metrics Computed:**

1. **Coverage Metrics** (`coverageMetrics.ts`)
   - Users with assigned personas
   - Users with 3+ signal types detected
   - **Fix:** Improved logic for counting distinct signal types

2. **Explainability Metrics** (`explainabilityMetrics.ts`)
   - Recommendations with rationales (should be 100%)

3. **Latency Metrics** (`latencyMetrics.ts`)
   - API response time measurements

4. **Auditability Metrics** (`auditabilityMetrics.ts`)
   - Recommendations with complete decision traces

**Evaluation Harness** (`scripts/eval-harness.ts`):
- Computes all metrics
- Generates summary report
- Exports decision traces

---

## Critical Fixes & Issues Resolved

### TypeScript Errors
1. **JWT Sign Type Errors** (`auth.ts`, `users.ts`)
   - Added type assertions: `as object` and `as jwt.SignOptions`
   - Fixes coverage collection errors

2. **OpenAI Function Tools** (`chatService.ts`)
   - Changed `type: 'function'` to `type: 'function' as const`
   - Fixes literal type requirement

3. **Prisma Query** (`chatService.ts`)
   - Removed unsupported `mode: 'insensitive'` for SQLite
   - Implemented manual case-insensitive filtering

4. **Missing Exports** (`recommendations.ts`)
   - Added `export default router;`

### Database & Seeding Issues
1. **Variable Name Mismatch** (`seed.ts`)
   - Fixed `is_overdue` vs `isOverdue` in liability generation

2. **Variable Name Mismatch** (`incomeStabilityAnalyzer.ts`)
   - Fixed `income_variability` vs `incomeVariability` in return statement

3. **Path Resolution** (`seed.ts`)
   - Fixed content/offers loading paths from `process.cwd()` to `__dirname` relative paths
   - Content now loads: 6 items, Offers: 21 items

### CORS & Authentication
1. **CORS Configuration** (`server.ts`)
   - Added `cors` middleware
   - Allows `http://localhost:5173` origin
   - Enables credentials and required headers

2. **Case-Insensitive Login** (`auth.ts`)
   - SQLite doesn't support case-insensitive queries efficiently
   - Implemented fallback: exact match first, then manual case-insensitive search
   - Users can log in with any case variation of their email

### Test Fixes
1. **Eligibility Test Types** (`eligibility.test.ts`)
   - Added `EligibilityRule[]` type annotation

2. **Rationale Generator Test** (`rationaleGenerator.test.ts`)
   - Added `PrismaClient` import
   - Added missing `userId` parameter
   - Moved cleanup to `afterAll`

---

## Database Schema

**12 Tables:**
1. `User` - Authentication, consent, role
2. `Account` - Plaid-compatible account data
3. `Transaction` - Plaid-compatible transaction data
4. `Liability` - Credit card debt details
5. `Signal` - Behavioral signals (subscription, savings, credit, income)
6. `Persona` - Assigned personas with scores and ranks
7. `Content` - Educational articles
8. `Offer` - Partner offers
9. `Recommendation` - Personalized recommendations with rationales
10. `UserFeedback` - User actions on recommendations
11. `ChatMessage` - Chat conversation history
12. `OperatorAuditLog` - Operator actions for audit trail

**Key Relationships:**
- User → Accounts (1:many)
- Account → Transactions (1:many)
- Account → Liability (1:1, for credit cards)
- User → Signals (1:many, per window)
- User → Personas (1:many, per window)
- User → Recommendations (1:many)
- Recommendation → Content/Offer (many:1)

---

## Test Suite

**8 Test Files, 19 Tests - All Passing ✅**

1. `subscriptionDetector.test.ts` - 2 tests
2. `creditAnalyzer.test.ts` - 3 tests
3. `consent.test.ts` - 3 tests
4. `eligibility.test.ts` - 2 tests
5. `toneBlocklist.test.ts` - 3 tests
6. `rationaleGenerator.test.ts` - 2 tests
7. `metrics.test.ts` - 3 tests
8. `operator.test.ts` - 1 test

**Coverage:**
- Overall: 10.56% statements (expected - routes need integration tests)
- Guardrails: 55.35% (consent, eligibility, tone)
- Eval: 63.01% (metrics computation)
- Features: 9.31% (partial coverage)

**Run Tests:**
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

---

## Environment Setup

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### Environment Variables (`.env`)
```env
DATABASE_URL="file:./backend/spendsense.db"
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="24h"
DATA_SEED="1337"
USE_LLM_STUB="true"  # Set to false and provide OPENAI_API_KEY for chat
OPENAI_API_KEY=""    # Optional, for chat functionality
FRONTEND_URL="http://localhost:5173"
PORT=3000
```

### Initial Setup
```bash
# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Setup database
cd backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# Start development servers
cd ..
npm run dev
```

### Running the Application
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **API Docs:** http://localhost:3000 (root endpoint)
- **Health Check:** http://localhost:3000/health

---

## Demo Credentials

**Operator Account:**
- Email: `operator@spendsense.com`
- Password: `operator123`

**Regular Users:**
- Email: Any seeded email (case-insensitive)
- Examples: `kellen_effertz45@gmail.com`, `emmie.leannon@gmail.com`
- Password: `password123`

**Note:** All 100 seeded users have password `password123`. Email addresses are faker-generated with deterministic seed.

---

## API Endpoints Summary

**Authentication:**
- `POST /api/auth/login` - Login, returns JWT token

**User Management:**
- `POST /api/users` - Register new user

**Profile:**
- `POST /api/consent` - Update consent status
- `GET /api/profile/:userId` - Get user profile (signals, personas, accounts)

**Recommendations:**
- `GET /api/recommendations/:userId` - Get personalized recommendations
- `POST /api/feedback` - Record user action (dismiss, save, complete)

**Chat:**
- `POST /api/chat` - OpenAI chat with function calling

**Operator:**
- `GET /api/operator/dashboard` - System statistics
- `GET /api/operator/review` - Flagged recommendations
- `GET /api/operator/users` - User list
- `GET /api/operator/user/:userId` - Detailed user profile
- `POST /api/operator/recommendation/:id/hide` - Hide recommendation
- `POST /api/operator/recommendation/:id/approve` - Approve recommendation
- `POST /api/operator/user/:userId/persona-override` - Manual persona assignment

---

## Known Limitations & Future Improvements

### Current Limitations
1. **Content/Offers:** Only 6 content items and 21 offers loaded (PRD suggests 30 content items - 6 per persona)
2. **Chat:** Uses LLM stub by default (set `USE_LLM_STUB=false` and provide `OPENAI_API_KEY`)
3. **SQLite:** Case-insensitive email lookup uses inefficient fallback (fine for 100 users, needs optimization for scale)
4. **Test Coverage:** Routes and services need integration tests (currently 0% coverage)
5. **Prisma Client:** Each module creates its own instance (could use singleton pattern)

### Recommended Improvements
1. Add integration tests for API routes
2. Add E2E tests for critical user flows
3. Optimize email lookup (use COLLATE NOCASE in schema or normalize all emails to lowercase)
4. Add more content items (target 30 total - 6 per persona)
5. Implement singleton pattern for PrismaClient
6. Add request rate limiting
7. Add API request logging/monitoring
8. Implement caching for recommendations (regenerate on signal changes)

---

## Key Files Reference

### Backend Core
- `backend/src/server.ts` - Express app setup, CORS, route mounting
- `backend/prisma/schema.prisma` - Database schema (12 tables)
- `backend/prisma/seed.ts` - Synthetic data generator (100 users, 189K transactions)

### Signal Detection
- `backend/src/features/subscriptionDetector.ts`
- `backend/src/features/savingsAnalyzer.ts`
- `backend/src/features/creditAnalyzer.ts`
- `backend/src/features/incomeStabilityAnalyzer.ts`

### Personas & Recommendations
- `backend/src/personas/scoringEngine.ts` - Persona assignment logic
- `backend/src/personas/personaDefinitions.ts` - Persona criteria
- `backend/src/recommend/contentMatcher.ts` - Content matching
- `backend/src/recommend/offerMatcher.ts` - Offer matching
- `backend/src/recommend/rationaleGenerator.ts` - Template-based rationales
- `backend/src/recommend/agenticReview.ts` - Guardrail review

### Guardrails
- `backend/src/guardrails/consentManager.ts`
- `backend/src/guardrails/eligibilityChecker.ts`
- `backend/src/guardrails/toneValidator.ts` + `toneBlocklist.ts`

### Frontend Core
- `frontend/src/App.tsx` - Routing setup
- `frontend/src/lib/authContext.tsx` - Authentication state
- `frontend/src/lib/apiClient.ts` - Axios instance with JWT
- `frontend/src/pages/DashboardPage.tsx` - Main user dashboard

---

## Deployment Notes

### Vercel Deployment
- Backend uses `api/[...path].ts` catch-all route for serverless functions
- Routes detect `VERCEL=1` environment variable
- Local dev: routes prefixed with `/api`
- Vercel: routes come without `/api` prefix (handled by routing)

### Database Migration
- Development: SQLite (`file:./backend/spendsense.db`)
- Production: PostgreSQL (update `DATABASE_URL` in `.env`)
- Run `npx prisma migrate deploy` for production migrations

---

## Troubleshooting

### Login Fails for Regular Users
- **Solution:** Use case-insensitive email (any case variation works)
- Example: `KELLEN_EFFERTZ45@GMAIL.COM` or `kellen_effertz45@gmail.com`

### No Recommendations Showing
- **Check:** Run seed script to load content/offers and generate recommendations
- **Command:** `cd backend && npx prisma db seed`

### CORS Errors
- **Check:** `backend/src/server.ts` has CORS middleware configured
- **Verify:** `FRONTEND_URL` matches your frontend origin

### TypeScript Errors in Tests
- **Check:** All imports are correct
- **Verify:** Types match (e.g., `EligibilityRule[]` not plain arrays)

---

## Success Criteria Status

✅ **Phase 1:** Data generation complete (100 users, 189K transactions)
✅ **Phase 2:** Signal detection complete (4 signal types, 30d/180d windows)
✅ **Phase 3:** Persona assignment complete (5 personas, primary/secondary)
✅ **Phase 4:** Recommendation engine complete (content + offers, rationales)
✅ **Phase 5:** API & Frontend complete (all routes, React pages)
✅ **Phase 6:** Guardrails complete (consent, eligibility, tone)
✅ **Phase 7:** Operator view complete (dashboard, audit trail)
✅ **Phase 8:** Evaluation metrics complete (coverage, explainability, latency, auditability)

**Test Coverage:** 19 tests passing, 8 test suites
**Database:** Fully seeded and functional
**Application:** Running end-to-end

---

## Quick Start Commands

```bash
# Setup (first time)
npm install
cd backend && npm install && npx prisma generate && npx prisma migrate dev && npx prisma db seed
cd ../frontend && npm install

# Development
npm run dev                    # Start both frontend and backend
cd backend && npm run dev      # Backend only
cd frontend && npm run dev     # Frontend only

# Testing
npm test                       # Run tests
npm run test:watch            # Watch mode
npm run test:coverage         # Coverage report

# Database
npm run db:seed               # Re-seed database
npm run db:reset              # Reset and re-seed
```

---

**Last Updated:** November 2024
**Implementation Status:** ✅ Complete
**Next Steps:** Add integration tests, optimize for scale, add more content items

