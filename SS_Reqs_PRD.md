# SpendSense - Requirements PRD

**Version:** 1.0  
**Date:** November 3, 2025  
**Project:** SpendSense

---

## Executive Summary

### Product Vision
SpendSense is an explainable, consent-aware financial education platform that transforms bank transaction data into personalized insights without crossing into regulated financial advice. The system detects behavioral patterns, assigns invisible personas, and delivers tailored educational content with clear rationales grounded in user data.

### Core Principles
1. **Transparency over sophistication** - Every recommendation cites specific data points
2. **User control over automation** - Explicit consent, revocable at any time
3. **Education over sales** - Focus on learning, not product pushing
4. **Fairness built in from day one** - No shaming language, supportive tone

### Target Users
Existing bank customers who want to better understand their financial data and make more informed decisions through educational content (not financial advice).

### Project Scope
- **Scale:** 100 synthetic users (proof-of-concept, not production-scale)
- **Timeline:** 2-day sprint to demonstrate core functionality
- **Deliverables:** Full-stack web application with REST API, synthetic data generator, recommendation engine, and operator oversight tools

---

## Product Requirements

### 1. Data Ingestion & Generation

#### 1.1 Synthetic Data Generator
Generate 100 synthetic users matching Plaid's data structure with diverse financial profiles distributed across a financial health spectrum.

**User Distribution Strategy:**
- 100 synthetic users total (per PDF requirement: 50-100)
- 20 users per persona type
- Users exist on a gradient from financial stress to financial success
- 50% "pure" persona users (clear single classification)
- 50% "overlap" users (match multiple personas with varying scores)

**Data Requirements (per PDF):**
- ✓ Generate 50-100 synthetic users (we're generating 100)
- ✓ No real PII - use fake names, masked account numbers
- ✓ Diverse financial situations (various income levels, credit behaviors, saving patterns)
- ✓ Ingest from CSV/JSON (no live Plaid connection required)

#### 1.2 Plaid-Style Data Structure

**CRITICAL:** Data must exactly match Plaid's structure as specified in PDF.

**Accounts Structure (Required Fields):**
```
Fields per PDF specification:
  ✓ account_id
  ✓ type/subtype (checking, savings, credit card, money market, HSA)
  ✓ balances: available, current, limit
  ✓ iso_currency_code
  ✓ holder_category (exclude business accounts)
```

**Account Details:**
- **account_id:** Plaid-style identifier (e.g., "acc_9xKjP8vQw2T5")
- **type:** Must be one of: checking, savings, credit_card, money_market, hsa
- **subtype:** Additional classification (e.g., "rewards" for credit cards, "standard" for checking)
- **balance_available:** Funds available for immediate use
- **balance_current:** Total current balance
- **balance_limit:** Credit limit (REQUIRED for credit_card type, null otherwise)
- **iso_currency_code:** Currency code (default "USD" for all synthetic data)
- **holder_category:** Must be "personal" (business accounts explicitly excluded per PDF)

**Transactions Structure (Required Fields):**
```
Fields per PDF specification:
  ✓ account_id
  ✓ date
  ✓ amount
  ✓ merchant_name or merchant_entity_id
  ✓ payment_channel
  ✓ personal_finance_category (primary/detailed)
  ✓ pending status
```

**Transaction Details:**
- **transaction_id:** Plaid-style identifier (e.g., "txn_7pQr3WsYv5N2") [SpendSense addition for tracking]
- **account_id:** Links to accounts table
- **date:** Transaction date
- **amount:** Dollar amount (negative for debits/spending, positive for credits/income)
- **merchant_name OR merchant_entity_id:** At least one required; merchant_name for readability
- **payment_channel:** Must be one of: online, in_store, other
- **personal_finance_category_primary:** Top-level category (e.g., FOOD_AND_DRINK, INCOME, TRANSPORTATION)
- **personal_finance_category_detailed:** Detailed subcategory (e.g., FOOD_AND_DRINK.RESTAURANTS, INCOME.PAYROLL)
- **pending:** Boolean status (false for all historical data)

**Category Taxonomy (Use Plaid's Categories):**
- **INCOME:** INCOME.PAYROLL, INCOME.INVESTMENT, INCOME.OTHER
- **FOOD_AND_DRINK:** FOOD_AND_DRINK.RESTAURANTS, FOOD_AND_DRINK.GROCERIES
- **TRANSPORTATION:** TRANSPORTATION.GAS, TRANSPORTATION.PUBLIC_TRANSIT
- **ENTERTAINMENT:** ENTERTAINMENT.STREAMING, ENTERTAINMENT.CONCERTS
- **SHOPPING:** SHOPPING.ONLINE, SHOPPING.GENERAL
- **TRANSFER:** TRANSFER.SAVINGS, TRANSFER.CREDIT_CARD_PAYMENT

**Liabilities Structure (Required Fields):**
```
Credit Cards - Fields per PDF specification:
  ✓ APRs (type/percentage)
  ✓ minimum_payment_amount
  ✓ last_payment_amount
  ✓ is_overdue
  ✓ next_payment_due_date
  ✓ last_statement_balance

Mortgages/Student Loans - Fields per PDF specification:
  ✓ interest_rate
  ✓ next_payment_due_date
```

**Liability Details:**

**For Credit Cards (liability_type = "credit_card"):**
- **aprs:** JSON array of APR objects with type and percentage
  - Structure: `[{"apr_type": "purchase_apr", "apr_percentage": 18.99}]`
  - APR types: purchase_apr, cash_advance_apr, balance_transfer_apr, penalty_apr
- **minimum_payment_amount:** Minimum payment due (typically 2-3% of balance)
- **last_payment_amount:** Amount of last payment made
- **is_overdue:** Boolean indicating overdue status
- **next_payment_due_date:** Date of next payment due
- **last_statement_balance:** Balance on most recent statement

**For Mortgages/Student Loans (liability_type = "mortgage" or "student_loan"):**
- **interest_rate:** Annual interest rate percentage (3-7% for mortgages, 4-8% for student loans)
- **next_payment_due_date:** Date of next payment due

#### 1.3 Data Generation Requirements

**100 Synthetic Users:**
- Use faker.js library for fake names (no real PII)
- Generate diverse profiles across financial health spectrum
- Income range: $30K - $200K annual
- Credit behaviors: 0% to 95% utilization
- Savings patterns: $0 to $50K+

**Accounts (1-4 per user, ~250 total):**
- All users have at least 1 checking account
- Distribution varies by persona:
  - Persona 1 (High Utilization): 1 checking + 2-3 high-balance credit cards
  - Persona 2 (Variable Income): 1 checking + 1 low-balance savings
  - Persona 3 (Subscription-Heavy): 1 checking + 1 credit card + 1 savings
  - Persona 4 (Savings Builder): 1 checking + 1-2 savings + 1 low-utilization credit card
  - Persona 5 (Net Worth Maximizer): 1 checking + 2 savings/money market + 1 paid-off credit card

**Transactions (2 years history, ~50K total):**
- Date range: 2023-11-03 to 2025-11-03 (2 full years)
- All transactions settled (pending = false)
- Realistic patterns:
  - Regular payroll deposits (bi-weekly or monthly based on persona)
  - Recurring subscriptions (monthly charges to same merchants)
  - Variable spending across categories
  - Credit card payments and transfers

**Liabilities (~150 total):**
- Credit card liabilities for all credit_card type accounts
- Optional mortgage liabilities (~20% of users)
- Optional student loan liabilities (~10% of users)

**Data Output Formats:**
- CSV files (users.csv, accounts.csv, transactions.csv, liabilities.csv) OR
- JSON files (users.json, accounts.json, transactions.json, liabilities.json)
- Both formats supported for flexible ingestion

---

### 2. Behavioral Signal Detection

Compute behavioral signals per time window to enable persona assignment and personalized recommendations.

#### 2.1 Time Windows
- **30-day window** - Short-term patterns and immediate concerns
- **180-day window** - Long-term trends and stability indicators

#### 2.2 Subscription Signals

**Detection Logic:**
- Identify recurring merchants (≥3 transactions in 90 days)
- Detect monthly/weekly cadence (±5 days tolerance)
- Handle amount variability (same merchant if within ±10% or ±$5)
- Examples: Netflix $15.99 → $17.99 still counts as one subscription

**Computed Metrics:**
- Count of recurring merchants
- Total monthly recurring spend
- Subscription spend as % of total spend

**Use Cases:**
- Persona 3 assignment (Subscription-Heavy)
- Subscription audit calculator pre-fill
- "You have 5 recurring subscriptions totaling $127/month" insights

#### 2.3 Savings Signals

**Detection Logic:**
- Track net inflows to savings-like accounts (savings, money market, cash management, HSA)
- Calculate growth rate over window
- Compute emergency fund coverage

**Computed Metrics:**
- Net savings inflow ($ per month)
- Savings growth rate (% change over window)
- Emergency fund coverage = savings balance / average monthly expenses
- Coverage flags: <1 month, 1-3 months, 3-6 months, >6 months

**Use Cases:**
- Persona 2 (Variable Income) and Persona 4 (Savings Builder) assignment
- Emergency fund calculator pre-fill
- "Your savings grew by 8% this quarter" insights

#### 2.4 Credit Signals

**Detection Logic:**
- Calculate utilization = balance / limit per card
- Detect minimum-payment-only patterns (last_payment ≈ minimum_payment for 3+ months)
- Track interest charges presence
- Monitor overdue status

**Computed Metrics:**
- Max utilization across all cards
- Average utilization
- Utilization tier flags: <30%, 30-50%, 50-80%, >80%
- Minimum payment only (boolean)
- Interest charges present (boolean)
- Any card overdue (boolean)

**Use Cases:**
- Persona 1 assignment (High Utilization)
- Critical alerts (>80% utilization, overdue)
- Debt payoff calculator pre-fill
- "Your Visa is at 68% utilization ($3,400 of $5,000 limit)" rationales

#### 2.5 Income Stability Signals

**Detection Logic:**
- Identify payroll deposits using:
  - Regular interval pattern (every 14 or 30 days ±3 days)
  - Consistent amount range (within 20% variability)
  - Positive transaction amounts >$500
  - Merchant keywords: "ADP", "Paychex", employer names, "Direct Deposit"

**Computed Metrics:**
- Payroll frequency (weekly, bi-weekly, monthly, irregular)
- Median pay gap (days between deposits)
- Income variability (coefficient of variation)
- Cash-flow buffer = checking balance / average monthly expenses (in months)

**Use Cases:**
- Persona 2 assignment (Variable Income Budgeter)
- Persona 5 assignment (high savings rate calculation)
- "You have 0.4 months of expenses in checking" warnings

---

### 3. Persona Assignment System

#### 3.1 Persona Definitions

**Persona 1: High Utilization**
- **Criteria:** Any card utilization ≥50% OR interest charges >0 OR minimum-payment-only OR is_overdue = true
- **Primary Focus:** Reduce utilization and interest; payment planning and autopay education
- **Educational Themes:** Debt paydown strategies, credit score impact, balance transfers, payment automation
- **Typical User Profile:** Credit card debt, paying interest, possibly missing payments or making minimums only

**Persona 2: Variable Income Budgeter**
- **Criteria:** Median pay gap >45 days AND cash-flow buffer <1 month
- **Primary Focus:** Percent-based budgets, emergency fund basics, smoothing strategies
- **Educational Themes:** Irregular income management, cash flow planning, buffer building, zero-based budgeting
- **Typical User Profile:** Freelancer, gig worker, seasonal employment, inconsistent paychecks

**Persona 3: Subscription-Heavy**
- **Criteria:** Recurring merchants ≥3 AND (monthly recurring spend ≥$50 in 30d OR subscription spend share ≥10%)
- **Primary Focus:** Subscription audit, cancellation/negotiation tips, bill alerts
- **Educational Themes:** Subscription tracking, spending leaks, negotiation tactics, budgeting tools
- **Typical User Profile:** Many streaming services, gym memberships, software subscriptions adding up

**Persona 4: Savings Builder**
- **Criteria:** Savings growth rate ≥2% over window OR net savings inflow ≥$200/month, AND all card utilizations <30%
- **Primary Focus:** Goal setting, automation, APY optimization (HYSA/CD basics)
- **Educational Themes:** Savings goals, account optimization, high-yield savings, automated transfers
- **Typical User Profile:** Actively saving, low credit utilization, building emergency fund or specific goals

**Persona 5: Net Worth Maximizer**
- **Criteria:** Savings rate ≥30% of income (≥$4,000/month absolute) OR total liquid savings ≥$40,000, AND all card utilizations <10%, AND checking + savings balance >6 months expenses
- **Primary Focus:** Investment optimization, tax-advantaged accounts, asset allocation, wealth building
- **Educational Themes:** HYSA vs. brokerage, 401k/IRA maximization, tax optimization, investment basics
- **Typical User Profile:** High income or high net worth, financially secure, ready for wealth growth strategies
- **Priority:** Takes precedence over other personas (high-value customer retention)

#### 3.2 Scoring Algorithm

**Methodology:**
Each user receives a score (0.0 to 1.0) for each persona based on how well they match the criteria.

**Scoring Logic (Pseudo):**
```
For each persona:
  - Start with score = 0.0
  - For each criteria met, add points
  - Stronger criteria violations add more points
  - Normalize final score to 0-1 range

Example for Persona 1 (High Utilization):
  - If max_utilization >= 0.80: score += 0.5
  - Else if max_utilization >= 0.50: score += 0.3
  - If interest_charges > 0: score += 0.2
  - If is_overdue: score += 0.3
  - If minimum_payment_only: score += 0.2
  - Final score = min(sum, 1.0)
```

**Persona Assignment:**
- **Primary Persona:** Highest scoring persona
- **Secondary Persona:** 2nd highest score (if score >0.3 threshold)
- Users can match multiple personas (not mutually exclusive)
- All 100 users must have at least one persona assigned

**Prioritization When Multiple Match:**
1. Persona 5 (Net Worth Maximizer) - always takes priority if qualified
2. Persona 1 (High Utilization) - critical financial health issue
3. Persona 2 (Variable Income Budgeter) - cash flow urgency
4. Persona 3 (Subscription-Heavy) - optimization opportunity
5. Persona 4 (Savings Builder) - positive momentum

#### 3.3 Persona Invisibility Principle

**Critical UX Decision:** Users should NOT see their persona labels in the interface.

**Rationale:**
- Avoids stigmatization ("High Utilization" sounds judgmental)
- Creates seamless, personalized experience
- Reduces user anxiety about categorization
- Focuses attention on actionable insights, not labels

**Backend vs. Frontend:**
- **Backend:** Stores persona assignments, uses for recommendation logic
- **Frontend:** Shows "based on your spending patterns..." not "because you're a High Utilization user"
- **Operator View:** Shows persona assignments for oversight and debugging

---

### 4. Recommendation Engine

#### 4.1 Recommendation Types

**Educational Content (3-5 items per user):**
- Curated articles from trusted sources (NerdWallet, Investopedia, CFPB)
- Mapped to personas and behavioral signals
- Each has persona affinity score (how relevant to each persona)

**Partner Offers (1-3 items per user):**
- Product/service recommendations based on eligibility
- Must pass eligibility checks before display
- Examples: Balance transfer cards, high-yield savings accounts, budgeting apps

#### 4.2 Content Catalog

**Educational Content (curated, 6 vetted links per persona = 30 total):**

**Content Storage Format (pre-tagged JSON, no scraping):**
```
{
  "id": "edu_credit_utilization_basics",
  "title": "Understanding Credit Utilization",
  "source": "NerdWallet",
  "url": "https://www.nerdwallet.com/article/...",
  "excerpt": "Credit utilization is the percentage...",
  "tags": ["credit", "utilization", "debt"],
  "persona_fit": ["high_utilization"],
  "signals": ["high_utilization", "interest_charges"],
  "editorial_summary": "100-word human-authored summary"
}
```

**Content Catalog Policy:**
- Hand-authored metadata only (tags, persona_fit, signals, summary). No web scraping.
- No LLM analysis for ranking or persona affinity. Relevance is rules-based via tags/persona_fit/signals.
- 30 total articles (6 per persona) to match prompt requirement.

**Partner Offers (15-20 total):**

**Offer Storage Format:**
```
JSON file per offer:
{
  "id": "balance_transfer_premium",
  "title": "0% APR Balance Transfer Card",
  "description": "Transfer high-interest balances and save...",
  "category": "credit_card",
  "eligibility": {
    "rules": [
      {"field": "max_utilization", "operator": ">=", "value": 0.5},
      {"field": "annual_income", "operator": ">=", "value": 40000},
      {"field": "interest_charges_present", "operator": "==", "value": true},
      {"field": "is_overdue", "operator": "==", "value": false}
    ],
    "required_signals": ["high_utilization"],
    "exclude_if_has_account": ["balance_transfer_card"]
  },
  "persona_fit": ["high_utilization"],
  "url": "https://partner.com/apply"
}
```

#### 4.3 Recommendation Selection Algorithm

**Selection Logic (Pseudo):**
```
For user with primary_persona and secondary_persona:
  
  1. Get user's behavioral signals
  
  2. Filter educational content:
     - Content with `persona_fit` containing primary_persona
     - Content with signals overlapping user's detected signals
     - Exclude content user has marked as "completed" or "dismissed"
     - Rank deterministically by (persona_fit match desc, signal_overlap desc, editorial_priority asc)
     - Select top 3-5 items
  
  3. Filter partner offers:
     - Check all eligibility rules pass
     - Check required signals match
     - Exclude if user has conflicting existing accounts
     - Rank deterministically by (required_signals match desc, persona_fit match desc)
     - Select top 1-3 items
  
  4. Generate rationale for each recommendation
  
  5. Return recommendations with rationales
```

**Recommendation Refresh:**
- On-demand when user clicks "refresh" or navigates to dashboard
- Uses cached signals/personas per user per window; `refresh` recomputes diffs only
- Not real-time (too expensive for demo)
- Not scheduled batch (not needed for static data demo)

#### 4.4 Rationale Generation

**Template-Based Approach (Not LLM):**
Each signal type has pre-written rationale templates that fill in user-specific data.

**Rationale Template Examples:**

**High Utilization Rationale:**
```
Template: "We noticed your {card_name} is at {utilization}% utilization (${balance} of ${limit} limit). Bringing this below 30% could improve your credit score and reduce interest charges of ${interest_monthly}/month."

Variables filled from user data:
- card_name: "Visa ending in 4523"
- utilization: 68
- balance: 3400
- limit: 5000
- interest_monthly: 87
```

**Subscription Rationale:**
```
Template: "You have {count} recurring subscriptions totaling ${monthly_total}/month. Reviewing these could free up ${potential_savings} for your {goal}."

Variables:
- count: 5
- monthly_total: 127
- potential_savings: 50 (assumes 40% could be canceled)
- goal: "emergency fund" (based on low savings signal)
```

**Rationale Requirements:**
- Plain language (no jargon)
- Cite specific data points
- Use neutral, supportive tone (no "overspending", "poor choices", etc.)
- Include legal disclaimer when needed

#### 4.5 User Actions on Recommendations

**Available Actions:**
- **Mark as Completed** - User finished reading/acting on recommendation
- **Save for Later** - User wants to revisit (adds to saved list)
- **Dismiss / Not Interested** - Remove from current recommendations
- **Undismiss** - User can restore dismissed items from settings

**Dismissed Item Behavior:**
- Item removed from recommendation pool
- User can view dismissed items in settings
- User can undismiss to add back to pool
- Dismissed status stored per user per recommendation

---

### 5. User Experience Requirements

#### 5.1 Application Structure

**Core Pages:**
1. **Home Dashboard** - Primary landing page with recommendations and alerts
2. **Insights** - Detailed view of user's signals and financial patterns
3. **Education Library** - Browse all available educational content
4. **Settings** - Consent management, account preferences, dismissed items

#### 5.2 Home Dashboard

**Layout Priority (Top to Bottom):**

**Critical Alert Banners:**
Display at very top when conditions met:
- 🔴 **Red Alert (Critical):** Credit card overdue, utilization >80%, savings balance <$100
- 🟡 **Yellow Warning:** Utilization 50-80%, minimum payment only pattern
- ℹ️ **Blue Info:** 3+ subscriptions detected, low emergency fund coverage (<3 months)

**Alert Display Rules:**
- Show maximum 2 critical alerts at once (avoid overwhelming)
- Priority: Overdue > 80% utilization > savings <$100
- User can dismiss but will reappear until condition resolves
- Include "Learn more" link to relevant educational content

**For You Today Section:**
List format with expandable recommendation cards:

**Recommendation Card Structure:**
```
┌─────────────────────────────────────────────────┐
│ [Icon] Recommendation Title                     │
│                                                  │
│ [Collapsed] Preview text (first 60 chars)...    │
│                                                  │
│ [Expanded] Full rationale:                      │
│ "We noticed your Visa ending in 4523 is at 68%  │
│ utilization ($3,400 of $5,000 limit). Bringing  │
│ this below 30% could improve your credit score  │
│ and reduce interest charges of $87/month."      │
│                                                  │
│ [Learn More Button] [Dismiss] [Save for Later]  │
└─────────────────────────────────────────────────┘
```

**Mixing Content Types:**
- Interleave education items and partner offers naturally
- Example: Education, Education, Offer, Education, Offer
- No separate sections (feels more native)

**Empty State:**
If user has no recommendations: "You're doing great! Check back later for new insights."

#### 5.3 Chat Interface

**Embedded Sidebar Chat:**
- Chat icon in bottom-right corner
- Clicks opens sidebar overlay (slides in from right)
- Persistent across pages (stays open when navigating)
- Conversation history retained for 30 days
- Maximum 100 messages per user per session (rate limiting)

**Chat Opening Experience:**
When user first opens chat, display suggested questions:
- "Why am I seeing these recommendations?"
- "How much do I spend on subscriptions?"
- "What's my credit utilization?"
- "Explain emergency fund coverage"
- "Show me my spending patterns"

**Chat Capabilities:**
- Answer questions about user's data (using function calls to backend)
- Explain financial terms in user's context
- Clarify why recommendations were made
- General financial education (not advice)

**Chat Limitations (Enforced):**
- Cannot give financial advice ("you should invest in...")
- Cannot recommend specific products directly
- Cannot make predictions ("your credit score will improve...")
- Cannot access or modify accounts
- Cannot process transactions

**LLM Integration:**
- OpenAI GPT-4o-mini with strict function calling
- Determinism settings: temperature=0, top_p=1, presence/frequency penalties=0
- Tool policy: only 9 approved read-only tools (see Architecture PRD); no tool can modify state or trigger recompute
- Consent gating applied before any tool call; chat cannot access data for non-consenting users
- Chat does not rank content or decide eligibility; it surfaces system results with rationales
- Template fallback response for out-of-scope questions
- All responses must avoid advice-giving language

#### 5.4 Interactive Calculators

**Calculator 1: Emergency Fund Calculator**
- **Pre-filled Data:** Current savings balance, average monthly expenses
- **User Input:** Target months of coverage (default: 6)
- **Output:** 
  - Current coverage in months
  - Gap to target ($)
  - Progress bar visualization
  - Suggested monthly savings to reach goal in X months

**Calculator 2: Debt Payoff Simulator**
- **Pre-filled Data:** Current credit card balances, APRs, minimum payments
- **User Input:** Extra payment amount per month
- **Output:**
  - Payoff timeline (months)
  - Total interest paid (current vs. with extra payments)
  - Interest savings ($)
  - Visual payoff chart

**Calculator 3: Subscription Audit Tool**
- **Pre-filled Data:** All detected recurring subscriptions with amounts
- **User Input:** Mark each as "keeping" or "consider canceling"
- **Output:**
  - Total monthly spend
  - Potential monthly savings
  - Annual savings projection
  - List of subscriptions to review

**Calculator Features:**
- All calculators use user's actual data (not blank slates)
- Results can be saved to user profile
- "Take Action" buttons link to relevant educational content
- Calculations shown with clear formulas (transparency)

#### 5.5 Insights Page

**Purpose:** Show user their behavioral signals and data patterns (operator-view-lite for users)

**Content Sections:**
1. **Your Financial Snapshot** - High-level metrics (income, spending, saving, credit)
2. **Spending Patterns** - Category breakdown, recurring vs. one-time, trends
3. **Credit Health** - Utilization per card, payment history, interest charges
4. **Savings Progress** - Balance trends, inflow/outflow, emergency fund status
5. **Income Analysis** - Frequency, variability, payroll detection

**Visualization:**
- Simple charts (bar, line, pie) using Chart.js or Recharts
- No complex ML models or predictions
- Just clear data representation

#### 5.6 Education Library

**Purpose:** Browse all educational content, not just personalized recommendations

**Features:**
- Filter by topic (credit, savings, budgeting, investing, debt)
- Search by keyword
- Sort by relevance, date, popularity
- Shows all 30 curated articles
- Each article card shows title, excerpt, source, "Read More" link

**Content Display:**
- External link opens in new tab (primary)
- Inline display optional using local editorial summaries only (no scraping)

#### 5.7 Settings Page

**Consent Management:**
- View current consent status
- Revoke consent (stops all data processing and recommendations)
- Re-enable consent

**Account Preferences:**
- Update email (for future email notifications)
- Change password
- Logout

**Dismissed Items:**
- View list of dismissed recommendations
- Undismiss button to restore to active pool

---

### 6. Consent, Eligibility & Tone Guardrails

#### 6.1 Consent System

**Opt-In Requirement:**
- Explicit consent required before any data processing
- Shown on first login as modal: "Allow SpendSense to analyze your transaction data?"
- Clear explanation of what data is used and why
- Consent stored per user in database

**Consent Revocation:**
- User can revoke consent at any time from Settings
- Upon revocation:
  - Stop all data processing
  - Clear all recommendations
  - Maintain account but no personalization
  - User can re-enable later

**No Consent = No Recommendations:**
If user has not consented, show: "Enable personalized insights by allowing SpendSense to analyze your data."

**Consent Enforcement (Gating):**
- Consent is enforced on all compute and read paths: `GET /api/profile/:userId`, `GET /api/recommendations/:userId` (including `?refresh=true`).
- Revocation immediately halts processing and clears recommendations; recomputation is blocked until consent is re-enabled.
- Operator-triggered generation or recomputation actions are blocked for users without consent.

#### 6.2 Eligibility Checking

**Multi-Factor Eligibility Rules:**
Each partner offer has structured eligibility criteria that must ALL pass.

**Example Eligibility Rule Set:**
```
Offer: Premium Balance Transfer Card
Rules:
  - max_utilization >= 50% (user needs this)
  - annual_income >= $40,000 (minimum requirement)
  - interest_charges_present == true (observable signal)
  - is_overdue == false (exclude if overdue)
  - existing_accounts NOT contains "balance_transfer_card" (don't double-offer)
```

**Eligibility Check Logic:**
- Run all rules before showing offer to user
- If ANY rule fails, exclude offer from recommendations
- Log exclusion reason for operator review
- Never show ineligible offers (prevents frustration and compliance issues)

**Harmful Product Exclusion:**
- Blocklist predatory products: payday loans, high-interest personal loans, pyramid scheme "opportunities"
- No offers with APR >36% (usury prevention)
- No offers targeting vulnerable users (variable income + high-interest credit)

#### 6.3 Tone Guardrails

**Comprehensive Blocklist of Prohibited Phrases:**

**Financial Advice (NEVER use):**
- "you should", "I recommend", "I advise", "I suggest you"
- "the best option is", "you must", "you need to"
- "do this", "make sure you", "definitely", "always" (prescriptive)
- "never" (prescriptive), "guaranteed", "certainly will"

**Shaming Language (NEVER use):**
- "overspending", "wasteful", "poor choices", "bad with money"
- "irresponsible", "careless", "reckless", "foolish"
- "mistake" (when judging user behavior)

**Predictions/Guarantees (NEVER use):**
- "will improve", "guaranteed", "you'll see results"
- "this will fix", "promise"

**Mandates (NEVER use):**
- "you have to", "required", "necessary" (prescriptive)

**Preferred Empowering Language (DO use):**
- "you might consider", "some people find", "one approach is"
- "this could help you", "you're in control", "when you're ready"
- "explore options", "learn about", "many users", "consider"

**Tone Validation:**
- All rationales run through blocklist checker before display
- LLM-based agentic review as secondary check
- Operator can flag tone issues post-facto

#### 6.4 Automated Pre-Publish Checks + Operator Gate

**Pre-Publish Checks (Automated) with Operator Gating:**
Before showing recommendation to user, run automated review:

**Review Process:**
1. **Blocklist Check** - Scan rationale text for prohibited phrases
2. **Eligibility Revalidation** - Confirm all offer rules still pass
3. **LLM Compliance Review (Advisory Only)** - OpenAI function call asks:
   - "Does this contain financial advice?"
   - "Does this use shaming language?"
   - "Does this make guarantees/predictions?"
   - Response: APPROVE or FLAG with reason

**If Flagged (Operator Gate):**
- Log to operator review dashboard (post-hoc)
- Do NOT show to user (block automatically)
- Operator can investigate and fix issue
- System learns from corrections (future improvement)

**If Approved:**
- Show to user immediately
- Log decision trace for audit

**Legal Disclaimer:**
Every recommendation includes: "This is educational content, not financial advice. Consult a licensed advisor for personalized guidance."

Displayed at bottom of recommendation card or in modal when user clicks "Learn More."

---

### 7. Operator View & Oversight

#### 7.1 Purpose
Provide internal oversight interface for compliance, QA, and debugging. Operators can review signals, personas, recommendations, and decision traces with manual override capabilities.

#### 7.2 Operator Dashboard (Admin Page)

**Access Control:**
- Separate operator role in authentication system
- Operators log in with operator credentials (not regular user accounts)
- Role-based access control enforces operator-only endpoints

**Dashboard Overview Page:**
- System statistics: Total users, total recommendations, flagged items count
- Persona distribution chart (20 users per persona type)
- Recent activity feed (new users, flagged recommendations, operator actions)
- Quick links to: User search, Flagged items queue, System metrics

#### 7.3 Operator Capabilities (Per Spec Requirements)

**View Detected Signals for Any User:**
- Search for user by email or ID
- Display all behavioral signals for selected user:
  - 30-day signals (subscriptions, savings, credit, income)
  - 180-day signals (same categories)
- Visual indicators for signal thresholds (e.g., utilization >50% shown in red)

**See Short-term (30d) and Long-term (180d) Persona Assignments:**
- Primary persona with score
- Secondary persona with score
- Criteria met for each persona assignment
- Comparison view: 30d persona vs. 180d persona (shows if persona changed)

**Review Generated Recommendations with Rationales:**
- List all recommendations for selected user
- Expandable view showing:
  - Full recommendation text
  - "Because" rationale with cited data
  - Recommendation type (education vs. offer)
  - Status (active, dismissed, completed, hidden)
  - Agentic review status (approved, flagged)

**Approve or Override Recommendations:**
- **Approve** flagged recommendations:
  - Review flagged item
  - Add approval notes
  - Click "Approve" → Makes visible to user
- **Hide/Override** any recommendation:
  - Select recommendation (active or flagged)
  - Provide reason for hiding
  - Click "Hide from User" → Removes from user's view
  - Action logged in audit trail
- **Note:** Operators can proactively hide any active recommendation (not just flagged ones), fulfilling the assignment requirement for "approve or override" capabilities.

**Access Decision Trace (Why This Recommendation Was Made):**
- Click "View Decision Trace" on any recommendation
- Display modal/panel showing:
  - User signals at time of generation
  - Persona scores (primary/secondary)
  - Content matching logic (persona affinity scores)
  - Eligibility rules evaluated (which passed/failed)
  - Rule path: inputs → rules matched → eligibility filters → selected item
  - Rationale template used
  - Agentic review result
  - Timestamp of generation

**Flag Recommendations for Review:**
- Manual flag button on any recommendation
- Add flag reason/notes
- Adds to flagged recommendations queue
- Can unflag after review

#### 7.4 Operator UI Components

**User Search & Selection:**
- Search bar: Search by email or user ID
- Results table: Email, persona, consent status, recommendation count
- Click user → Opens user detail view

**User Detail View:**
- Tabs: Overview, Signals, Recommendations, Audit Log
- **Overview Tab:**
  - User info, consent status, account summary
  - Persona assignments (30d and 180d)
  - Quick stats (# recommendations, # dismissed, # flagged)
- **Signals Tab:**
  - Tables showing all computed signals
  - Toggle between 30d and 180d view
  - Raw values + interpretations
- **Recommendations Tab:**
  - List of all recommendations (filter by status)
  - Actions: View trace, Hide, Flag for review
- **Audit Log Tab:**
  - All operator actions on this user
  - Who, what, when, why

**Flagged Items Queue:**
- Table of all flagged recommendations across all users
- Columns: User, Recommendation title, Flag reason, Flagged date
- Actions: Approve, Hide, View user profile
- Sortable and filterable

**Persona Override Tool:**
- For testing/debugging only
- Select user → Choose new primary persona
- Provide reason for override
- Apply override → Regenerates recommendations
- Logged in audit trail

#### 7.5 Operator Actions Audit Trail

**All operator actions are logged:**
- Action type (approve, hide, flag, override)
- Operator ID (who performed action)
- Timestamp (when)
- Target (user ID, recommendation ID)
- Reason/notes
- Original state vs. new state

**Audit log accessible by:**
- Admin-level operators only
- Filterable by date, operator, action type
- Exportable to CSV for compliance reporting

#### 7.6 Guardrails for Operators

**Operators Cannot:**
- View user passwords (hashed only)
- Directly modify user accounts or balances
- Generate recommendations without signals (must follow system logic)
- Delete audit log entries

**Operators Can:**
- Override visibility of recommendations
- Flag/unflag recommendations
- Manually adjust persona assignments (for testing)
- View all user data (with consent status visible)

---

### 8. Evaluation & Success Metrics

#### 8.1 Success Criteria Table

| Category | Metric | Target |
|----------|--------|--------|
| Coverage | Users with assigned persona + ≥3 behaviors | 100% |
| Explainability | Recommendations with rationales | 100% |
| Latency | Time to generate recommendations per user | <5 seconds |
| Auditability | Recommendations with decision traces | 100% |
| Code Quality | Passing unit/integration tests | ≥10 tests |
| Documentation | Schema and decision log clarity | Complete |

#### 8.2 Evaluation Metrics

**Coverage Analysis:**
- Count users with at least one persona assigned
- Count users with ≥3 detected behavioral signals
- Target: 100% (all 100 synthetic users)

**Explainability Analysis:**
- Count recommendations with rationales
- Verify rationales cite specific data points
- Manual review of rationale quality
- Target: 100% have rationales

**Relevance Analysis:**
- Measures how well recommendations match user's persona and signals
 - **Scoring Method (deterministic):**
  - Relevance score = (persona_fit_match ? 1 : 0) * 0.7 + (signal_overlap_ratio) * 0.3
  - persona_fit_match: 1 if content `persona_fit` includes primary persona; else 0
  - signal_overlap_ratio: fraction of content `signals` present in user's detected signals (0-1)
 - **Calculation Example:**
  - User: Primary persona = High Utilization
  - Content: persona_fit = ["high_utilization"], signals = ["high_utilization", "interest_charges"]
  - User has both signals present
  - Relevance = (1 * 0.7) + (1.0 * 0.3) = 1.0 (perfect match)
 - **Target:** Average relevance score ≥ 0.7 across all recommendations

**Latency Measurement:**
- Time from API request to response for GET /api/recommendations/{user_id}
- Measure on laptop (not cloud VM)
- Target: <5 seconds per user

**Auditability Analysis:**
- Count recommendations with complete decision traces
- Verify trace includes signals, persona scores, eligibility checks
- Target: 100% have traces

**Code Quality:**
- Run automated test suite
- Verify ≥10 tests passing
- Test coverage: signal detection, persona assignment, eligibility, API endpoints

**Fairness Analysis:**
- Skipped by design for MVP (no demographic data collected). This deferral is documented in `/docs/LIMITATIONS.md`.
- Future enhancement: If demographics are added, compute simple demographic parity checks for persona assignment and offer exposure.

#### 8.3 Output Artifacts

**Metrics File:**
JSON/CSV file containing:
- Coverage percentage
- Explainability percentage
- Average latency
- Auditability percentage
- Test pass/fail count
- Fairness metrics (if applicable)

**Summary Report:**
1-2 page document summarizing:
- Overall system performance
- Success criteria met
- Known limitations
- Future improvements

**Per-User Decision Traces:**
JSON file per user containing:
- User ID
- Detected signals
- Persona assignments with scores
- Generated recommendations
- Rationales
- Eligibility checks
- Timestamps

#### 8.4 Minimum Test Coverage (≥10 tests)

- Subscription cadence detection (recurring merchants, cadence tolerances)
- Credit utilization flags and tiers; min-payment-only detection; interest presence
- Consent gating on `/api/profile` and `/api/recommendations` (incl. `?refresh=true`)
- Offer eligibility rules (first-order signals only; existing-account filters)
- Tone blocklist enforcement (unit test fails on prohibited phrases)
- Rationale template variable substitution and shape
- Metrics harness output shape (coverage, explainability, latency, auditability)
- Operator override audit entry (before/after, operator id, timestamp)

---

### 9. Authentication & Security

#### 9.1 User Authentication

**Username/Password:**
- Email as username
- Password hashed with bcrypt
- JWT token issued on successful login
- Token expires after 24 hours

**OAuth:**
- Excluded for MVP privacy compliance; synthetic users log in with mock email credentials only

**Session Management:**
- JWT stored in httpOnly cookie (XSS protection)
- Token includes user_id, role, consent_status
- Backend validates token on every API request

#### 9.2 Data Privacy

**No Real PII:**
- All synthetic users use fake names
- Account numbers masked (e.g., "Visa ending in 4523")
- No SSN, real addresses, or real financial data

**Consent Tracking:**
- Consent status stored per user
- API endpoints check consent before processing
- User can view and revoke consent anytime

---

### 10. Out of Scope (Future Enhancements)

**Not Included in MVP:**
- Real Plaid API integration (using synthetic data only)
- Email notifications
- Push notifications
- Mobile app (web only)
- Multi-language support
- Real-time transaction streaming
- Investment account integration
- Bill pay functionality
- Account aggregation from multiple banks
- Social features or sharing
- Gamification (beyond basic calculators)
- Advanced ML models (rules-based only)

**Explicitly Excluded:**
- Financial advice (stay educational only)
- Direct account access or modification
- Transaction processing
- Product sales or referral commissions
- Integration with real banks (demo only)

---

### 11. Non-Functional & Performance Requirements

**Storage Posture:**
- SQLite is the system of record for all runtime queries and caching.
- Parquet export is optional for offline analytics; not used in runtime signal queries.

**Indices (SQLite):**
- Create indices on `transactions(account_id, date)`, `transactions(merchant_name)`, and `transactions(personal_finance_category_primary)`.

**Caching & Recompute:**
- Cache signals and personas per user per window (30d, 180d). Store `computed_at`.
- `refresh=true` recomputes diffs against cached values; avoid full recompute unless cache missing/stale.

**Latency Target:**
- <5 seconds to generate recommendations per user (measured exactly in evaluation harness).
- Rationale templates use string formatting only (no LLM generation on the hot path).

**Determinism:**
- Seed all generators and template selections for reproducible runs.
- Chat model called with temperature=0 and fixed tool list; results must reference system data.

---

## Conclusion

SpendSense demonstrates an explainable, consent-aware approach to personalized financial education. By detecting behavioral patterns, assigning invisible personas, and delivering tailored recommendations with clear rationales, the system helps users understand their financial data without crossing into regulated advice territory.

The system prioritizes transparency, user control, and fairness - building trust through clear explanations grounded in actual data. Every recommendation cites specific data points, and users maintain full control through explicit consent management.

This PRD defines the requirements for a 2-day sprint to build a proof-of-concept demonstrating these principles with 100 synthetic users across 5 personas, delivering personalized insights through a modern web application with REST API, chat interface, and operator oversight tools.

**Core Principles Reinforced:**
- Transparency over sophistication
- User control over automation
- Education over sales
- Fairness built in from day one

Build systems people can trust with their financial data.

---

**Document Version:** 1.0  
**Total Lines:** ~695
