# SpendSense - Decision Log

**Version:** 1.0  
**Date:** November 3, 2025  
**Project:** SpendSense

---

## Determinism & Seeding

### Synthetic Data Generator Seeding

**Decision:** Use fixed seed for all random number generation in synthetic data generator.

**Rationale:**
- The assignment prompt requires "deterministic behavior" with "use seeds for randomness."
- Reproducible data generation ensures consistent evaluation results across runs.
- Enables debugging and regression testing with known data.

**Implementation:**
- Set `DATA_SEED` environment variable (default: `1337`) in `.env` file.
- Pass seed to all random number generators (faker.js, Math.random via seedrandom).
- Document seed value in `/docs/DECISIONS.md` (this file).

**Example:**
```typescript
import seedrandom from 'seedrandom';
const rng = seedrandom(process.env.DATA_SEED || '1337');
const randomValue = rng();
```

**Environment Variable:**
```
DATA_SEED=1337
```

---

## Content Catalog: Pre-Tagged Metadata vs. LLM Analysis

### Decision: Hand-Authored Pre-Tagged JSON Instead of LLM-Generated Affinity Scores

**Rationale:**
- The assignment prompt emphasizes "rules-based baseline is acceptable; focus on explainability over sophistication."
- Using LLMs to analyze external articles and compute persona affinities shifts explainability responsibility from the system to the model, violating the prompt's intent.
- Pre-tagged metadata with fixed `persona_fit` and `signals` arrays enables deterministic, explainable content matching.
- Hand-authored tags and summaries are faster to implement and easier to audit than LLM-generated metadata.

**Implementation:**
- Store content metadata as JSON files in `/content/` directory.
- Each file includes: `id`, `title`, `source`, `url`, `tags`, `persona_fit`, `signals`, `editorial_summary`.
- Content matching uses deterministic rules: `persona_fit.includes(primary_persona)` and signal overlap.
- No web scraping or LLM analysis for metadata generation.

**Future Enhancement:**
- If time permits, could add LLM-based content summarization as an optional enhancement, but keep pre-tagged metadata as the source of truth.

---

## Rationale Generation: Template-Based vs. LLM-Generated

### Decision: Template-Based String Formatting

**Rationale:**
- The assignment prompt requires "plain-language explanations" with "rationales citing concrete data."
- Template-based approach is faster, cheaper, more consistent, and easier to test than LLM generation.
- Templates ensure deterministic rationales that always cite specific data points.
- LLM-generated rationales could be non-deterministic and harder to audit.

**Implementation:**
- Define rationale templates in `/backend/src/recommend/rationaleTemplates.ts`.
- Each template uses string interpolation with user-specific data (e.g., `{utilization}`, `{balance}`, `{limit}`).
- Templates are deterministic and always produce the same output for the same inputs.

**Example Template:**
```typescript
const creditUtilizationTemplate = 
  "We noticed your {card_name} is at {utilization}% utilization (${balance} of ${limit} limit). Bringing this below 30% could improve your credit score and reduce interest charges of ${interest_monthly}/month.";
```

---

## Fairness Analysis Deferral

### Decision: Skip Fairness Parity Checks for MVP

**Rationale:**
- The assignment prompt states: "Fairness: basic demographic parity check **if synthetic data includes demographics**."
- Our synthetic data generator does not include demographic attributes (race, gender, age, etc.).
- Therefore, fairness analysis is not applicable for MVP.
- This decision is documented in `/docs/LIMITATIONS.md`.

**Future Enhancement:**
- If demographic attributes are added to synthetic data, implement simple demographic parity checks for persona assignment and offer exposure.

---

## Storage Strategy: SQLite-First with Optional Parquet Export

### Decision: SQLite as Runtime System of Record; Parquet Optional for Analytics

**Rationale:**
- The assignment prompt requires "system runs locally without external dependencies."
- SQLite is file-based, requires zero setup, and is fast for ~50K transactions.
- Parquet scanning with parquetjs can be clunky and slower than indexed SQL for ~50K rows.
- Using SQLite with proper indices (on `transactions(account_id, date)`, `merchant_name`, `category`) is sufficient for runtime queries.
- Parquet export can be added as an optional offline analytics feature, but not required for core workflows.

**Implementation:**
- All windowed signal queries use SQLite with indices.
- Parquet export is optional and only used for offline analytics (not runtime).
- If exported, Parquet files are stored in `/data/analytics/` directory.

---

## Eligibility Rules: First-Order Signals Only

### Decision: Remove "Estimated Credit Score" from Eligibility Logic

**Rationale:**
- Estimating a credit score can read like financial advice/credit determination and is hard to justify explainably.
- The assignment prompt emphasizes explainability and transparency.
- Base offer eligibility purely on first-order observable signals: utilization tiers, interest presence, overdue flags, income bands, explicit minimum-income checks, and existing-account filters.

**Implementation:**
- Eligibility rules use only observable data points:
  - `max_utilization >= 0.5`
  - `interest_charges_present == true`
  - `is_overdue == false`
  - `annual_income >= 40000`
  - `existing_accounts NOT contains "balance_transfer_card"`
- No "estimated_credit_score" field in eligibility rules.

---

## Consent Enforcement: Gating on All Compute Paths

### Decision: Enforce Consent on `/profile`, `/recommendations` (including `?refresh=true`), and Operator Actions

**Rationale:**
- The assignment prompt requires "No recommendations without consent."
- Consent revocation should immediately halt all data processing.
- Operators should not be able to generate recommendations or recompute signals for users who have not consented.

**Implementation:**
- Consent middleware checks `consent_status` before:
  - `GET /api/profile/:userId`
  - `GET /api/recommendations/:userId` (including `?refresh=true`)
  - Operator-triggered generation/recompute actions
- If `consent_status=false`, return 403 with message: "Enable personalized insights by allowing SpendSense to analyze your data."

---

## Operator Review: Pre-Publish Checks + Post-Facto Approval

### Decision: Automated Pre-Publish Checks with Operator Gate; Flagged Items Blocked Until Approval

**Rationale:**
- The assignment prompt requires "operator review step with the ability to approve or override flagged recommendations."
- Automated checks (blocklist + LLM compliance review) run before showing recommendations to users.
- If flagged, recommendation is blocked and sent to operator review queue.
- If approved, recommendation is shown immediately.
- Operators can also proactively hide any active recommendation (not just flagged ones).

**Implementation:**
- Automated checks run before saving recommendation as "active."
- If flagged: `agentic_review_status='flagged'`, recommendation is NOT shown to user.
- If approved: `agentic_review_status='approved'`, recommendation is shown immediately.
- Operators can:
  - Approve flagged recommendations (makes them visible)
  - Hide any active recommendation (with reason)
  - Override persona assignments (for testing)

---

## Chat LLM Integration: Deterministic Tool-Calling

### Decision: Use OpenAI GPT-4o-mini with Strict Function Calling (temperature=0, read-only tools)

**Rationale:**
- The assignment prompt allows "LLMs for generating educational content text" but emphasizes "rules-based baseline is acceptable; focus on explainability over sophistication."
- Chat interface uses LLM for natural language interaction, but tool calls are deterministic and read-only.
- Chat never ranks content, computes eligibility, or modifies state.
- All tool calls are consent-gated and validated with strict schemas.

**Implementation:**
- Model settings: `temperature=0`, `top_p=1`, presence/frequency penalties `=0`.
- All 9 tools are read-only (no state mutation).
- Tool parameters and returns validated with Zod schemas.
- Consent gating applied before any tool call.

---

## Authentication: JWT-Only, No OAuth

### Decision: Exclude Google OAuth for MVP

**Rationale:**
- The assignment prompt requires "system runs locally without external dependencies."
- OAuth adds integration complexity and privacy compliance concerns.
- Synthetic users can log in with mock email credentials.
- OAuth excluded explicitly for MVP privacy compliance.

**Implementation:**
- Username/password authentication only (email + bcrypt hashed password).
- JWT tokens for session management.
- No OAuth providers integrated.

---

## Caching & Recompute: Diff-Based Updates

### Decision: Cache Signals/Personas Per User Per Window; Recompute Diffs Only on Refresh

**Rationale:**
- The assignment prompt requires latency <5 seconds per user.
- Full recompute on every refresh would be too slow.
- Cache computed signals and personas with `computed_at` timestamp.
- `refresh=true` recomputes only diffs (what changed since last computation).

**Implementation:**
- Store signals and personas in database with `computed_at` timestamp.
- On refresh, compare current data with cached values.
- Only recompute signals/personas that changed.
- Avoid full recompute unless cache missing or schema version changed.

---

## Implementation Notes

### Rationale Template Library

**Status:** To be implemented during recommendation engine development

**Action Required:**
- Create template library in `/backend/src/recommend/rationaleTemplates.ts` during recommendation engine implementation.
- Define templates for each recommendation type (education content, offers) with variable placeholders.
- Templates should cite concrete data points (e.g., `{card_name}`, `{utilization}%`, `${balance}`, `${limit}`, `${interest_monthly}`).
- Use string interpolation to fill templates with user-specific data from signals and account details.
- Store `rationale_template_id` in recommendation's `decision_trace` for auditability.

**Example Template Structure:**
```typescript
const templates = {
  credit_utilization_v1: 
    "We noticed your {card_name} ending in {last_four} is at {utilization}% utilization (${balance} of ${limit} limit). Bringing this below 30% could improve your credit score and reduce interest charges of ${interest_monthly}/month.",
  // ... more templates
};
```

---

### Calculator Data Flow

**Status:** To be implemented during frontend development

**Action Required:**
- Calculators (e.g., credit utilization calculator, emergency fund calculator) should fetch data from `GET /api/profile/:userId` endpoint.
- The `/api/profile/:userId` endpoint returns user's behavioral profile including:
  - Signals (credit, savings, income, subscriptions)
  - Personas (primary and secondary)
  - Account details (balances, limits, utilization)
- Pre-fill calculator inputs with user's actual data from the profile response.
- Ensure calculators are consent-gated (only show/function if user has consented).

**Data Flow:**
```
User opens calculator → Frontend calls GET /api/profile/:userId → 
Extract relevant data (e.g., credit utilization, savings balance) → 
Pre-fill calculator inputs → User can modify values if desired
```

---

### Decision Trace Export

**Status:** To be implemented during evaluation harness development

**Action Required:**
- Evaluation harness must export per-user decision traces as specified in Reqs PRD Section 8.3 (Auditability).
- Each recommendation includes a `decision_trace` JSON field with:
  - `signals_snapshot`: Snapshot of signals used for recommendation
  - `persona_scores`: Primary and secondary persona scores
  - `rule_path`: Array of rules applied (e.g., `["content_filter:persona_fit", "eligibility:utilization>=0.5"]`)
  - `eligibility_results`: Pass/fail status and failed rules
  - `rationale_template_id`: Template used for rationale generation
  - `generated_at`: Timestamp of recommendation generation
- Export decision traces in evaluation harness output:
  - JSON format: Include `decision_traces` array per user
  - CSV format: Include decision trace summary columns
- Ensure 100% of recommendations have complete decision traces (auditability target).

**Export Format:**
```json
{
  "user_id": "user_123",
  "recommendations": [
    {
      "id": "rec_456",
      "decision_trace": {
        "signals_snapshot": {...},
        "persona_scores": {...},
        "rule_path": [...],
        "eligibility_results": {...},
        "rationale_template_id": "credit_utilization_v1",
        "generated_at": "2025-11-03T10:00:00Z"
      }
    }
  ]
}
```

---

**Document Version:** 1.0  
**Last Updated:** November 3, 2025

