# SpendSense - Technical Writeup

**Version:** 1.0  
**Date:** November 5, 2025  
**Project:** SpendSense

---

## Tech Stack

### Backend
- **Runtime:** Node.js 20+ with TypeScript
- **Framework:** Express.js for REST API
- **Database:** PostgreSQL (Supabase) with Prisma ORM
- **Authentication:** JWT tokens with bcrypt password hashing
- **Testing:** Jest for unit and integration tests

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Styling:** Tailwind CSS

### AI Integration
- **LLM:** OpenAI GPT-4o-mini (optional, can run in stub mode)
- **Current Status:** Tool calling infrastructure built but not yet tested/production-ready
- **Local Mode:** Deterministic stub mode enabled by default (`USE_LLM_STUB=true`)

### Data Generation
- **Synthetic Data:** Faker.js with seedrandom for deterministic generation
- **Seed:** `DATA_SEED=1337` for reproducible results
- **Format:** Plaid-compatible JSON/CSV structure

### Development Tools
- **Package Manager:** npm
- **Database Migrations:** Prisma Migrate
- **Type Checking:** TypeScript strict mode
- **Code Organization:** Modular architecture with clear separation of concerns

---

## Architecture

### Modular Structure

The codebase is organized into clear, single-responsibility modules:

```
backend/src/
├── ingest/          # Data loading and validation (CSV/JSON → database)
├── features/        # Signal detection (subscription, savings, credit, income)
├── personas/        # Persona assignment logic and scoring
├── recommend/       # Recommendation engine (content matching, rationale generation)
├── guardrails/      # Consent management, eligibility checks, tone validation
├── ui/              # REST API routes and middleware
├── eval/            # Evaluation harness (metrics computation)
└── services/        # External service integrations (OpenAI chat)
```

### Data Flow

1. **Ingestion:** Synthetic transaction data (CSV/JSON) → Prisma → PostgreSQL
2. **Signal Detection:** Raw transactions → Feature engineering → Behavioral signals (30d/180d windows)
3. **Persona Assignment:** Signals → Scoring engine → Primary/secondary persona assignment
4. **Recommendation Generation:** Persona + signals → Content matching → Rationale generation → Guardrails
5. **User Interface:** React frontend → REST API → Database queries → Personalized recommendations

### Key Architectural Patterns

- **Rules-Based Logic:** Prioritize explainability over ML sophistication
- **Template-Based Rationales:** Deterministic, data-cited explanations (no LLM generation)
- **Pre-Tagged Content:** Hand-authored metadata for educational articles (no web scraping)
- **Consent-First:** All data processing requires explicit user consent
- **Operator Oversight:** Human-in-the-loop for recommendation approval/override

---

## Key Technical Decisions

### 1. Deterministic Data Generation

**Decision:** Use fixed seed (`DATA_SEED=1337`) for all random number generation.

**Rationale:**
- Assignment requirement: "deterministic behavior (use seeds for randomness)"
- Enables reproducible evaluation results
- Facilitates debugging and regression testing

**Implementation:**
- `seedrandom` library for Math.random() replacement
- Faker.js seeded with `DATA_SEED` environment variable
- All synthetic users/transactions generated deterministically

### 2. Template-Based Rationale Generation

**Decision:** Use string templates instead of LLM-generated rationales.

**Rationale:**
- Assignment emphasizes "plain-language explanations" citing "concrete data"
- Templates ensure deterministic output for same inputs
- Faster, cheaper, more consistent than LLM generation
- Easier to test and audit

**Implementation:**
- Rationale templates in `backend/src/recommend/rationaleTemplates.ts`
- String interpolation with user-specific data (utilization %, balances, limits)
- Example: `"We noticed your {card_name} is at {utilization}% utilization (${balance} of ${limit} limit)."`

### 3. Pre-Tagged Content Metadata

**Decision:** Hand-author content metadata (persona_fit, signals) instead of LLM analysis.

**Rationale:**
- Assignment: "rules-based baseline is acceptable; focus on explainability over sophistication"
- Pre-tagged metadata enables deterministic, explainable content matching
- Faster to implement and easier to audit than LLM-generated metadata

**Implementation:**
- JSON files in `/content/` directory with fixed `persona_fit` and `signals` arrays
- Content matching uses deterministic rules: `persona_fit.includes(primary_persona)`
- No web scraping or LLM analysis for metadata generation

### 4. Database Migration: SQLite → PostgreSQL

**Decision:** Migrate from SQLite to Supabase PostgreSQL for production.

**Rationale:**
- SQLite doesn't work in Vercel serverless environment (files don't persist)
- Supabase provides managed PostgreSQL with free tier
- Better for production workloads (handles 200k+ transactions reliably)

**Implementation:**
- Prisma schema changed from `sqlite` to `postgresql` provider
- Same Prisma client code works seamlessly
- Data persists across deployments

### 5. LLM Stub Mode (Local Execution)

**Decision:** Implement deterministic stub mode for local runs without external dependencies.

**Rationale:**
- Assignment requirement: "run locally without external dependencies"
- Enables testing and development without OpenAI API keys
- Stub mode returns template responses instead of LLM calls

**Implementation:**
- `USE_LLM_STUB=true` environment variable
- Chat service checks stub flag before making OpenAI API calls
- Stub mode returns predefined template responses

### 6. OpenAI Tool Calling (On To-Do List)

**Status:** Infrastructure built but not yet tested or production-ready.

**What's Built:**
- 9 read-only function tools defined in `backend/src/services/chat/chatService.ts`:
  - `get_user_signals` - Retrieve behavioral signals
  - `get_user_recommendations` - Get active recommendations
  - `get_recommendation_details` - Deep dive on specific recommendation
  - `search_user_transactions` - Filter transactions by criteria
  - `get_user_accounts_summary` - Account overview
  - `search_educational_content` - Find articles by topic
  - `explain_financial_term` - Define terms in user's context
  - `check_offer_eligibility` - Check offer qualifications
  - `get_content_disclaimer` - Return standard disclaimer

**Current State:**
- Tool definitions complete with proper TypeScript types
- Tool execution functions implemented
- OpenAI integration code written
- **Not yet tested** with real OpenAI API calls
- **Not in production** - system currently runs in stub mode

**Next Steps:**
- Test tool calling with OpenAI API
- Validate function call parsing and execution
- Add error handling for API failures
- Test edge cases (missing parameters, invalid tool calls)
- Deploy to production once validated

### 7. Fairness Analysis Deferral

**Decision:** Skip demographic parity checks for MVP.

**Rationale:**
- Assignment states: "Fairness: basic demographic parity check **if synthetic data includes demographics**"
- Synthetic data generator does not include demographic attributes
- Therefore, fairness analysis is not applicable for MVP

**Future Enhancement:**
- If demographic attributes are added, implement parity checks for persona assignment and offer exposure

---

## AI Integration To-Dos

### 1. Content Generation for Articles

**Status:** Not implemented.

**Planned Approach:**
- Use LLM to generate educational article summaries/excerpts
- Maintain pre-tagged metadata as source of truth
- Generate content based on persona themes and signal types

**Current State:**
- Content catalog uses hand-authored JSON files
- Articles are external links (NerdWallet, Investopedia, CFPB)
- No LLM-generated content currently

### 2. Chatbot for Signals and Transaction Data

**Status:** Infrastructure built, not yet tested.

**What's Built:**
- OpenAI GPT-4o-mini integration
- 9 read-only function tools for data access
- System prompt with guardrails (no financial advice, educational tone)
- Tool calling infrastructure

**What's Needed:**
- Testing with real OpenAI API calls
- Validation of tool call parsing
- Error handling for API failures
- User acceptance testing
- Production deployment

**Current Behavior:**
- Chat runs in stub mode (`USE_LLM_STUB=true`)
- Returns template responses: "I can help you understand your spending patterns..."
- Tool calling code exists but is not executed in stub mode

---

## Performance Characteristics

### Latency
- **Recommendation Generation:** P95 = 884ms (well under <5s target)
- **Signal Detection:** <200ms per user
- **Persona Assignment:** <100ms per user

### Scalability
- **Database:** PostgreSQL handles 200k+ transactions reliably
- **API:** Express.js handles concurrent requests efficiently
- **Frontend:** React app loads in <2s

### Evaluation Metrics
- **Coverage:** 100% (all users have assigned persona + ≥3 behaviors)
- **Explainability:** 100% (all recommendations have rationales)
- **Auditability:** 100% (all recommendations have decision traces)
- **Latency:** <5 seconds (P95 = 884ms)

---

## Testing Strategy

### Unit Tests
- **Count:** 19 tests across 8 test files
- **Coverage Areas:**
  - Guardrails (consent, eligibility, tone)
  - Features (subscription detection, credit analysis)
  - Recommendations (rationale generation)
  - Evaluation (metrics computation)
  - Integration (operator audit trail)

### Test Execution
```bash
cd backend && npm test
```

**Result:** All 19 tests passing ✅

---

## Limitations

See `LIMITATIONS.md` for complete list. Key limitations:

- **SQLite → PostgreSQL:** Migrated for production, but originally SQLite-only
- **Static Data:** Synthetic data only; no live Plaid API integration
- **LLM Stub Mode:** Chat runs in stub mode by default (no external dependencies)
- **No Real-Time Updates:** Recommendations generated on-demand, not streamed
- **Web Only:** No mobile app (desktop web browser only)
- **Minimum Test Coverage:** ≥10 tests (meets requirement, but not comprehensive)

---

## Deployment

### Environment
- **Backend:** Vercel serverless functions
- **Frontend:** Vercel static hosting
- **Database:** Supabase PostgreSQL (managed)

### Environment Variables
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `JWT_SECRET` - JWT token signing secret
- `USE_LLM_STUB` - Set to "true" for local runs without OpenAI
- `DATA_SEED` - Fixed seed for deterministic data generation

---

## Conclusion

SpendSense is built with a focus on **explainability over sophistication** and **transparency over automation**. The architecture prioritizes deterministic, rules-based logic with clear decision traces, enabling users and operators to understand exactly why recommendations were made.

The system meets all core requirements:
- ✅ Modular structure
- ✅ One-command setup
- ✅ ≥10 tests (19 tests)
- ✅ Deterministic behavior
- ✅ Performance targets met
- ✅ Evaluation metrics at 100%

**Next Steps:**
- Test and deploy OpenAI tool calling for chatbot
- Implement LLM-based content generation
- Add comprehensive integration tests
- Production deployment and monitoring

---

**Document Version:** 1.0  
**Last Updated:** November 5, 2025

