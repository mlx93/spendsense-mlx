# SpendSense - Data Model Schema

**Version:** 1.0  
**Date:** November 3, 2025  
**Project:** SpendSense

---

## Overview

This document defines the complete data model for SpendSense, including all database tables, relationships, and field definitions. The schema is designed to match Plaid's data structure exactly as specified in the assignment prompt.

---

## Database: SQLite (Development)

**File:** `spendsense.db`  
**ORM:** Prisma  
**Migration Tool:** `npx prisma migrate`

---

## Core Tables

### 1. `users`

User accounts and authentication.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (UUID) | Primary Key | Unique user identifier |
| `email` | String | Unique, Indexed | Email address (username) |
| `password_hash` | String | Not Null | Bcrypt hashed password |
| `consent_status` | Boolean | Default: false | User consent for data processing |
| `consent_date` | DateTime | Nullable | Date consent was given |
| `role` | String | Enum: 'user', 'operator' | User role (default: 'user') |
| `created_at` | DateTime | Auto | Account creation timestamp |
| `updated_at` | DateTime | Auto | Last update timestamp |

**Relationships:**
- One-to-many: `accounts`
- One-to-many: `signals`
- One-to-many: `personas`
- One-to-many: `recommendations`
- One-to-many: `chat_messages`
- One-to-many: `user_feedback`

---

### 2. `accounts`

Plaid Accounts structure (EXACTLY as specified in PDF).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `account_id` | String | Primary Key | Plaid account identifier (e.g., "acc_9xKjP8vQw2T5") |
| `user_id` | String (UUID) | Foreign Key → users.id | Owner of account |
| `type` | String | Enum: checking, savings, credit_card, money_market, hsa | Account type (REQUIRED) |
| `subtype` | String | Nullable | Additional classification (e.g., "rewards", "standard") |
| `balance_available` | Decimal | Nullable | Funds available for immediate use |
| `balance_current` | Decimal | Not Null | Total current balance |
| `balance_limit` | Decimal | Nullable | Credit limit (REQUIRED when type=credit_card) |
| `iso_currency_code` | String | Default: 'USD' | Currency code |
| `holder_category` | String | Default: 'personal' | Must be 'personal' (business excluded) |
| `created_at` | DateTime | Auto | Record creation timestamp |
| `updated_at` | DateTime | Auto | Last update timestamp |

**Relationships:**
- Many-to-one: `user` (users.id)
- One-to-many: `transactions` (transactions.account_id)
- One-to-one: `liability` (liabilities.account_id, optional)

**Indexes:**
- `user_id` (for efficient user account lookup)
- `type` (for filtering by account type)

**Field Validation:**
- `type` must be one of: checking, savings, credit_card, money_market, hsa
- `balance_limit` required when type = 'credit_card', null otherwise
- `holder_category` must be 'personal' (business accounts excluded)

---

### 3. `transactions`

Plaid Transactions structure (EXACTLY as specified in PDF).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `transaction_id` | String | Primary Key | Plaid transaction identifier (e.g., "txn_7pQr3WsYv5N2") |
| `account_id` | String | Foreign Key → accounts.account_id | Account this transaction belongs to |
| `date` | Date | Not Null, Indexed | Transaction date |
| `amount` | Decimal | Not Null | Amount (negative for debits, positive for credits) |
| `merchant_name` | String | Nullable, Indexed | Merchant display name |
| `merchant_entity_id` | String | Nullable | Standardized merchant ID |
| `payment_channel` | String | Enum: online, in_store, other | Payment channel |
| `personal_finance_category_primary` | String | Indexed | Top-level category (e.g., FOOD_AND_DRINK) |
| `personal_finance_category_detailed` | String | Top-level.Detailed (e.g., FOOD_AND_DRINK.RESTAURANTS) |
| `pending` | Boolean | Default: false | Transaction pending status |
| `created_at` | DateTime | Auto | Record creation timestamp |

**Relationships:**
- Many-to-one: `account` (accounts.account_id)

**Indexes:**
- `(account_id, date)` (for time-series queries and windowed signal detection)
- `merchant_name` (for recurring transaction detection)
- `personal_finance_category_primary` (for spending analysis)

**Field Validation:**
- `amount` negative for debits (spending), positive for credits (income/refunds)
- At least one of `merchant_name` OR `merchant_entity_id` must be present
- `payment_channel` must be one of: online, in_store, other
- `personal_finance_category` must use Plaid's category taxonomy

**Category Taxonomy (Plaid):**
- `INCOME`: INCOME.PAYROLL, INCOME.INVESTMENT, INCOME.OTHER
- `FOOD_AND_DRINK`: FOOD_AND_DRINK.RESTAURANTS, FOOD_AND_DRINK.GROCERIES
- `TRANSPORTATION`: TRANSPORTATION.GAS, TRANSPORTATION.PUBLIC_TRANSIT
- `ENTERTAINMENT`: ENTERTAINMENT.STREAMING, ENTERTAINMENT.CONCERTS
- `SHOPPING`: SHOPPING.ONLINE, SHOPPING.GENERAL
- `TRANSFER`: TRANSFER.SAVINGS, TRANSFER.CREDIT_CARD_PAYMENT

---

### 4. `liabilities`

Plaid Liabilities structure (EXACTLY as specified in PDF).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (UUID) | Primary Key | Unique liability identifier |
| `account_id` | String | Foreign Key → accounts.account_id, Unique | Credit card or loan account |
| `liability_type` | String | Enum: credit_card, mortgage, student_loan | Type of liability |
| **Credit Card Fields (REQUIRED when liability_type='credit_card'):** | | | |
| `aprs` | JSON | Not Null (if credit_card) | Array of APR objects: `[{"apr_type": "purchase_apr", "apr_percentage": 18.99}]` |
| `minimum_payment_amount` | Decimal | Not Null (if credit_card) | Minimum payment due |
| `last_payment_amount` | Decimal | Not Null (if credit_card) | Amount of last payment made |
| `is_overdue` | Boolean | Not Null (if credit_card) | Overdue payment status |
| `next_payment_due_date` | Date | Not Null (if credit_card) | Next payment due date |
| `last_statement_balance` | Decimal | Not Null (if credit_card) | Balance on last statement |
| **Mortgage/Student Loan Fields (REQUIRED when liability_type='mortgage' or 'student_loan'):** | | | |
| `interest_rate` | Decimal | Not Null (if mortgage/student_loan) | Annual interest rate percentage |
| `next_payment_due_date` | Date | Not Null (if mortgage/student_loan) | Next payment due date |
| `created_at` | DateTime | Auto | Record creation timestamp |
| `updated_at` | DateTime | Auto | Last update timestamp |

**Relationships:**
- One-to-one: `account` (accounts.account_id)

**Indexes:**
- `account_id` (unique constraint)
- `is_overdue` (for alert detection)

**APR Types:**
- `purchase_apr`: Standard purchase rate
- `cash_advance_apr`: Cash advance rate
- `balance_transfer_apr`: Balance transfer rate
- `penalty_apr`: Penalty rate for late payments

**Field Validation:**
- Credit card accounts MUST have: aprs, minimum_payment_amount, last_payment_amount, is_overdue, next_payment_due_date, last_statement_balance
- Mortgage/Student loan accounts MUST have: interest_rate, next_payment_due_date
- `aprs` stored as JSON array to support multiple APR types

---

### 5. `signals`

Computed behavioral signals per user per time window.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (UUID) | Primary Key | Unique signal record identifier |
| `user_id` | String (UUID) | Foreign Key → users.id, Indexed | Owner of signals |
| `signal_type` | String | Enum: subscription, savings, credit, income | Type of signal |
| `window_days` | Integer | Enum: 30, 180 | Time window (30-day or 180-day) |
| `data` | JSON | Not Null | Signal-specific metrics |
| `computed_at` | DateTime | Auto, Indexed | Timestamp when signal was computed |

**Relationships:**
- Many-to-one: `user` (users.id)

**Indexes:**
- `(user_id, signal_type, window_days)` (for efficient lookup)

**Signal Data Structure (JSON):**

**Subscription Signals:**
```json
{
  "count": 5,
  "monthly_spend": 127.50,
  "share_of_total": 0.12,
  "recurring_merchants": ["Netflix", "Spotify", "Adobe"]
}
```

**Savings Signals:**
```json
{
  "net_inflow": 200.00,
  "growth_rate": 0.03,
  "emergency_fund_coverage": 1.2,
  "savings_balance": 5000.00
}
```

**Credit Signals:**
```json
{
  "max_utilization": 0.68,
  "avg_utilization": 0.45,
  "utilization_flag": "high",
  "interest_charges": 87.00,
  "minimum_payment_only": true,
  "any_overdue": false
}
```

**Income Signals:**
```json
{
  "frequency": "bi_weekly",
  "median_gap_days": 14,
  "income_variability": 0.15,
  "cash_flow_buffer": 0.8,
  "average_monthly_income": 5000.00
}
```

---

### 6. `personas`

User's persona assignments with scores.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (UUID) | Primary Key | Unique persona record identifier |
| `user_id` | String (UUID) | Foreign Key → users.id, Indexed | Owner of persona |
| `persona_type` | String | Enum: high_utilization, variable_income, subscription_heavy, savings_builder, net_worth_maximizer | Persona type |
| `score` | Decimal | Range: 0.0-1.0 | Persona match score |
| `rank` | Integer | Enum: 1, 2 | 1 = primary, 2 = secondary |
| `window_days` | Integer | Enum: 30, 180 | Time window (30-day or 180-day) |
| `criteria_met` | JSON | Not Null | List of criteria that qualified user |
| `computed_at` | DateTime | Auto | Timestamp when persona was assigned |

**Relationships:**
- Many-to-one: `user` (users.id)

**Indexes:**
- `(user_id, rank)` (to get primary/secondary personas)
- `(user_id, window_days, rank)` (for efficient lookup)

**Criteria Met Structure (JSON):**
```json
{
  "utilization_over_50": true,
  "interest_charges": true,
  "minimum_payment_only": false
}
```

---

### 7. `content`

Educational content library (pre-tagged metadata).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (UUID) | Primary Key | Unique content identifier |
| `title` | String | Not Null | Article title |
| `source` | String | Not Null | Publication (NerdWallet, Investopedia, CFPB, etc.) |
| `url` | String | Not Null, Unique | External link to full article |
| `excerpt` | String | Nullable | Short preview text |
| `tags` | JSON | Not Null | Array of topic tags: `["credit", "utilization", "debt"]` |
| `persona_fit` | JSON | Not Null | Array of persona types: `["high_utilization"]` |
| `signals` | JSON | Not Null | Array of signal types: `["high_utilization", "interest_charges"]` |
| `editorial_summary` | Text | Not Null | Human-authored 100-word summary |
| `editorial_priority` | Integer | Default: 50 | Sorting priority (lower = higher priority) |
| `created_at` | DateTime | Auto | Record creation timestamp |
| `updated_at` | DateTime | Auto | Last update timestamp |

**Relationships:**
- Many-to-many: `recommendations` (through recommendation_content junction, not shown in schema)

**Indexes:**
- `tags` (for filtering)
- `persona_fit` (for content matching)

---

### 8. `offers`

Partner product/service offers.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (UUID) | Primary Key | Unique offer identifier |
| `title` | String | Not Null | Offer title |
| `description` | Text | Not Null | Offer description |
| `category` | String | Not Null | Offer category (credit_card, savings_account, budgeting_app, etc.) |
| `eligibility_rules` | JSON | Not Null | Array of rule objects (see example below) |
| `required_signals` | JSON | Not Null | Array of signal types: `["high_utilization"]` |
| `exclude_if_has_account` | JSON | Not Null | Array of account types to exclude: `["balance_transfer_card"]` |
| `persona_fit` | JSON | Not Null | Array of persona types: `["high_utilization"]` |
| `url` | String | Not Null | Partner application link |
| `created_at` | DateTime | Auto | Record creation timestamp |
| `updated_at` | DateTime | Auto | Last update timestamp |

**Eligibility Rules Structure (JSON):**
```json
[
  {"field": "max_utilization", "operator": ">=", "value": 0.5},
  {"field": "annual_income", "operator": ">=", "value": 40000},
  {"field": "interest_charges_present", "operator": "==", "value": true},
  {"field": "is_overdue", "operator": "==", "value": false}
]
```

**Operators:** `>=`, `<=`, `==`, `!=`, `>`, `<`

---

### 9. `recommendations`

Generated recommendations for users.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (UUID) | Primary Key | Unique recommendation identifier |
| `user_id` | String (UUID) | Foreign Key → users.id, Indexed | Owner of recommendation |
| `type` | String | Enum: education, offer | Recommendation type |
| `content_id` | String (UUID) | Foreign Key → content.id, Nullable | If type=education, link to content |
| `offer_id` | String (UUID) | Foreign Key → offers.id, Nullable | If type=offer, link to offer |
| `rationale` | Text | Not Null | Generated explanation (template-based) |
| `persona_type` | String | Not Null | Persona that triggered this recommendation |
| `signals_used` | JSON | Not Null | Array of signals that matched: `["high_utilization", "interest_charges"]` |
| `decision_trace` | JSON | Not Null | Audit log of why this was chosen (see example below) |
| `status` | String | Enum: active, dismissed, completed, saved, hidden | Recommendation status |
| `agentic_review_status` | String | Enum: approved, flagged | Automated review result |
| `agentic_review_reason` | Text | Nullable | Reason if flagged |
| `created_at` | DateTime | Auto | Timestamp when recommendation was generated |
| `updated_at` | DateTime | Auto | Last update timestamp |

**Relationships:**
- Many-to-one: `user` (users.id)
- Many-to-one: `content` (content.id, nullable)
- Many-to-one: `offer` (offers.id, nullable)

**Indexes:**
- `(user_id, status)` (for getting active recommendations)

**Decision Trace Structure (JSON):**
```json
{
  "signals_snapshot": {
    "credit": {
      "max_utilization": 0.68,
      "interest_charges": 87.00
    }
  },
  "persona_scores": {
    "primary": {"type": "high_utilization", "score": 0.85},
    "secondary": {"type": "subscription_heavy", "score": 0.62}
  },
  "rule_path": [
    "content_filter:persona_fit",
    "content_filter:signal_overlap",
    "eligibility:utilization>=0.5"
  ],
  "eligibility_results": {
    "passed": true,
    "failed_rules": []
  },
  "rationale_template_id": "credit_utilization_v1",
  "generated_at": "2025-11-03T10:00:00Z"
}
```

---

### 10. `user_feedback`

User actions on recommendations.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (UUID) | Primary Key | Unique feedback identifier |
| `user_id` | String (UUID) | Foreign Key → users.id | User who provided feedback |
| `recommendation_id` | String (UUID) | Foreign Key → recommendations.id | Recommendation acted upon |
| `action` | String | Enum: dismissed, completed, saved, clicked | User action |
| `timestamp` | DateTime | Auto | When action was taken |

**Relationships:**
- Many-to-one: `user` (users.id)
- Many-to-one: `recommendation` (recommendations.id)

---

### 11. `chat_messages`

Chat conversation history.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (UUID) | Primary Key | Unique message identifier |
| `user_id` | String (UUID) | Foreign Key → users.id, Indexed | User in conversation |
| `role` | String | Enum: user, assistant, system | Message role |
| `content` | Text | Not Null | Message content |
| `function_call` | JSON | Nullable | If assistant called a function, tool name and args |
| `function_result` | JSON | Nullable | Result of function call |
| `timestamp` | DateTime | Auto, Indexed | When message was sent |

**Relationships:**
- Many-to-one: `user` (users.id)

**Indexes:**
- `(user_id, timestamp)` (for retrieving conversation history)

**Retention:**
- Delete messages older than 30 days (scheduled job)

---

### 12. `operator_audit_log`

Audit trail of all operator actions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (UUID) | Primary Key | Unique audit entry identifier |
| `operator_id` | String (UUID) | Foreign Key → users.id | Operator who performed action |
| `action_type` | String | Enum: approve, hide, flag, override | Action type |
| `target_type` | String | Enum: recommendation, persona | What was acted upon |
| `target_id` | String (UUID) | Not Null | ID of target (recommendation_id or user_id) |
| `reason` | Text | Nullable | Reason/notes for action |
| `before_state` | JSON | Nullable | State before action (for audit) |
| `after_state` | JSON | Nullable | State after action (for audit) |
| `timestamp` | DateTime | Auto, Indexed | When action was performed |

**Relationships:**
- Many-to-one: `operator` (users.id)

**Indexes:**
- `(operator_id, timestamp)` (for operator action history)
- `(target_type, target_id)` (for finding actions on specific items)

---

## Entity Relationship Diagram (Simplified)

```
users
  ├── accounts (1:N)
  │     ├── transactions (1:N)
  │     └── liabilities (1:1)
  ├── signals (1:N)
  ├── personas (1:N)
  ├── recommendations (1:N)
  │     ├── content (N:1, optional)
  │     └── offers (N:1, optional)
  ├── user_feedback (1:N)
  ├── chat_messages (1:N)
  └── operator_audit_log (1:N, if operator)
```

---

## Data Types

- **String (UUID):** UUID v4 format (e.g., "550e8400-e29b-41d4-a716-446655440000")
- **String:** Variable-length text (max length varies by field)
- **Decimal:** Fixed-point decimal number (stored as numeric in SQLite)
- **Date:** Date only (YYYY-MM-DD)
- **DateTime:** Date and time (ISO-8601 format)
- **Boolean:** True/false
- **Integer:** Whole number
- **JSON:** JSON object/array stored as text in SQLite, validated by Prisma

---

## Indexes Summary

**Performance-Critical Indexes:**
- `transactions(account_id, date)` - Windowed signal queries
- `transactions(merchant_name)` - Recurring merchant detection
- `transactions(personal_finance_category_primary)` - Spending analysis
- `signals(user_id, signal_type, window_days)` - Signal lookup
- `personas(user_id, rank)` - Primary/secondary persona lookup
- `recommendations(user_id, status)` - Active recommendations
- `chat_messages(user_id, timestamp)` - Conversation history

---

**Document Version:** 1.0  
**Last Updated:** November 3, 2025

