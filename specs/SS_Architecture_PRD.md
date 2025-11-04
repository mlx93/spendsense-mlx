# SpendSense - Architecture PRD

**Version:** 1.0  
**Date:** November 3, 2025  
**Project:** SpendSense

---

## Executive Summary

This document defines the technical architecture for SpendSense, including system design, database schema, API specifications, AI integration strategy, and implementation roadmap. The architecture prioritizes explainability, auditability, and rapid development for a 2-day sprint.

### Technology Stack

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS
- Vite (build tool)
- React Router v6
- Axios (API client)
- Zustand (state management - lightweight)

**Backend:**
- Node.js 20+ with TypeScript
- Express.js (REST API framework)
- Prisma ORM (type-safe database access)
- ~~SQLite (development database)~~ **→ Supabase PostgreSQL (managed database)**
- date-fns (date manipulation)
- Zod (runtime validation)

**Database:**
- ~~SQLite (file-based, easy setup)~~ **→ Supabase PostgreSQL (managed, persistent)**
- Schema designed for PostgreSQL migration ✅ **Migration completed November 2024**

**Authentication:**
- JWT tokens (jsonwebtoken)
- bcrypt (password hashing)
- No Google OAuth (financial data privacy - don't share with external providers)

**AI Integration:**
- OpenAI GPT-4o-mini (chat with function calling)
- OpenAI SDK for Node.js

**Testing:**
- Jest (unit and integration tests)
- Supertest (API testing)

---

## System Architecture

### 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (React)                   │
│  - Dashboard, Insights, Library, Settings, Chat    │
│  - Calculators (Emergency Fund, Debt, Subs)        │
└─────────────────┬───────────────────────────────────┘
                  │ HTTPS/JSON
                  │ REST API calls
                  ▼
┌─────────────────────────────────────────────────────┐
│              Backend (Express + TypeScript)          │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │          API Routes Layer                    │  │
│  │  /users, /consent, /profile, /recommendations│  │
│  └──────────────────┬───────────────────────────┘  │
│                     │                               │
│  ┌──────────────────▼───────────────────────────┐  │
│  │          Services Layer                      │  │
│  │  - Signal Detection Service                  │  │
│  │  - Persona Assignment Service                │  │
│  │  - Recommendation Engine Service             │  │
│  │  - Eligibility Service                       │  │
│  │  - Guardrails Service                        │  │
│  │  - Chat Service (OpenAI function calling)    │  │
│  └──────────────────┬───────────────────────────┘  │
│                     │                               │
│  ┌──────────────────▼───────────────────────────┐  │
│  │          Data Access Layer (Prisma)          │  │
│  │  - Users, Accounts, Transactions, Signals    │  │
│  │  - Personas, Recommendations, Content        │  │
│  └──────────────────┬───────────────────────────┘  │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ ~~SQLite Database~~   │
          │ ~~(spendsense.db)~~   │
          │                      │
          │  ✅ Supabase         │
          │  PostgreSQL          │
          │  (Managed, Persistent)│
          └──────────────────────┘

External:
┌──────────────────┐
│  OpenAI API      │
│  (Chat GPT-4o)   │
└──────────────────┘
```

### 2. Monolith Structure

**Project Directory (Matches Spec Requirements):**
```
spendsense/
├── backend/
│   ├── src/
│   │   ├── ingest/          # Data loading and validation (per spec)
│   │   │   ├── csvLoader.ts
│   │   │   ├── jsonLoader.ts
│   │   │   ├── plaidValidator.ts
│   │   │   └── index.ts
│   │   ├── features/        # Signal detection and feature engineering (per spec)
│   │   │   ├── subscriptionDetector.ts
│   │   │   ├── savingsAnalyzer.ts
│   │   │   ├── creditAnalyzer.ts
│   │   │   ├── incomeStabilityAnalyzer.ts
│   │   │   └── index.ts
│   │   ├── personas/        # Persona assignment logic (per spec)
│   │   │   ├── scoringEngine.ts
│   │   │   ├── personaDefinitions.ts
│   │   │   └── index.ts
│   │   ├── recommend/       # Recommendation engine (per spec)
│   │   │   ├── contentMatcher.ts
│   │   │   ├── offerMatcher.ts
│   │   │   ├── rationaleGenerator.ts
│   │   │   ├── agenticReview.ts
│   │   │   └── index.ts
│   │   ├── guardrails/      # Consent, eligibility, tone checks (per spec)
│   │   │   ├── consentManager.ts
│   │   │   ├── eligibilityChecker.ts
│   │   │   ├── toneValidator.ts
│   │   │   ├── toneBlocklist.ts
│   │   │   └── index.ts
│   │   ├── ui/              # API routes and operator view (per spec)
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── profile.ts
│   │   │   │   ├── recommendations.ts
│   │   │   │   ├── chat.ts
│   │   │   │   └── operator.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── consent.middleware.ts
│   │   │   │   └── errorHandler.middleware.ts
│   │   │   └── index.ts
│   │   ├── eval/            # Evaluation harness (per spec)
│   │   │   ├── coverageMetrics.ts
│   │   │   ├── explainabilityMetrics.ts
│   │   │   ├── latencyMetrics.ts
│   │   │   ├── auditabilityMetrics.ts
│   │   │   └── index.ts
│   │   ├── docs/            # Decision log and schema documentation (per spec)
│   │   │   ├── DECISIONS.md
│   │   │   ├── SCHEMA.md
│   │   │   └── LIMITATIONS.md
│   │   ├── shared/          # Shared utilities and types
│   │   │   ├── types.ts
│   │   │   ├── dateUtils.ts
│   │   │   └── constants.ts
│   │   └── server.ts        # Express app entry point
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   ├── seed.ts          # Synthetic data generator
│   │   └── migrations/
│   └── tests/               # Unit and integration tests
│       ├── features/
│       ├── personas/
│       ├── recommend/
│       └── guardrails/
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Dashboard/
│   │   │   ├── Chat/
│   │   │   ├── Calculators/
│   │   │   ├── Operator/    # Operator/Admin components
│   │   │   └── common/
│   │   ├── pages/           # Page-level components
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── InsightsPage.tsx
│   │   │   ├── LibraryPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   └── OperatorPage.tsx    # Admin dashboard
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # API client, utilities
│   │   │   ├── apiClient.ts
│   │   │   └── authContext.tsx
│   │   ├── styles/
│   │   └── App.tsx
│   └── public/
├── content/                 # Educational content (markdown)
│   ├── high-utilization/
│   ├── variable-income/
│   ├── subscription-heavy/
│   ├── savings-builder/
│   └── net-worth-maximizer/
├── data/
│   ├── offers/              # Partner offer JSON files
│   ├── synthetic-users/     # Generated user data (CSV/JSON/Parquet)
│   └── analytics/           # (optional) Parquet files for offline analytics
├── package.json
├── tsconfig.json
├── vercel.json              # Vercel deployment config
└── README.md
```

### 3. Key Architectural Decisions

**Monolith vs. Microservices:**
- **Choice:** Monolith with modular services
- **Rationale:** Simpler for 2-day sprint, easier to debug, single deployment

**TypeScript Full-Stack:**
- **Choice:** TypeScript for both frontend and backend
- **Rationale:** Type safety, shared types, single language, better DX

**Prisma ORM:**
- **Choice:** Prisma over raw SQL or other ORMs
- **Rationale:** Type-safe queries, auto-generated types, easy migrations, excellent TypeScript support

**Database Selection:**
- ~~**SQLite for Development:**~~ **→ Migrated to Supabase PostgreSQL**
- ~~**Choice:** SQLite over PostgreSQL initially~~
- ~~**Rationale:** Zero setup, file-based, fast for demos, Prisma makes PostgreSQL migration trivial~~

**✅ Current: Supabase PostgreSQL**
- **Choice:** Supabase managed PostgreSQL for both dev and production
- **Rationale:** 
  - SQLite doesn't work in Vercel serverless (files don't persist, can't copy to runtime)
  - Supabase provides persistent, scalable database with generous free tier (500 MB storage, unlimited compute)
  - Same database in dev and prod ensures consistency
  - Handles 200k+ transactions reliably
  - Prisma migration was seamless (same schema, just changed provider)

**REST API over GraphQL:**
- **Choice:** REST
- **Rationale:** Simpler, faster to build, adequate for 6 endpoints

**OpenAI for Chat:**
- **Choice:** GPT-4o-mini with function calling
- **Rationale:** Native function calling support, cost-effective, reliable, well-documented

---

## Database Schema

### 1. Schema Design Principles
- Normalize data to avoid redundancy
- Use foreign keys for referential integrity
- Index frequently queried fields
- Store JSON for complex structures (signals, eligibility rules)
- Keep decision traces for auditability

### 2. Core Tables - Plaid-Compatible Schema

**Critical:** All field names match Plaid's API specification exactly as defined in the PDF requirements.

#### **users**
User accounts and authentication (SpendSense-specific, not Plaid)

```
Table: users
Fields:
  - id: String (UUID, primary key)
  - email: String (unique, indexed)
  - password_hash: String (bcrypt hashed password)
  - consent_status: Boolean (default false)
  - consent_date: DateTime (nullable)
  - role: String (enum: 'user', 'operator', default 'user')
  - created_at: DateTime (auto)
  - updated_at: DateTime (auto)

Relationships:
  - One to many: accounts
  - One to many: signals
  - One to many: personas
  - One to many: recommendations
  - One to many: chat_messages
  - One to many: user_feedback
```

#### **accounts**
Plaid Accounts structure - EXACTLY as specified in PDF

```
Table: accounts
Fields (REQUIRED per PDF):
  - account_id: String (Plaid account identifier, primary key)
  - user_id: String (foreign key to users.id) [SpendSense addition]
  - type: String (checking, savings, credit_card, money_market, hsa)
  - subtype: String (nullable, additional account classification)
  - balance_available: Decimal (nullable, funds available for use)
  - balance_current: Decimal (total current balance)
  - balance_limit: Decimal (nullable, credit limit for credit cards)
  - iso_currency_code: String (default 'USD')
  - holder_category: String (default 'personal', exclude 'business')
  - created_at: DateTime (auto) [SpendSense addition]
  - updated_at: DateTime (auto) [SpendSense addition]

Field Constraints:
  - type: Must be one of: checking, savings, credit_card, money_market, hsa
  - holder_category: Must be 'personal' (business accounts excluded)
  - balance_limit: Required when type = 'credit_card', null otherwise

Relationships:
  - Many to one: user
  - One to many: transactions
  - One to one: liability (optional, for credit cards/loans)

Indexes:
  - user_id (for efficient user account lookup)
  - type (for filtering by account type)
```

#### **transactions**
Plaid Transactions structure - EXACTLY as specified in PDF

```
Table: transactions
Fields (REQUIRED per PDF):
  - transaction_id: String (Plaid transaction identifier, primary key)
  - account_id: String (foreign key to accounts.account_id)
  - date: Date (transaction date)
  - amount: Decimal (transaction amount)
  - merchant_name: String (nullable, merchant display name)
  - merchant_entity_id: String (nullable, standardized merchant ID)
  - payment_channel: String (online, in_store, other)
  - personal_finance_category_primary: String (top-level category)
  - personal_finance_category_detailed: String (detailed subcategory)
  - pending: Boolean (transaction pending status)
  - created_at: DateTime (auto) [SpendSense addition]

Field Constraints:
  - amount: Negative for debits (spending), positive for credits (income/refunds)
  - merchant_name OR merchant_entity_id: At least one must be present
  - payment_channel: Must be one of: online, in_store, other
  - personal_finance_category: Use Plaid's category taxonomy

Category Examples:
  - Primary: FOOD_AND_DRINK, TRANSPORTATION, ENTERTAINMENT, INCOME
  - Detailed: FOOD_AND_DRINK.RESTAURANTS, INCOME.PAYROLL, etc.

Relationships:
  - Many to one: account

Indexes:
  - account_id, date (for time-series queries)
  - merchant_name (for recurring transaction detection)
  - personal_finance_category_primary (for spending analysis)
  - date (for windowed signal detection)
```

#### **liabilities**
Plaid Liabilities structure - EXACTLY as specified in PDF

```
Table: liabilities
Fields:
  - id: String (UUID, primary key) [SpendSense addition]
  - account_id: String (foreign key to accounts.account_id, unique)
  - liability_type: String (credit_card, mortgage, student_loan)
  
  --- Credit Card Fields (REQUIRED per PDF when liability_type = 'credit_card') ---
  - aprs: JSON (array of APR objects with type and percentage)
    Structure: [
      {"apr_type": "purchase_apr", "apr_percentage": 18.99},
      {"apr_type": "cash_advance_apr", "apr_percentage": 24.99}
    ]
  - minimum_payment_amount: Decimal (minimum payment due)
  - last_payment_amount: Decimal (amount of last payment made)
  - is_overdue: Boolean (overdue payment status)
  - next_payment_due_date: Date (next payment due date)
  - last_statement_balance: Decimal (balance on last statement)
  
  --- Mortgage/Student Loan Fields (REQUIRED per PDF when liability_type = 'mortgage' or 'student_loan') ---
  - interest_rate: Decimal (annual interest rate percentage)
  - next_payment_due_date: Date (next payment due date)
  
  - created_at: DateTime (auto) [SpendSense addition]
  - updated_at: DateTime (auto) [SpendSense addition]

Field Constraints:
  - Credit card accounts MUST have: aprs, minimum_payment_amount, last_payment_amount, 
    is_overdue, next_payment_due_date, last_statement_balance
  - Mortgage/Student loan accounts MUST have: interest_rate, next_payment_due_date
  - aprs stored as JSON array to support multiple APR types (purchase, cash advance, balance transfer)

APR Type Examples:
  - purchase_apr: Standard purchase rate
  - cash_advance_apr: Cash advance rate
  - balance_transfer_apr: Balance transfer rate
  - penalty_apr: Penalty rate for late payments

Relationships:
  - One to one: account

Indexes:
  - account_id (unique constraint)
  - is_overdue (for alert detection)
```

#### **signals**
Computed behavioral signals per user per time window

```
Table: signals
Fields:
  - id: String (UUID, primary key)
  - user_id: String (foreign key to users.id)
  - signal_type: String (subscription, savings, credit, income)
  - window_days: Integer (30 or 180)
  - data: JSON (signal-specific metrics)
    Example for credit: {
      "max_utilization": 0.68,
      "avg_utilization": 0.45,
      "utilization_flag": "high",
      "interest_charges": 87,
      "minimum_payment_only": true,
      "any_overdue": false
    }
  - computed_at: DateTime (auto)

Relationships:
  - Many to one: user

Indexes:
  - user_id, signal_type, window_days (for efficient lookup)
```

#### **personas**
User's persona assignments with scores

```
Table: personas
Fields:
  - id: String (UUID, primary key)
  - user_id: String (foreign key to users.id)
  - persona_type: String (high_utilization, variable_income, subscription_heavy, savings_builder, net_worth_maximizer)
  - score: Decimal (0.0 to 1.0)
  - rank: Integer (1 = primary, 2 = secondary)
  - window_days: Integer (30 or 180)
  - criteria_met: JSON (list of criteria that qualified user)
  - computed_at: DateTime (auto)

Relationships:
  - Many to one: user

Indexes:
  - user_id, rank (to get primary/secondary personas)
```

#### **content**
Educational content library

```
Table: content
Fields:
  - id: String (UUID, primary key)
  - title: String
  - source: String (NerdWallet, Investopedia, etc.)
  - url: String (external link)
  - excerpt: Text (short preview)
  - markdown_content: Text (cached full content, nullable)
  - tags: JSON (array of strings)
  - persona_fit: JSON (array of persona types)
    Example: ["high_utilization", "savings_builder"]
  - signals: JSON (array of signal types this content matches)
  - created_at: DateTime (auto)
  - updated_at: DateTime (auto)

Relationships:
  - Many to many: recommendations (through recommendation_content junction)

Indexes:
  - tags (for filtering)
```

#### **offers**
Partner product/service offers

```
Table: offers
Fields:
  - id: String (UUID, primary key)
  - title: String
  - description: Text
  - category: String (credit_card, savings_account, budgeting_app, etc.)
  - eligibility_rules: JSON (array of rule objects)
    Example: [
      {"field": "max_utilization", "operator": ">=", "value": 0.5},
      {"field": "annual_income", "operator": ">=", "value": 40000}
    ]
  - required_signals: JSON (array of signal types)
  - exclude_if_has_account: JSON (array of account types)
  - persona_fit: JSON (array of persona types)
  - url: String (partner link)
  - created_at: DateTime (auto)
  - updated_at: DateTime (auto)

Relationships:
  - Many to many: recommendations (through recommendation_offers junction)
```

#### **recommendations**
Generated recommendations for users

```
Table: recommendations
Fields:
  - id: String (UUID, primary key)
  - user_id: String (foreign key to users.id)
  - type: String (education, offer)
  - content_id: String (foreign key to content.id, nullable)
  - offer_id: String (foreign key to offers.id, nullable)
  - rationale: Text (generated explanation)
  - persona_type: String (persona that triggered this rec)
  - signals_used: JSON (array of signals that matched)
  - decision_trace: JSON (audit log of why this was chosen)
    Example: {
      "signals_snapshot": { /* key signal values */ },
      "persona_scores": { "primary": {"type":"high_utilization","score":0.85}, "secondary": {"type":"subscription_heavy","score":0.62} },
      "rule_path": ["content_filter:persona_fit", "content_filter:signal_overlap", "eligibility:utilization>=0.5"],
      "eligibility_results": { "passed": true, "failed_rules": [] },
      "rationale_template_id": "credit_utilization_v1",
      "generated_at": "ISO-8601 timestamp"
    }
  - status: String (active, dismissed, completed, saved)
  - agentic_review_status: String (approved, flagged)
  - agentic_review_reason: Text (nullable)
  - created_at: DateTime (auto)
  - updated_at: DateTime (auto)

Relationships:
  - Many to one: user
  - Many to one: content (nullable)
  - Many to one: offer (nullable)

Indexes:
  - user_id, status (for getting active recommendations)
```

#### **user_feedback**
User actions on recommendations

```
Table: user_feedback
Fields:
  - id: String (UUID, primary key)
  - user_id: String (foreign key to users.id)
  - recommendation_id: String (foreign key to recommendations.id)
  - action: String (dismissed, completed, saved, clicked)
  - timestamp: DateTime (auto)

Relationships:
  - Many to one: user
  - Many to one: recommendation
```

#### **chat_messages**
Chat conversation history

```
Table: chat_messages
Fields:
  - id: String (UUID, primary key)
  - user_id: String (foreign key to users.id)
  - role: String (user, assistant, system)
  - content: Text
  - function_call: JSON (nullable, if assistant called a function)
  - function_result: JSON (nullable, result of function call)
  - timestamp: DateTime (auto)

Relationships:
  - Many to one: user

Indexes:
  - user_id, timestamp (for retrieving conversation history)

Retention:
  - Delete messages older than 30 days (scheduled job)
```

### 3. Example Data Records (Plaid Format)

To ensure perfect Plaid compatibility, here are example records showing exact field structure:

#### Example Account Record (Credit Card)
```json
{
  "account_id": "acc_9xKjP8vQw2T5",
  "user_id": "user-uuid-123",
  "type": "credit_card",
  "subtype": "rewards",
  "balance_available": 1600.00,
  "balance_current": 3400.00,
  "balance_limit": 5000.00,
  "iso_currency_code": "USD",
  "holder_category": "personal"
}
```

#### Example Account Record (Checking)
```json
{
  "account_id": "acc_4mNp2LrTq8X3",
  "user_id": "user-uuid-123",
  "type": "checking",
  "subtype": "standard",
  "balance_available": 2150.00,
  "balance_current": 2150.00,
  "balance_limit": null,
  "iso_currency_code": "USD",
  "holder_category": "personal"
}
```

#### Example Transaction Record (Debit/Spending)
```json
{
  "transaction_id": "txn_7pQr3WsYv5N2",
  "account_id": "acc_9xKjP8vQw2T5",
  "date": "2025-10-15",
  "amount": -127.43,
  "merchant_name": "Whole Foods Market",
  "merchant_entity_id": "merchant_wholefoodsmarket_12345",
  "payment_channel": "in_store",
  "personal_finance_category_primary": "FOOD_AND_DRINK",
  "personal_finance_category_detailed": "FOOD_AND_DRINK.GROCERIES",
  "pending": false
}
```

#### Example Transaction Record (Credit/Income)
```json
{
  "transaction_id": "txn_2kLm9XtZr4P8",
  "account_id": "acc_4mNp2LrTq8X3",
  "date": "2025-11-01",
  "amount": 2847.00,
  "merchant_name": "Acme Corp Payroll",
  "merchant_entity_id": null,
  "payment_channel": "other",
  "personal_finance_category_primary": "INCOME",
  "personal_finance_category_detailed": "INCOME.PAYROLL",
  "pending": false
}
```

#### Example Transaction Record (Recurring Subscription)
```json
{
  "transaction_id": "txn_5vNp1QsXw8M7",
  "account_id": "acc_9xKjP8vQw2T5",
  "date": "2025-10-15",
  "amount": -15.99,
  "merchant_name": "Netflix",
  "merchant_entity_id": "merchant_netflix_001",
  "payment_channel": "online",
  "personal_finance_category_primary": "ENTERTAINMENT",
  "personal_finance_category_detailed": "ENTERTAINMENT.STREAMING",
  "pending": false
}
```

#### Example Liability Record (Credit Card)
```json
{
  "id": "liab-uuid-789",
  "account_id": "acc_9xKjP8vQw2T5",
  "liability_type": "credit_card",
  "aprs": [
    {
      "apr_type": "purchase_apr",
      "apr_percentage": 18.99
    },
    {
      "apr_type": "cash_advance_apr",
      "apr_percentage": 24.99
    },
    {
      "apr_type": "balance_transfer_apr",
      "apr_percentage": 0.00
    }
  ],
  "minimum_payment_amount": 85.00,
  "last_payment_amount": 85.00,
  "is_overdue": false,
  "next_payment_due_date": "2025-11-25",
  "last_statement_balance": 3200.00,
  "interest_rate": null
}
```

#### Example Liability Record (Student Loan)
```json
{
  "id": "liab-uuid-456",
  "account_id": "acc_8jKp5VrMz3Q2",
  "liability_type": "student_loan",
  "aprs": null,
  "minimum_payment_amount": null,
  "last_payment_amount": null,
  "is_overdue": null,
  "next_payment_due_date": "2025-12-01",
  "last_statement_balance": null,
  "interest_rate": 5.25
}
```

**Field Validation Rules:**

**Accounts:**
- ✓ `type` must be: checking, savings, credit_card, money_market, or hsa
- ✓ `balance_limit` required when type = credit_card, null otherwise
- ✓ `holder_category` must be "personal" (business excluded)

**Transactions:**
- ✓ `amount` negative for spending, positive for income
- ✓ At least one of `merchant_name` or `merchant_entity_id` required
- ✓ `payment_channel` must be: online, in_store, or other
- ✓ `personal_finance_category_primary` and `personal_finance_category_detailed` must use Plaid taxonomy

**Liabilities:**
- ✓ Credit card must have: aprs, minimum_payment_amount, last_payment_amount, is_overdue, next_payment_due_date, last_statement_balance
- ✓ Mortgage/Student loan must have: interest_rate, next_payment_due_date
- ✓ `aprs` must be JSON array with objects containing apr_type and apr_percentage

### 5. Schema Migration Strategy

**Initial Setup:**
```
Prisma commands:
  npx prisma init
  npx prisma migrate dev --name init
  npx prisma generate
```

**Seeding Synthetic Data:**
```
Prisma seed script (prisma/seed.ts):

Phase 1: Generate Users (100 total)
  - Create 100 synthetic users
  - Distribution: 20 per persona type
  - Use fake names (no real PII): faker.js library
  - Masked account numbers format: "Visa ending in 4523"
  - Diverse financial situations:
    - Income: $30K to $200K annual (varied distribution)
    - Credit behaviors: 0% to 95% utilization across spectrum
    - Savings patterns: $0 to $50K+ in savings accounts

Phase 2: Generate Accounts (1-4 per user, ~250 total accounts)
  MUST include all REQUIRED Plaid fields:
  - account_id: Generate Plaid-style IDs (e.g., "acc_" + random)
  - type: Distribute across checking, savings, credit_card, money_market, hsa
  - subtype: Account-specific (e.g., "credit_card" -> "rewards", "checking" -> "standard")
  - balance_available: Current available balance
  - balance_current: Total current balance (may differ from available)
  - balance_limit: Credit limit (REQUIRED for credit_card type, null for others)
  - iso_currency_code: "USD" for all
  - holder_category: "personal" for all (exclude business)
  
  Account Distribution per User (varies by persona):
  - Persona 1 (High Utilization): 1 checking + 2-3 credit cards (high balances)
  - Persona 2 (Variable Income): 1 checking + 1 savings (low balances)
  - Persona 3 (Subscription-Heavy): 1 checking + 1 credit card + 1 savings
  - Persona 4 (Savings Builder): 1 checking + 1-2 savings + 1 credit card (low util)
  - Persona 5 (Net Worth Maximizer): 1 checking + 2 savings/money market + 1 credit card (paid off)

Phase 3: Generate Transactions (2 years history, ~50K total transactions)
  MUST include all REQUIRED Plaid fields:
  - transaction_id: Generate Plaid-style IDs (e.g., "txn_" + random)
  - account_id: Link to accounts
  - date: Distribute across 2-year window (2023-11-03 to 2025-11-03)
  - amount: Negative for debits/spending, positive for credits/income
  - merchant_name OR merchant_entity_id: Use merchant_name for readability
  - payment_channel: Distribute across "online" (40%), "in_store" (50%), "other" (10%)
  - personal_finance_category_primary: Use Plaid taxonomy
  - personal_finance_category_detailed: Use Plaid taxonomy
  - pending: false (all settled for historical data)
  
  Transaction Categories (use Plaid's taxonomy):
  - INCOME (INCOME.PAYROLL, INCOME.INVESTMENT)
  - FOOD_AND_DRINK (FOOD_AND_DRINK.RESTAURANTS, FOOD_AND_DRINK.GROCERIES)
  - TRANSPORTATION (TRANSPORTATION.GAS, TRANSPORTATION.PUBLIC_TRANSIT)
  - ENTERTAINMENT (ENTERTAINMENT.STREAMING, ENTERTAINMENT.CONCERTS)
  - TRANSFER (TRANSFER.SAVINGS, TRANSFER.CREDIT_CARD_PAYMENT)
  - SHOPPING (SHOPPING.ONLINE, SHOPPING.GENERAL)
  
  Transaction Patterns by Persona:
  - All: Regular payroll deposits (bi-weekly or monthly based on income stability)
  - Persona 1: High credit card spending, minimum payments, interest charges
  - Persona 2: Irregular income deposits, variable expenses
  - Persona 3: Recurring subscriptions (Netflix, Spotify, Adobe, etc.)
  - Persona 4: Regular transfers to savings, automated saving patterns
  - Persona 5: High income, high savings transfers, low credit utilization

Phase 4: Generate Liabilities (for credit cards and loans, ~150 total)
  MUST include all REQUIRED Plaid fields based on liability_type:
  
  For Credit Cards (liability_type = 'credit_card'):
    - aprs: JSON array with APR objects
      Example: [
        {"apr_type": "purchase_apr", "apr_percentage": 18.99},
        {"apr_type": "cash_advance_apr", "apr_percentage": 24.99}
      ]
    - minimum_payment_amount: Calculate as 2-3% of balance
    - last_payment_amount: Varies by persona (minimum only vs. paid in full)
    - is_overdue: true for ~5% of Persona 1 users (critical alerts)
    - next_payment_due_date: 15-30 days from generation date
    - last_statement_balance: Previous month's balance
  
  For Mortgages/Student Loans (liability_type = 'mortgage' or 'student_loan'):
    - interest_rate: 3-7% for mortgages, 4-8% for student loans
    - next_payment_due_date: Monthly due date
  
  Distribution:
  - ~120 credit card liabilities (most users have 1-3)
  - ~20 mortgage liabilities (20% of users)
  - ~10 student loan liabilities (10% of users)

Phase 5: Optional Parquet Export (Analytics Only)
  - Optionally export transactions to Parquet for offline analytics
  - Partition by date (year/month) if exported
  - Stored in /data/analytics/transactions.parquet (optional)

Phase 6: Run Signal Detection for all users
  - Compute 30-day and 180-day signals
  - Use SQLite windowed queries with indices for runtime performance
  - Store results in signals table (acts as cache)

Phase 7: Assign Personas to all users
  - Run persona scoring algorithm
  - Assign primary and secondary personas
  - Store in personas table with scores

Phase 8: Generate Recommendations for all users
  - Run recommendation engine
  - Generate 3-5 education items + 1-3 offers per user
  - Store in recommendations table with rationales
```

**Data Output Formats (per PDF requirements):**
```
Option 1: CSV Files (easier to inspect)
  - users.csv
  - accounts.csv
  - transactions.csv
  - liabilities.csv

Option 2: JSON Files (easier to parse programmatically)
  - users.json
  - accounts.json
  - transactions.json
  - liabilities.json

Option 3: Parquet Files (optional, optimized for offline analytics)
  - transactions.parquet (partitioned by date)
  - Not used for runtime signal detection in MVP

All formats supported for ingestion via Prisma seed script
```

**Data Quality Requirements (per PDF):**
- 50-100 synthetic users ✓ (generating 100)
- No real PII ✓ (using faker.js for fake names)
- Masked account numbers ✓ (e.g., "Visa ending in 4523")
- Diverse financial situations ✓ (spectrum distribution across personas)
- Ingest from CSV/JSON ✓ (no live Plaid connection)
- All required Plaid fields present ✓ (exactly matching PDF specification)

**Storage Strategy:**
- ~~**SQLite (runtime system of record):** users, accounts, transactions, liabilities, signals, personas, recommendations~~ **→ Migrated to Supabase PostgreSQL**
- **Parquet (optional):** Offline analytics only; not used in runtime signal queries
- **JSON:** Configuration files, offer definitions, content metadata, logs

**✅ PostgreSQL Migration (Completed November 2024):**
```
Migration Steps Completed:
  1. ✅ Updated Prisma schema: provider = "postgresql"
  2. ✅ Created migration: npx prisma migrate dev --name init_postgresql
  3. ✅ Set up Supabase integration in Vercel
  4. ✅ Configured DATABASE_URL to use Supabase connection
  5. ✅ Updated build script for smart seeding (only if empty)
  6. ✅ Schema unchanged (Prisma handled differences seamlessly)

Why Supabase Instead of SQLite:
- SQLite files don't persist in Vercel serverless environment
- Can't copy database files to /tmp reliably across cold starts
- Supabase provides managed PostgreSQL with connection pooling
- Free tier sufficient for MVP: 500 MB storage, unlimited compute
- Better for production: persistent data, handles concurrent connections
- Same Prisma schema works for both (just changed provider)

Migration Benefits:
- ✅ Data persists across deployments
- ✅ Handles 200k+ transactions reliably
- ✅ No file-based database management
- ✅ Built-in connection pooling (PgBouncer)
- ✅ Free tier generous enough for MVP
```

---

## API Specifications

### 1. API Overview

**Base URL:** `http://localhost:3000/api` (standard REST API prefix; endpoints match prompt requirements with `/api` prefix)

**Authentication:** JWT token in Authorization header: `Bearer <token>`

**Content Type:** `application/json`

**Error Format:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### 2. Authentication Endpoints

#### **POST /api/users**
Create new user account (matches prompt requirement `POST /users` with `/api` prefix).

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  },
  "token": "jwt-token-string"
}
```

**Pseudo Logic:**
```
Validate email format and password strength
Check if email already exists -> 400 error
Hash password with bcrypt
Create user in database with consent_status=false
Generate JWT token
Return user object and token
```

#### **POST /api/auth/login**
Login with email/password (additional endpoint for authentication; register via `/api/users`).

#### **GET /api/auth/example-users** ⭐ **Added (Not in Original PRD)**
Get example user emails for demo/login page (enhancement for better UX).
- Returns 5 seeded user emails + operator credentials
- No authentication required
- Used by frontend to display dynamic demo credentials
- **Enhancement:** Improves user experience by showing actual seeded users instead of hardcoded examples

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "consentStatus": true
  },
  "token": "jwt-token-string"
}
```

**Pseudo Logic:**
```
Find user by email -> 404 if not found
Compare password hash -> 401 if mismatch
Generate JWT token with user_id, role, consent_status
Return user object and token
```

### 3. User & Consent Endpoints

#### **POST /api/consent**
Record or update user consent (matches prompt requirement `POST /consent` with `/api` prefix).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "consentStatus": true
}
```

**Response (200):**
```json
{
  "success": true,
  "consentStatus": true,
  "consentDate": "2025-11-03T10:00:00Z"
}
```

**Pseudo Logic:**
```
Authenticate user from JWT token
Update user.consent_status and user.consent_date
If consent revoked (false):
  - Clear all active recommendations
  - Stop signal computation
Return updated consent status
```

#### **GET /api/users/me**
Get current user profile (additional endpoint for convenience).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "consentStatus": true,
  "consentDate": "2025-11-03T10:00:00Z",
  "role": "user",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### 4. Profile & Signals Endpoint

#### **GET /api/profile/:userId**
Get user's behavioral profile (signals and personas) - matches prompt requirement `GET /profile/{user_id}` with `/api` prefix.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "userId": "uuid",
  "consent": true,
  "accounts": [
    {
      "id": "acc_123",
      "type": "credit_card",
      "balance": 3400,
      "limit": 5000,
      "utilization": 0.68
    }
  ],
  "signals": {
    "30d": {
      "subscriptions": {
        "count": 5,
        "monthly_spend": 127,
        "share_of_total": 0.12
      },
      "savings": {
        "net_inflow": 200,
        "growth_rate": 0.03,
        "emergency_fund_coverage": 1.2
      },
      "credit": {
        "max_utilization": 0.68,
        "interest_charges": 87,
        "any_overdue": false
      },
      "income": {
        "frequency": "bi_weekly",
        "median_gap_days": 14,
        "cash_flow_buffer": 0.8
      }
    },
    "180d": { /* same structure */ }
  },
  "personas": {
    "primary": {
      "type": "high_utilization",
      "score": 0.85,
      "criteria_met": ["utilization_over_50", "interest_charges"]
    },
    "secondary": {
      "type": "subscription_heavy",
      "score": 0.62,
      "criteria_met": ["recurring_merchants_3+", "subscription_spend_over_10%"]
    }
  }
}
```

**Pseudo Logic:**
```
Authenticate user and check consent
Retrieve all accounts for user
Retrieve latest signals for 30d and 180d windows
Retrieve persona assignments (rank 1 and 2)
Format and return profile data
```

### 5. Recommendations Endpoint

#### **GET /api/recommendations/:userId**
Get personalized recommendations for user - matches prompt requirement `GET /recommendations/{user_id}` with `/api` prefix.

**Headers:** `Authorization: Bearer <token>`

**Query Params:**
- `status` - Filter by status (active, dismissed, completed, saved)
- `refresh` - Boolean, if true regenerate recommendations

**Response (200):**
```json
{
  "userId": "uuid",
  "recommendations": [
    {
      "id": "rec_123",
      "type": "education",
      "title": "Understanding Credit Utilization",
      "excerpt": "Credit utilization is...",
      "rationale": "We noticed your Visa ending in 4523 is at 68% utilization ($3,400 of $5,000 limit). Bringing this below 30% could improve your credit score and reduce interest charges of $87/month.",
      "url": "https://nerdwallet.com/article/...",
      "personaType": "high_utilization",
      "status": "active",
      "createdAt": "2025-11-03T09:00:00Z"
    },
    {
      "id": "rec_456",
      "type": "offer",
      "title": "0% APR Balance Transfer Card",
      "description": "Transfer high-interest balances...",
      "rationale": "With your current credit card at 68% utilization and $87/month in interest charges, a balance transfer could save you money.",
      "url": "https://partner.com/apply",
      "personaType": "high_utilization",
      "status": "active",
      "createdAt": "2025-11-03T09:00:00Z"
    }
  ],
  "disclaimer": "This is educational content, not financial advice. Consult a licensed advisor for personalized guidance."
}
```

**Pseudo Logic:**
```
Authenticate user and check consent
If refresh=true:
  - Recompute diffs only: update signals/personas that changed since cached `computed_at`
  - Avoid full recompute unless cache missing or schema version changed
  - Regenerate recommendations deterministically from updated signals/personas
Retrieve recommendations for user with status filter
For each recommendation:
  - Include rationale
  - Include decision trace (for operator view)
Return formatted recommendations with disclaimer
```

#### **POST /api/feedback**
Record user action on recommendation - matches prompt requirement `POST /feedback` with `/api` prefix.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "recommendation_id": "rec_123",
  "action": "dismissed"
}
```
Actions: dismissed, completed, saved, clicked

**Note:** Changed from path parameter to request body to match prompt's simpler endpoint structure.

**Response (200):**
```json
{
  "success": true,
  "recommendation": {
    "id": "rec_123",
    "status": "dismissed"
  }
}
```

**Pseudo Logic:**
```
Authenticate user
Extract recommendation_id from request body
Verify user owns this recommendation
Update recommendation.status based on action
Create user_feedback record
Return updated recommendation
```

### 6. Chat Endpoint

#### **POST /api/chat**
Send message to chat assistant (additional endpoint for chat functionality).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "message": "Why am I seeing this debt recommendation?",
  "conversationHistory": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi! How can I help?"}
  ]
}
```

**Response (200):**
```json
{
  "message": {
    "role": "assistant",
    "content": "I recommended this article because your Visa ending in 4523 is currently at 68% utilization ($3,400 of $5,000 limit), and you're paying about $87/month in interest charges. This article explains strategies to reduce these costs."
  },
  "functionCalls": [
    {
      "name": "get_user_signals",
      "args": {"signal_type": "credit"},
      "result": {"max_utilization": 0.68, "interest_charges": 87}
    }
  ]
}
```

**Pseudo Logic:**
```
Authenticate user and check consent
Append user message to conversation history (last 20 messages)
Call OpenAI GPT-4o-mini with:
  - System prompt (guardrails, function definitions)
  - Conversation history
  - Available functions (9 tools)
If LLM requests function call:
  - Execute function (get_user_signals, search_transactions, etc.)
  - Return result to LLM
  - LLM generates response
Save message to chat_messages table
Return assistant response and function call trace
```

### 7. Operator Endpoints

All operator actions are subject to consent gating; generation/recompute for a user is blocked if `consent_status=false`.

#### **GET /api/operator/review**
Get operator approval queue (flagged recommendations) - matches prompt requirement `GET /operator/review` with `/api` prefix.

**Note:** This endpoint returns the flagged recommendations queue for operator review. For full dashboard stats, use `GET /api/operator/dashboard` (additional endpoint).

#### **GET /api/operator/dashboard**
Get operator dashboard overview with system stats (additional endpoint for full dashboard).

**Headers:** `Authorization: Bearer <token>`
**Required Role:** operator

**Response (200):**
```json
{
  "flaggedRecommendations": [
    {
      "id": "rec_789",
      "userId": "user_123",
      "type": "offer",
      "title": "Payday Loan Offer",
      "rationale": "You should get this loan...",
      "agenticReviewStatus": "flagged",
      "agenticReviewReason": "Contains financial advice ('you should')",
      "flaggedAt": "2025-11-03T10:30:00Z"
    }
  ],
  "total": 3
}
```

**Pseudo Logic:**
```
Authenticate operator role
Query recommendations where agentic_review_status = 'flagged'
Return flagged recommendations queue for review
```

**Response (200) for /operator/dashboard:**
```json
{
  "stats": {
    "totalUsers": 100,
    "totalRecommendations": 450,
    "flaggedRecommendations": 3,
    "personas": {
      "high_utilization": 20,
      "variable_income": 20,
      "subscription_heavy": 20,
      "savings_builder": 20,
      "net_worth_maximizer": 20
    }
  }
}
```

#### **GET /api/operator/users**
Get list of all users with persona summaries for oversight (additional endpoint for operator management).

**Headers:** `Authorization: Bearer <token>`
**Required Role:** operator

**Query Params:**
- `page` - Page number (default 1)
- `limit` - Users per page (default 20)
- `persona` - Filter by persona type (optional)

**Response (200):**
```json
{
  "users": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "consentStatus": true,
      "primaryPersona": "high_utilization",
      "primaryPersonaScore": 0.85,
      "secondaryPersona": "subscription_heavy",
      "secondaryPersonaScore": 0.62,
      "activeRecommendations": 5,
      "flaggedRecommendations": 0
    }
  ],
  "total": 100,
  "page": 1,
  "pages": 5
}
```

#### **GET /api/operator/user/:userId**
Get detailed user profile for operator review (signals, personas, recommendations) - additional endpoint for operator management.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** operator

**Response (200):**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "consentStatus": true,
    "createdAt": "2025-11-01T00:00:00Z"
  },
  "signals": {
    "30d": { /* all signals */ },
    "180d": { /* all signals */ }
  },
  "personas": {
    "primary": {
      "type": "high_utilization",
      "score": 0.85,
      "criteria_met": ["utilization_over_50", "interest_charges"]
    },
    "secondary": {
      "type": "subscription_heavy",
      "score": 0.62,
      "criteria_met": ["recurring_merchants_3+"]
    }
  },
  "recommendations": [
    {
      "id": "rec_456",
      "type": "education",
      "title": "Reduce Credit Utilization",
      "status": "active",
      "rationale": "...",
      "decisionTrace": { /* full trace */ },
      "agenticReviewStatus": "approved"
    }
  ]
}
```

#### **POST /api/operator/recommendation/:recommendationId/hide**
Hide recommendation from user (manual override) - additional endpoint for operator actions.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** operator

**Request:**
```json
{
  "reason": "Tone violation - uses 'you should'"
}
```

**Response (200):**
```json
{
  "success": true,
  "recommendation": {
    "id": "rec_789",
    "status": "hidden",
    "hiddenBy": "operator_001",
    "hiddenReason": "Tone violation - uses 'you should'",
    "hiddenAt": "2025-11-03T11:00:00Z"
  }
}
```

**Pseudo Logic:**
```
Authenticate operator role
Update recommendation.status = 'hidden'
Log operator action (who, why, when)
Remove from user's active recommendations
Return confirmation
```

#### **POST /api/operator/recommendation/:recommendationId/approve**
Approve flagged recommendation (make visible to user) - additional endpoint for operator actions.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** operator

**Request:**
```json
{
  "notes": "Reviewed, tone is acceptable in context"
}
```

**Response (200):**
```json
{
  "success": true,
  "recommendation": {
    "id": "rec_789",
    "status": "active",
    "agenticReviewStatus": "operator_approved",
    "approvedBy": "operator_001",
    "approvalNotes": "Reviewed, tone is acceptable in context",
    "approvedAt": "2025-11-03T11:05:00Z"
  }
}
```

#### **POST /api/operator/user/:userId/persona-override**
Manually override persona assignment (for testing/debugging) - additional endpoint for operator actions.

**Headers:** `Authorization: Bearer <token>`
**Required Role:** operator

**Request:**
```json
{
  "primaryPersona": "savings_builder",
  "reason": "Testing savings builder recommendations for user with mixed signals"
}
```

**Response (200):**
```json
{
  "success": true,
  "override": {
    "userId": "user_123",
    "originalPrimaryPersona": "high_utilization",
    "newPrimaryPersona": "savings_builder",
    "overriddenBy": "operator_001",
    "reason": "Testing...",
    "overriddenAt": "2025-11-03T11:10:00Z"
  }
}
```

**Note:** Override logged in audit table, can be reverted

**Operator Override Capabilities:**
Operators can proactively hide any active recommendation (not just flagged ones), fulfilling the assignment requirement for "approve or override" capabilities. This includes:
- Approving flagged recommendations (makes them visible)
- Hiding any active recommendation (with reason)
- Overriding persona assignments (for testing)

All operator actions are logged in the audit trail with before/after states.

---

## AI Integration

### 1. OpenAI Chat Integration

**Model:** GPT-4o-mini (fast, cost-effective, function calling support)

**Purpose:** Power natural language chat interface with structured data access

#### System Prompt
```
You are a financial education assistant for SpendSense. Your role is to help users understand their spending patterns and financial behaviors through data and education.

CORE RULES:
1. NEVER give specific financial advice (no "you should", "I recommend", "best option")
2. ALWAYS explain using the user's actual data from function calls
3. Use empowering, educational tone - no shaming language
4. When users ask advice questions, redirect to education + data insights
5. Always include disclaimer for anything that could be construed as advice

YOU CAN:
- Explain user's behavioral signals and patterns
- Clarify why recommendations were made
- Point to educational content
- Help users understand financial terms in their context
- Show transaction patterns and trends

YOU CANNOT:
- Recommend specific financial products
- Tell users what to do with their money
- Make predictions about credit scores or loan approvals
- Access or modify user accounts
- Process transactions

When unsure, call get_content_disclaimer() and focus on education.
```

#### Function Calling Tools

**Tool 1: get_user_signals**
```
Function: get_user_signals
Description: Returns user's behavioral signals
Parameters:
  - signal_types: array of strings (optional, filters to specific signals)
  - window: integer (30 or 180, default 30)
Returns: JSON object with signals data
```

**Tool 2: get_user_recommendations**
```
Function: get_user_recommendations
Description: Returns current recommendations with rationales
Parameters: none
Returns: Array of recommendation objects
```

**Tool 3: get_recommendation_details**
```
Function: get_recommendation_details
Description: Deep dive on specific recommendation
Parameters:
  - recommendation_id: string
Returns: Full recommendation object with decision trace
```

**Tool 4: search_user_transactions**
```
Function: search_user_transactions
Description: Filter transactions by criteria
Parameters:
  - category: string (optional)
  - merchant: string (optional)
  - date_range: object {start, end} (optional)
  - limit: integer (default 50)
Returns: Array of transaction objects
```

**Tool 5: get_user_accounts_summary**
```
Function: get_user_accounts_summary
Description: High-level account overview
Parameters: none
Returns: Array of accounts with balances and utilization
```

**Tool 6: search_educational_content**
```
Function: search_educational_content
Description: Find relevant articles
Parameters:
  - topic: string (keywords)
Returns: Array of content objects
```

**Tool 7: explain_financial_term**
```
Function: explain_financial_term
Description: Define term in user's context
Parameters:
  - term: string
Returns: Definition + user-specific example
```

**Tool 8: check_offer_eligibility**
```
Function: check_offer_eligibility
Description: Check if user qualifies for offer
Parameters:
  - offer_id: string
Returns: {eligible: boolean, reasons: array}
```

**Tool 9: get_content_disclaimer**
```
Function: get_content_disclaimer
Description: Return standard disclaimer text
Parameters: none
Returns: Disclaimer string
```

**Fallback Tool: handle_out_of_scope**
```
Function: handle_out_of_scope
Description: Template response for questions outside tool scope
Returns: "I can help you understand your spending patterns. Try asking: [suggestions]"
```

#### Determinism & Tool-Calling Policy

- Model settings: `temperature=0`, `top_p=1`, presence/frequency penalties `=0`.
- Consent gating: deny all tool calls if `consent_status=false`.
- Allowed tools are read-only; none trigger recomputation or mutate state.
- Chat never ranks content or decides eligibility; it only surfaces system results.
- Function outputs use strict JSON schemas; unexpected fields are ignored.

### 2. Content Catalog (Pre-Tagged Metadata)

**Policy:**
- Curate 6 vetted links per persona (30 total articles) from trusted sources (NerdWallet, Investopedia, CFPB).
- Store hand-authored JSON metadata: `tags`, `persona_fit`, `signals`, `editorial_summary`.
- No scraping and no LLM analysis for metadata or ranking.

**Content Object Example:**
```json
{
  "id": "edu_credit_utilization_basics",
  "title": "Understanding Credit Utilization",
  "source": "NerdWallet",
  "url": "https://www.nerdwallet.com/article/...",
  "tags": ["credit", "utilization", "debt"],
  "persona_fit": ["high_utilization"],
  "signals": ["high_utilization", "interest_charges"],
  "editorial_summary": "100-word human-authored summary"
}
```

### 3. Automated Pre-Publish Checks + Operator Gate

**Purpose:** Pre-publish check to flag problematic recommendations

**Process:**
```
For each generated recommendation:
  1. Run blocklist check (regex scan for prohibited phrases)
  2. Run eligibility revalidation (confirm all rules pass)
  3. Call OpenAI for compliance review (advisory only):
     
     Prompt: "Review this recommendation for compliance:
     {recommendation JSON}
     
     Check for:
     - Financial advice language
     - Shaming/judgmental tone
     - Guarantees or predictions
     
     Respond: APPROVE or FLAG with reason"
  
  4. If APPROVE: Save as active recommendation
  5. If FLAG: Save with agentic_review_status='flagged' and do not show until operator approval
```

---

## Implementation Roadmap

### Phase 1: Foundation (Hours 1-6)

**Objectives:** Project setup, database, auth, API skeleton

**Tasks:**
- [ ] Initialize monorepo (backend + frontend)
- [ ] Setup TypeScript configs (tsconfig.json)
- [ ] Setup Prisma with SQLite
- [ ] Define Prisma schema (all tables)
- [ ] Setup Express server with routes skeleton
- [ ] Implement JWT auth (register, login)
- [ ] Create React app with Vite
- [ ] Setup Tailwind CSS
- [ ] Create API client (Axios wrapper)
- [ ] Setup auth context in React

**Deliverable:** Users can register, login, and receive JWT token. Frontend can make authenticated API calls.

### Phase 2: Data & Signals (Hours 7-12)

**Objectives:** Generate synthetic data, detect behavioral signals

**Tasks:**
- [ ] Write synthetic data generator (prisma/seed.ts)
  - [ ] Generate 100 users (20 per persona)
  - [ ] Generate accounts (1-4 per user)
  - [ ] Generate 2 years transactions per account
  - [ ] Generate liabilities for credit cards
- [ ] Implement signal detection service
  - [ ] Subscription detection (recurring merchants)
  - [ ] Savings calculation (inflows, growth rate, emergency fund)
  - [ ] Credit signals (utilization, interest, overdue)
  - [ ] Income detection (payroll patterns)
- [ ] Run seed script to populate database
- [ ] Write tests for signal detection
  - [ ] Test recurring merchant detection
  - [ ] Test utilization calculation
  - [ ] Test payroll detection

**Deliverable:** Database populated with 100 synthetic users. All users have computed signals for 30d and 180d windows.

### Phase 3: Personas & Recommendations (Hours 13-18)

**Objectives:** Assign personas, generate recommendations, create content catalog

**Tasks:**
- [ ] Implement persona assignment service
  - [ ] Scoring algorithm for each persona
  - [ ] Rank top 2 personas per user
  - [ ] Store persona assignments
- [ ] Curate 30 educational articles (6 per persona)
  - [ ] Find articles from trusted sources
  - [ ] Hand-author metadata (tags, persona_fit, signals, editorial_summary) - no LLM analysis
  - [ ] Store as JSON files with pre-tagged metadata
- [ ] Create 15-20 partner offers (JSON files)
  - [ ] Define eligibility rules
  - [ ] Map to personas
- [ ] Implement recommendation engine service
  - [ ] Content selection algorithm
  - [ ] Offer eligibility checking
  - [ ] Rationale template generation
  - [ ] Decision trace logging
- [ ] Implement automated agentic review
  - [ ] Blocklist checker
  - [ ] LLM compliance review
- [ ] Write tests
  - [ ] Test persona scoring
  - [ ] Test eligibility rules
  - [ ] Test rationale generation

**Deliverable:** All 100 users have persona assignments. Recommendations generated with rationales. Flagged items logged.

### Phase 4: Frontend Core (Hours 19-28)

**Objectives:** Build dashboard, insights, library, settings pages

**Tasks:**
- [ ] Create layout components (Header, Sidebar, Footer)
- [ ] Build Home Dashboard page
  - [ ] Alert banners (red, yellow, blue)
  - [ ] Recommendation cards (list format, expandable)
  - [ ] User actions (dismiss, save, complete)
- [ ] Build Insights page
  - [ ] Financial snapshot metrics
  - [ ] Spending breakdown (charts)
  - [ ] Credit health visualization
  - [ ] Savings trends
- [ ] Build Education Library page
  - [ ] Content grid/list
  - [ ] Filtering by topic
  - [ ] Search functionality
- [ ] Build Settings page
  - [ ] Consent toggle
  - [ ] Account preferences
  - [ ] Dismissed items list
- [ ] Implement state management (Zustand)
- [ ] Connect pages to API (fetch data, display)

**Deliverable:** Functional web app with 4 pages. Users can view recommendations, insights, content, and manage settings.

### Phase 5: Chat & Calculators (Hours 29-36)

**Objectives:** Implement chat interface and interactive calculators

**Tasks:**
- [ ] Setup OpenAI SDK in backend
- [ ] Implement chat service with function calling
  - [ ] Define 9 function tools
  - [ ] Implement function handlers
  - [ ] Integrate with OpenAI API
- [ ] Build Chat UI component
  - [ ] Sidebar overlay
  - [ ] Message list
  - [ ] Input field
  - [ ] Suggested questions on open
  - [ ] Conversation history
- [ ] Build Emergency Fund Calculator
  - [ ] Pre-fill user data
  - [ ] Interactive inputs
  - [ ] Visual progress bar
- [ ] Build Debt Payoff Simulator
  - [ ] Pre-fill credit card data
  - [ ] Slider for extra payment
  - [ ] Payoff timeline chart
- [ ] Build Subscription Audit Tool
  - [ ] List detected subscriptions
  - [ ] Checkboxes for keep/cancel
  - [ ] Savings calculation
- [ ] Connect calculators to API (fetch user data)

**Deliverable:** Working chat interface with natural language. 3 interactive calculators with user data pre-filled.

### Phase 6: Guardrails, Operator View & Testing (Hours 37-48)

**Objectives:** Implement guardrails, build operator dashboard with manual controls, write tests, polish

**Tasks:**
- [ ] Implement consent middleware (block API calls without consent)
- [ ] Implement tone blocklist validator
- [ ] Create comprehensive prohibited phrases list
- [ ] Build Operator Dashboard (Admin Page)
  - [ ] Operator authentication (separate role-based login)
  - [ ] Dashboard overview page
    - [ ] System statistics (user counts, personas, flagged items)
    - [ ] Persona distribution chart
    - [ ] Recent activity feed
  - [ ] User search and selection interface
  - [ ] User detail view with tabs:
    - [ ] Overview tab (user info, persona summary)
    - [ ] Signals tab (30d and 180d signals display)
    - [ ] Recommendations tab (list with actions)
    - [ ] Audit log tab (operator action history)
  - [ ] Flagged recommendations queue
    - [ ] Table of flagged items across all users
    - [ ] Approve/hide/view actions
    - [ ] Sortable and filterable
  - [ ] Recommendation actions:
    - [ ] "View Decision Trace" modal
    - [ ] "Hide from User" with reason input
    - [ ] "Approve" flagged items with notes
    - [ ] "Flag for Review" button
  - [ ] Persona override tool (for testing)
    - [ ] Select user, choose new persona
    - [ ] Provide override reason
    - [ ] Apply and regenerate recommendations
- [ ] Build operator API endpoints:
- [ ] GET /api/operator/review (approval queue - matches prompt)
- [ ] GET /api/operator/dashboard (full dashboard stats - additional)
  - [ ] GET /api/operator/users (with pagination)
  - [ ] GET /api/operator/user/:userId
  - [ ] POST /api/operator/recommendation/:id/hide
  - [ ] POST /api/operator/recommendation/:id/approve
  - [ ] POST /api/operator/user/:userId/persona-override
- [ ] Implement audit trail logging for all operator actions
- [ ] Write comprehensive test suite
  - [ ] Unit tests: signal detection (5 tests)
  - [ ] Unit tests: persona assignment (3 tests)
  - [ ] Unit tests: eligibility checking (2 tests)
  - [ ] Integration tests: API endpoints (5 tests)
  - [ ] Integration tests: auth flow (2 tests)
- [ ] Run evaluation metrics
  - [ ] Coverage (100% users with persona)
  - [ ] Explainability (100% recs with rationales)
  - [ ] Relevance (calculate persona affinity scores)
  - [ ] Latency (measure API response time)
  - [ ] Auditability (100% recs with traces)
- [ ] Generate evaluation report (JSON + summary)
- [ ] Write README with setup instructions
- [ ] Write decision log (docs/DECISIONS.md) documenting key choices
- [ ] Final polish (UI, error handling, edge cases)

**Deliverable:** Complete, tested system. Operator dashboard fully functional with manual override capabilities. Evaluation report generated. Documentation complete.

---

## Testing Strategy

### 1. Unit Tests

**Signal Detection Service (5 tests):**
- Test recurring merchant detection with varying amounts
- Test credit utilization calculation edge cases (0%, 100%, no limit)
- Test emergency fund coverage calculation
- Test payroll detection with regular and irregular income
- Test subscription share of total spend

**Persona Assignment Service (3 tests):**
- Test scoring algorithm for each persona
- Test prioritization when multiple personas match
- Test edge case: user matches no personas (should default to savings_builder)

**Eligibility Service (2 tests):**
- Test multi-factor eligibility rules (all pass, one fails)
- Test exclude_if_has_account logic

**Rationale Templates (2 tests):**
- Test template variable substitution
- Test edge cases (missing data, null values)

**Tone Guardrails (1 test):**
- Test blocklist rejects prohibited phrases and passes neutral phrasing

### 2. Integration Tests

**API Endpoints (5 tests):**
- Test POST /api/users → creates user, returns token (matches prompt)
- Test GET /api/profile/:userId → returns signals and personas (matches prompt)
- Test GET /api/recommendations/:userId → returns recs with rationales (matches prompt)
- Test POST /api/consent → updates consent, clears recs if revoked (matches prompt)
- Test POST /api/feedback → records user action on recommendation (matches prompt)
- Test GET /api/operator/review → returns flagged recommendations queue (matches prompt)
- Test POST /api/chat → calls OpenAI, returns response (additional)

**Auth Flow (2 tests):**
- Test JWT validation middleware (valid token, expired token, no token)
- Test consent middleware gating (blocked when consent=false)

### 3. Performance Tests

**Latency Benchmarks:**
- Measure GET /recommendations/:userId for single user
- Target: <5 seconds on laptop
- Test with 10 concurrent requests

### 4. Test Coverage Goal

- Minimum 10 tests total (requirement)
- Target 70%+ code coverage for services layer
- All critical paths tested (auth, signals, personas, recs)

---

## Deployment & Operations

### 1. Development Setup

**One-Command Setup:**
```bash
# Clone repo
git clone https://github.com/user/spendsense.git
cd spendsense

# Install dependencies
npm install

# Setup database
npx prisma migrate dev
npx prisma generate
npx prisma db seed

# Start backend
npm run dev:backend

# Start frontend (separate terminal)
npm run dev:frontend
```

**Local Run Mode (Required by Assignment):**
- Runs entirely on SQLite with `USE_LLM_STUB=true` (no external API calls).
- To use OpenAI in development, set `USE_LLM_STUB=false` and provide `OPENAI_API_KEY`.

### 2. Optional Cloud Deployment (Vercel)

**Why Vercel:**
- Optimized for React + Node.js full-stack apps
- Automatic deployments from Git commits
- Built-in support for serverless Express APIs
- Free tier includes SQLite via mounted volumes
- Simple environment variable management
- Custom domains easy to configure
- Fast CDN for frontend assets

**Vercel Configuration (vercel.json):**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    },
    {
      "src": "backend/src/server.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/src/server.ts"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/dist/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

**Deployment Steps:**
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Link project (first time only)
vercel link

# 4. Deploy to preview
vercel

# 5. Deploy to production
vercel --prod
```

**Environment Variables (Set in Vercel Dashboard):**
```
DATABASE_URL="file:./spendsense.db"
JWT_SECRET="<generate-secure-random-string>"
JWT_EXPIRES_IN="24h"
OPENAI_API_KEY="sk-..."
PORT="3000"
NODE_ENV="production"
```

**Database Persistence on Vercel:**
- Use Vercel's mounted volumes for SQLite
- Alternative: Migrate to Vercel Postgres (serverless PostgreSQL)
- For demo: SQLite file persists in /tmp (resets on redeploy)
- For production: Use Vercel Postgres or external PostgreSQL

**Custom Domain Setup:**
1. Purchase domain or use existing
2. In Vercel Dashboard → Project → Settings → Domains
3. Add domain (e.g., spendsense.yourbank.com)
4. Update DNS records as instructed by Vercel
5. SSL certificate auto-generated

**Continuous Deployment:**
- Push to `main` branch → Auto-deploys to production
- Push to feature branches → Creates preview deployments
- Pull requests → Automatic preview URLs for testing

### 3. Environment Variables

**.env file:**
```
DATABASE_URL="file:./spendsense.db"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="24h"
OPENAI_API_KEY="sk-..."
USE_LLM_STUB="true"   # set to "false" to use OpenAI API
PORT=3000
NODE_ENV="development"
```

### 3. Running Tests

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
```

### 4. Build for Production

```bash
# Build frontend
npm run build:frontend

# Build backend
npm run build:backend

# Start production server
npm start
```

### 5. Monitoring & Logging

**Logging Strategy:**
- Use Winston or Pino for structured logging
- Log levels: error, warn, info, debug
- Log to console (dev) and file (prod)

**Key Events to Log:**
- User registration/login
- Consent changes
- Signal detection runs
- Recommendation generation
- Agentic review flags
- API errors
- Chat function calls

---

## Decision Log

### Key Architectural Decisions

**1. TypeScript Full-Stack**
- **Decision:** Use TypeScript for backend and frontend
- **Rationale:** Type safety prevents bugs, shared types between layers, better DX
- **Alternatives Considered:** JavaScript (faster to write, less safe)

**2. Prisma ORM**
- **Decision:** Use Prisma instead of raw SQL or other ORMs
- **Rationale:** Type-safe queries, auto-generated types, excellent migrations, best TypeScript support
- **Alternatives Considered:** TypeORM (more complex), Sequelize (less type-safe), raw SQL (error-prone)

**3. Monolith Architecture**
- **Decision:** Single codebase with modular services
- **Rationale:** Simpler for 2-day sprint, easier debugging, single deployment
- **Alternatives Considered:** Microservices (overkill for demo)

**4. Personas Invisible to Users**
- **Decision:** Don't show persona labels in UI
- **Rationale:** Avoids stigma, feels more personalized, reduces anxiety
- **Alternatives Considered:** Show labels (too judgmental)

**5. Template-Based Rationales**
- **Decision:** Use templates with variable substitution, not LLM generation
- **Rationale:** Faster, cheaper, more consistent, easier to test
- **Alternatives Considered:** LLM-generated rationales (more natural but slower and riskier)

**6. OpenAI Function Calling**
- **Decision:** Use native function calling for chat
- **Rationale:** Structured, reliable, safe, well-documented
- **Alternatives Considered:** Prompt engineering only (less reliable)

**7. Automated Agentic Review**
- **Decision:** Auto-flag issues, no manual pre-approval queue
- **Rationale:** Faster, scalable, operator reviews post-facto
- **Alternatives Considered:** Manual review queue (too slow)

**8. SQLite for Development**
- **Decision:** Start with SQLite, plan PostgreSQL migration
- **Rationale:** Zero setup, fast demos, Prisma handles migration easily
- **Alternatives Considered:** PostgreSQL from start (overkill for demo)

---

## Limitations & Future Enhancements

### Known Limitations

**MVP Scope:**
- Static synthetic data (no live Plaid integration)
- 100 users only (not production-scale)
- No email notifications
- No mobile app (web only)
- Chat rate limited to 100 messages/session
- Simple auth (no 2FA, password reset)

**Technical Debt:**
- SQLite not suitable for production scale
- No caching layer (Redis)
- No load balancing
- Limited error handling edge cases
- Minimal input sanitization

### Future Enhancements

**Phase 2 (Post-Demo):**
- Real Plaid API integration
- Email notifications for alerts
- Enhanced security (2FA, rate limiting)
- Improved UI/UX polish
- More calculators (investment growth, tax estimator)
- Multi-bank aggregation

**Phase 3 (Scale):**
- Migrate to PostgreSQL
- Add Redis caching
- Implement background jobs (Celery/Bull)
- Real-time transaction streaming
- Advanced ML models for persona assignment
- A/B testing framework

---

## Appendix: Chat Tool Contract

### Overview

The chat interface uses OpenAI GPT-4o-mini with strict function calling. All tools are **read-only** and **consent-gated**. The chat never modifies state, triggers recomputation, or makes eligibility decisions.

### Determinism Settings

- **temperature:** 0 (fully deterministic)
- **top_p:** 1 (no sampling)
- **presence_penalty:** 0
- **frequency_penalty:** 0
- **seed:** Optional (for reproducible runs)

### Tool Definitions

#### Tool 1: `get_user_signals`

**Purpose:** Returns user's behavioral signals for a specific time window.

**Parameters:**
```typescript
{
  signal_types?: string[];  // Optional: filter to specific signals (subscription, savings, credit, income)
  window?: 30 | 180;        // Default: 30
}
```

**Returns:**
```typescript
{
  window: 30 | 180;
  signals: {
    subscriptions?: {
      count: number;
      monthly_spend: number;
      share_of_total: number;
    };
    savings?: {
      net_inflow: number;
      growth_rate: number;
      emergency_fund_coverage: number;
    };
    credit?: {
      max_utilization: number;
      avg_utilization: number;
      interest_charges: number;
      minimum_payment_only: boolean;
      any_overdue: boolean;
    };
    income?: {
      frequency: string;
      median_gap_days: number;
      cash_flow_buffer: number;
    };
  };
}
```

**Consent Gating:** Returns error if `consent_status=false`.

---

#### Tool 2: `get_user_recommendations`

**Purpose:** Returns current active recommendations with rationales.

**Parameters:** None

**Returns:**
```typescript
{
  recommendations: Array<{
    id: string;
    type: "education" | "offer";
    title: string;
    rationale: string;
    url?: string;
    personaType: string;
    createdAt: string;
  }>;
}
```

**Consent Gating:** Returns error if `consent_status=false`.

---

#### Tool 3: `get_recommendation_details`

**Purpose:** Deep dive on specific recommendation with decision trace.

**Parameters:**
```typescript
{
  recommendation_id: string;
}
```

**Returns:**
```typescript
{
  id: string;
  type: "education" | "offer";
  title: string;
  rationale: string;
  decisionTrace: {
    signals_snapshot: object;
    persona_scores: object;
    rule_path: string[];
    eligibility_results: object;
    rationale_template_id: string;
    generated_at: string;
  };
}
```

**Consent Gating:** Returns error if `consent_status=false`.

---

#### Tool 4: `search_user_transactions`

**Purpose:** Filter transactions by criteria.

**Parameters:**
```typescript
{
  category?: string;         // e.g., "FOOD_AND_DRINK"
  merchant?: string;         // Partial merchant name match
  date_range?: {
    start: string;           // ISO-8601 date
    end: string;             // ISO-8601 date
  };
  limit?: number;           // Default: 50, max: 100
}
```

**Returns:**
```typescript
{
  transactions: Array<{
    id: string;
    date: string;
    amount: number;
    merchant_name: string;
    category: string;
  }>;
  total: number;
}
```

**Consent Gating:** Returns error if `consent_status=false`.

---

#### Tool 5: `get_user_accounts_summary`

**Purpose:** High-level account overview with balances and utilization.

**Parameters:** None

**Returns:**
```typescript
{
  accounts: Array<{
    id: string;
    type: string;
    balance_current: number;
    balance_limit?: number;
    utilization?: number;
    masked_display: string;  // e.g., "Visa ending in 4523"
  }>;
}
```

**Consent Gating:** Returns error if `consent_status=false`.

---

#### Tool 6: `search_educational_content`

**Purpose:** Find relevant articles by topic keywords.

**Parameters:**
```typescript
{
  topic: string;            // Keywords to search
}
```

**Returns:**
```typescript
{
  content: Array<{
    id: string;
    title: string;
    source: string;
    url: string;
    excerpt: string;
    tags: string[];
  }>;
}
```

**Note:** This tool searches the pre-tagged content catalog. It does **not** use LLM to analyze or rank content.

---

#### Tool 7: `explain_financial_term`

**Purpose:** Define financial term in user's context.

**Parameters:**
```typescript
{
  term: string;             // e.g., "credit utilization", "emergency fund"
}
```

**Returns:**
```typescript
{
  definition: string;
  user_context?: string;   // Optional: how this applies to user's data
  example?: string;
}
```

**Note:** This tool may use the LLM to generate contextual explanations, but it never accesses user data without consent.

---

#### Tool 8: `check_offer_eligibility`

**Purpose:** Check if user qualifies for a specific offer (read-only check).

**Parameters:**
```typescript
{
  offer_id: string;
}
```

**Returns:**
```typescript
{
  eligible: boolean;
  reasons: string[];        // Array of pass/fail reasons
  failed_rules?: Array<{
    field: string;
    operator: string;
    value: any;
    reason: string;
  }>;
}
```

**Consent Gating:** Returns error if `consent_status=false`.

**Note:** This tool **does not** modify state or trigger offer assignment. It only checks eligibility.

---

#### Tool 9: `get_content_disclaimer`

**Purpose:** Return standard disclaimer text.

**Parameters:** None

**Returns:**
```typescript
{
  disclaimer: string;
}
```

**Example Response:**
```
"This is educational content, not financial advice. Consult a licensed advisor for personalized guidance."
```

---

### Tool Call Flow

```
1. User sends message → Chat service receives
2. Check consent_status → Block if false
3. Append message to conversation history (last 20 messages)
4. Call OpenAI API with:
   - System prompt (guardrails)
   - Conversation history
   - Tool definitions (9 tools)
   - Determinism settings (temperature=0, etc.)
5. If LLM requests function call:
   a. Validate tool name (must be in approved list)
   b. Validate parameters (Zod schema validation)
   c. Execute function (read-only, no state mutation)
   d. Return result to LLM
   e. LLM generates final response
6. Save message to chat_messages table
7. Return assistant response to user
```

### Guardrails

- **No State Mutation:** All tools are read-only. They cannot modify database, trigger recomputation, or change user state.
- **Consent Gating:** All tools that access user data check `consent_status` before execution.
- **No Eligibility Decisions:** Tool 8 (`check_offer_eligibility`) only checks eligibility; it does not assign offers.
- **No Content Ranking:** Tool 6 (`search_educational_content`) searches pre-tagged catalog only; no LLM ranking.
- **Strict Schema Validation:** All tool parameters and returns are validated with Zod schemas.

### Error Handling

If a tool call fails:
- Return error message to LLM
- LLM generates fallback response explaining the limitation
- Log error to chat_messages table for debugging

---

## Conclusion

This architecture provides a solid foundation for SpendSense, balancing rapid development with maintainability and explainability. The modular structure, type-safe stack, and clear separation of concerns enable confident iteration and testing.

By prioritizing transparency, auditability, and user control, the system demonstrates responsible AI practices in financial applications - never crossing into advice, always grounding recommendations in data, and maintaining human oversight through the operator view.

The 48-hour implementation roadmap is ambitious but achievable with focused execution on core features. The architecture is designed to scale beyond the demo: Prisma enables easy database migration, the modular service layer supports future enhancements, and the comprehensive decision traces provide a foundation for continuous improvement.

Build systems people can trust with their financial data.

---

**Document Version:** 1.0  
**Total Lines:** ~690
