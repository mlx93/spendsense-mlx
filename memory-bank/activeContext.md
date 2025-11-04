# Active Context - Recent Development

## Current Focus
✅ **All PRD requirements complete** - System is production-ready. Recent focus on dynamic article generation and compliance validation.

## Recent Changes (Post-Memory Bank Update)

### 1. Vercel Production Deployment Fixes
**Issue:** 405 Method Not Allowed errors on `/api/auth/login` in production
**Solution:**
- Updated `api/[...path].ts` to properly handle Vercel serverless function routing
- Strips `/api` prefix from URLs when present
- Routes are now always mounted at both `/auth` (Vercel) and `/api/auth` (local dev)
- Fixed CORS configuration to allow Vercel production domain

**Files Changed:**
- `api/[...path].ts` - Added path prefix stripping and proper handler
- `backend/src/server.ts` - Routes always mounted for both environments
- `frontend/src/lib/apiClient.ts` - Auto-detects production and uses relative URLs

### 2. Spending Patterns & Visualizations
**New Feature:** Complete spending analysis section on Insights page
- Added `/api/transactions` endpoint for spending pattern analysis
- Category breakdown pie chart (Recharts)
- Recurring vs one-time spending bar chart
- Category details table with percentages
- 30/180 day window toggle

**Files Added:**
- `backend/src/ui/routes/transactions.ts` - New spending patterns API
- Updated `frontend/src/pages/InsightsPage.tsx` - Added charts and spending section
- Installed `recharts` package

### 3. Calculator Improvements
**Subscription Audit Tool:**
- Now uses real `recurring_merchants` from subscription signal
- Fetches actual transaction amounts per merchant
- Calculates estimated monthly spend per subscription

**Debt Payoff Simulator:**
- Now uses real APR from liability data (`aprs` JSON field)
- Uses actual `minimum_payment_amount` from liability
- Profile API updated to include `apr` and `minimumPayment` fields

**All Calculators:**
- Added "Take Action" buttons linking to Library with topic filters
- Added collapsible "Show Formula" sections for transparency
- Formula details show calculation steps

**Files Changed:**
- `frontend/src/components/Calculators/SubscriptionAuditTool.tsx`
- `frontend/src/components/Calculators/DebtPayoffSimulator.tsx`
- `frontend/src/components/Calculators/EmergencyFundCalculator.tsx`
- `backend/src/ui/routes/profile.ts` - Added liability data to account response

### 4. Consent Modal
**New Feature:** Modal shown on first login for users without consent
- Explains what data is analyzed
- Privacy information
- "Allow" and "Skip" options
- Auto-loads dashboard after consent granted

**Files Added:**
- `frontend/src/components/ConsentModal.tsx`

**Files Changed:**
- `frontend/src/pages/DashboardPage.tsx` - Shows modal if `consentStatus === false`

### 5. Alert Enhancements
**New Feature:** "Learn more" links on alert banners
- Links to Library page filtered by topic
- Topic determined by alert content (credit, savings, budgeting)
- Improves user flow from alerts to educational content

**Files Changed:**
- `frontend/src/pages/DashboardPage.tsx` - Added links to alerts

### 6. Test Fixes
**Issue:** Rationale generator test failing after return type change
**Solution:** Updated test to expect `RationaleResult` object with `rationale` and `templateId` properties

**Files Changed:**
- `backend/tests/recommend/rationaleGenerator.test.ts`

### 7. Dynamic Article Generation (Latest)
**New Feature:** On-demand article generation with OpenAI
- User clicks "Learn More" → navigates to `/article/:recommendationId`
- Backend generates personalized 800-1200 word article using GPT-4o-mini
- Articles tailored to user's specific signals and recommendation context
- Function calling for compliance validation:
  - `validate_tone()` - Checks for prohibited phrases and shaming language
  - `check_financial_advice()` - Detects advice-giving language
  - `verify_disclaimer()` - Ensures required disclaimer present
- Iterative refinement (up to 3 attempts) until all checks pass
- Auto-appends disclaimer if missing
- Markdown rendering with ReactMarkdown

**Files Added:**
- `backend/src/services/articleGenerator.ts` - Article generation with compliance tools
- `backend/src/ui/routes/articles.ts` - API endpoint for article generation
- `frontend/src/pages/ArticlePage.tsx` - Article display page

**Files Changed:**
- `frontend/src/pages/DashboardPage.tsx` - Single "Learn More" link per recommendation
- `frontend/src/App.tsx` - Added article route
- `frontend/src/services/api.ts` - Added articlesApi

### 8. Rationale Personalization Improvements
**Enhancement:** Better variation in recommendation rationales
- Rationales now include content/offer titles for uniqueness
- Offer rationales fetch and mention specific offer details
- Category-specific templates (credit, savings, subscription offers)
- Card numbers display as 4-digit numbers (extracted from account IDs)

**Files Changed:**
- `backend/src/recommend/rationaleGenerator.ts` - Enhanced personalization logic

## Recent Major Changes (Latest Session)

### 1. Database Migration: SQLite → Supabase PostgreSQL
**Why:** SQLite doesn't work in Vercel's serverless environment (files don't persist, can't copy to runtime)

**Changes:**
- Updated `backend/prisma/schema.prisma` to use `provider = "postgresql"` instead of `sqlite`
- Created PostgreSQL migration: `backend/prisma/migrations/20251104032655_init_postgresql/`
- Set up Supabase integration in Vercel (provides managed PostgreSQL)
- Added Supabase environment variables:
  - `SUPABASE_POSTGRES_URL` (pooled, port 6543 - for runtime queries)
  - `SUPABASE_POSTGRES_URL_NON_POOLING` (direct, port 5432 - for migrations/seeding)
  - `DATABASE_URL` set to `${SUPABASE_POSTGRES_PRISMA_URL}` in Vercel
- Created `backend/.env` for local development (also uses Supabase)

**Benefits:**
- ✅ Persistent data across deployments
- ✅ Same database in dev and prod (currently shared)
- ✅ Handles 200k+ transactions reliably
- ✅ Free tier: 500 MB storage, unlimited compute

**Files Changed:**
- `backend/prisma/schema.prisma` - Changed provider to postgresql
- `backend/prisma/migrations/` - Added PostgreSQL migration
- `build.sh` - Updated to use `prisma migrate deploy` and smart seeding
- `backend/.env` - Added for local Supabase connection
- `.gitignore` - Removed migrations/ exclusion (migrations should be tracked)

### 2. Build Script Improvements
**Smart Seeding:**
- Build script now checks if database is empty before seeding
- Only seeds on first deployment (when User table is empty)
- Subsequent deployments skip seeding (faster builds, preserves data)
- Uses non-pooling connection for migrations (port 5432) to avoid timeout issues

**Files Changed:**
- `build.sh` - Added USER_COUNT check, uses non-pooling connection for migrations

### 3. Login Page & Example Users Endpoint
**New Feature:** Dynamic example user emails on login page
- Created `/api/auth/example-users` endpoint
- Returns 5 seeded user emails + operator credentials
- Frontend fetches and displays real user emails dynamically
- Eliminates hardcoded demo credentials

**Vercel Routing Fixes:**
- Created explicit serverless functions for nested API routes:
  - `api/auth/example-users.ts` - Standalone function for example users
  - `api/auth/login.ts` - Routes to Express app
- These fix 404 errors for nested `/api/auth/*` paths in Vercel

**Files Added:**
- `api/auth/example-users.ts` - Vercel serverless function
- `api/auth/login.ts` - Vercel serverless function
- `api/tsconfig.json` - TypeScript config for api/ directory

**Files Changed:**
- `backend/src/ui/routes/auth.ts` - Added GET `/example-users` endpoint
- `frontend/src/pages/LoginPage.tsx` - Fetches and displays dynamic example users
- `vercel.json` - Updated build command, removed conflicting routes

### 4. Deployment Configuration
**Fixed Issues:**
- ✅ Removed `routes` config from `vercel.json` (conflicted with `rewrites`)
- ✅ Updated build command to use `bash build.sh` (under 256 char limit)
- ✅ Fixed TypeScript errors in `api/` directory
- ✅ Fixed unused variable in `ArticlePage.tsx`

**Current Build Process:**
1. Generate Prisma Client (root and backend)
2. Run migrations using non-pooling connection
3. Check if database is empty (smart seeding)
4. Seed if empty (first deployment only)
5. Build frontend

## Recent Changes (Last 3 Commits - Nov 2025)

### 1. Database Connection & Environment Setup
**Issue:** Backend couldn't connect to Supabase database in local dev
**Solution:**
- Fixed `.env` file to use correct Supabase connection (port 6543 pooled connection)
- Created `backend/fix-env.sh` script to automate DATABASE_URL fixes
- Added `pgbouncer=true` parameter for pooled connections
- Changed connection from `postgres://` to `postgresql://` protocol

**Files Added:**
- `backend/fix-env.sh` - Script to fix DATABASE_URL configuration
- `backend/.env.backup` - Backup of original .env

**Files Changed:**
- `backend/.env` - Updated to use port 6543 with pgbouncer

### 2. Hardcoded Example Users with Personas
**Feature:** Login page now displays 5 example users with their persona types
**Implementation:**
- Created hardcoded mapping based on seed 1337 (deterministic emails)
- One user per persona type: high_utilization, variable_income, subscription_heavy, savings_builder, net_worth_maximizer
- Personas displayed on login page without needing to calculate them
- Users must exist in database, but personas are "remembered" from seed

**Files Added:**
- `backend/src/utils/exampleUsersMapping.ts` - Hardcoded email → persona mapping
- `reset_consent.sql` - SQL script to reset all user consent to false

**Files Changed:**
- `backend/src/ui/routes/auth.ts` - Uses hardcoded mapping instead of querying personas
- `frontend/src/pages/LoginPage.tsx` - Displays users with color-coded persona badges

**Example Users (Seed 1337):**
- `Kellen_Effertz45@gmail.com` → high_utilization
- `Carrie87@hotmail.com` → variable_income
- `Jaiden.Heidenreich@gmail.com` → subscription_heavy
- `Lenna_Stiedemann73@hotmail.com` → savings_builder
- `Aimee_Oberbrunner@gmail.com` → net_worth_maximizer

### 3. User Data Seeding for New Users
**Feature:** New users automatically get fake transaction data
**Implementation:**
- `seedUserData()` function creates accounts, transactions, and liabilities
- Runs asynchronously after user registration (doesn't block registration)
- Consent endpoint waits up to 5 seconds for seeding to complete before generating insights
- Ensures new users have data to analyze when they consent

**Files Added:**
- `backend/src/utils/seedUserData.ts` - Generates fake accounts, transactions, liabilities

**Files Changed:**
- `backend/src/ui/routes/users.ts` - Calls `seedUserData()` after user creation
- `backend/src/ui/routes/profile.ts` - Waits for accounts before generating data on consent

### 4. Consent Modal & Data Generation Flow
**Feature:** Modal blocks dashboard access until user consents
**Implementation:**
- Consent modal appears immediately after login if `consentStatus === false`
- Modal shows progress bar during data generation (happens synchronously on consent)
- After consent, `generateUserData()` runs synchronously before returning response
- Dashboard only loads after consent is granted and data is generated

**Files Changed:**
- `frontend/src/components/ConsentModal.tsx`:
  - Added progress bar with status messages
  - Fixed button sizing (added `min-width` to prevent resizing)
  - Button text stays "Enabling..." instead of showing status
  - Handles both "Allow" and "Skip" actions
- `frontend/src/App.tsx`:
  - `ProtectedRoute` explicitly renders `ConsentModal` when consent is false
  - Blocks children rendering until consent is handled
- `backend/src/ui/routes/profile.ts`:
  - `/consent` endpoint now `await`s `generateUserData()` when consent granted
  - Added retry loop to wait for accounts if user just registered
  - Returns new JWT token with updated consent status

### 5. Dashboard Loading & Progress Bar Improvements
**Feature:** Better UX during initial dashboard load
**Implementation:**
- Progress bar now updates dynamically based on actual API call progress
- Prevents hanging at 95% - progress increases gradually up to 90% while waiting
- Status messages rotate while waiting for API responses
- Fixed "Cannot read properties of undefined (reading 'signals')" error
- Improved error handling with toast notifications

**Files Changed:**
- `frontend/src/pages/DashboardPage.tsx`:
  - `loadDataWithProgress()` uses intervals to update progress dynamically
  - Fixed signal access errors (changed `profileResponse.data.signals` to `profile.signals`)
  - Added `useCallback` to prevent initialization errors
  - Moved function definition before `useEffect` to fix reference errors
  - Better error handling with toast notifications
  - Ensures loading state is properly cleared

**Files Added:**
- `frontend/src/utils/toast.tsx` - Toast notification system for user feedback

### 6. Operator Dashboard Enhancements
**Feature:** Operator can reset all user consent
**Implementation:**
- Added `POST /api/operator/reset-consent` endpoint
- Sets all users' `consent_status` to `false` and `consent_date` to `null`
- Useful for demos and testing consent flow

**Files Changed:**
- `backend/src/ui/routes/operator.ts` - Added reset consent endpoint
- `frontend/src/pages/OperatorPage.tsx` - Added "Reset All User Consent" button

### 7. Build Process Improvements
**Enhancement:** Migrations now optional during build
**Implementation:**
- Migrations skipped by default (dev and prod share database)
- Can enable with `RUN_MIGRATIONS_IN_BUILD=true` environment variable
- Build script uses `set +e` to allow graceful failures
- Prioritizes pooled connection for seeding, falls back to non-pooling

**Files Changed:**
- `build.sh` - Made migrations optional, improved error handling

## Next Steps
1. ✅ Database migration to Supabase complete
2. ✅ Login and example users endpoint working
3. ✅ Example users display with personas on login page
4. ✅ Consent modal and data generation flow working
5. ⏳ Monitor progress bar performance - should now be smoother

## Known Issues Resolved
- ✅ Vercel 405 errors on login routes
- ✅ SQLite persistence issues in serverless environment
- ✅ Nested API routes returning 404 (fixed with explicit serverless functions)
- ✅ Build command exceeding 256 character limit
- ✅ TypeScript errors in api/ directory
- ✅ Database seeding on every deployment (now smart - only if empty)
- ✅ Migration timeouts (now uses non-pooling connection)
- ✅ Calculator data using mock instead of real data
- ✅ Missing spending patterns visualization
- ✅ Missing consent modal on first login
- ✅ Missing calculator action buttons
- ✅ Missing formula transparency
- ✅ Duplicate rationale text across users
- ✅ Card numbers showing letters instead of digits
- ✅ All remaining PRD gaps

