# SpendSense Gap Analysis: Requirements vs Implementation

**Date:** November 2024  
**Status:** Core functionality complete, several features missing

---

## Executive Summary

✅ **What's Working Well:**
- Core backend architecture (signals, personas, recommendations)
- Authentication and authorization
- Database schema and seeding
- API endpoints (most routes implemented)
- Frontend pages (Dashboard, Insights, Settings, Operator)
- Evaluation metrics computation
- Guardrails (consent, eligibility, tone validation)

❌ **Critical Missing Features:**
1. **Chat Interface** - Not implemented at all
2. **Interactive Calculators** - All 3 missing (Emergency Fund, Debt Payoff, Subscription Audit)
3. **Decision Traces** - Incomplete (only stores `generated_at`, missing required fields)
4. **Content Catalog** - Only 7 items loaded (should be 30 - 6 per persona)
5. **Library Page** - Uses mock data instead of API
6. **Operator View** - Missing user detail tabs, decision trace viewer, persona override UI

⚠️ **Partial Implementations:**
- Decision traces missing required fields per PRD
- Content loading incomplete
- Library page not connected to backend

---

## Detailed Gap Analysis

### 1. Chat Interface (Section 5.3) ❌ MISSING

**Requirements (Reqs PRD Section 5.3):**
- Embedded sidebar chat (bottom-right corner icon)
- Slides in from right, persistent across pages
- Conversation history retained for 30 days
- Suggested questions on open:
  - "Why am I seeing these recommendations?"
  - "How much do I spend on subscriptions?"
  - "What's my credit utilization?"
  - "Explain emergency fund coverage"
  - "Show me my spending patterns"
- OpenAI GPT-4o-mini integration with 9 function tools
- Maximum 100 messages per user per session

**Current Status:**
- ✅ Backend chat service implemented (`backend/src/services/chat/chatService.ts`)
- ✅ Chat API endpoint exists (`POST /api/chat`)
- ❌ **No frontend chat component**
- ❌ **No chat icon in Layout**
- ❌ **No sidebar overlay UI**

**Files Needed:**
- `frontend/src/components/Chat/ChatSidebar.tsx`
- `frontend/src/components/Chat/ChatMessage.tsx`
- Update `frontend/src/components/Layout.tsx` to include chat icon

---

### 2. Interactive Calculators (Section 5.4) ❌ MISSING

**Requirements (Reqs PRD Section 5.4):**

#### Calculator 1: Emergency Fund Calculator
- Pre-filled: Current savings balance, average monthly expenses
- User input: Target months of coverage (default: 6)
- Output: Current coverage in months, gap to target ($), progress bar, suggested monthly savings

#### Calculator 2: Debt Payoff Simulator
- Pre-filled: Credit card balances, APRs, minimum payments
- User input: Extra payment amount per month
- Output: Payoff timeline (months), total interest paid, interest savings ($), visual payoff chart

#### Calculator 3: Subscription Audit Tool
- Pre-filled: All detected recurring subscriptions with amounts
- User input: Mark each as "keeping" or "consider canceling"
- Output: Total monthly spend, potential monthly savings, annual savings projection

**Current Status:**
- ❌ **No calculator components exist**
- ❌ **No calculator routes**
- ❌ **No API endpoints for calculator data**

**Files Needed:**
- `frontend/src/components/Calculators/EmergencyFundCalculator.tsx`
- `frontend/src/components/Calculators/DebtPayoffSimulator.tsx`
- `frontend/src/components/Calculators/SubscriptionAuditTool.tsx`
- Add calculator links/access points in Dashboard or Insights page

---

### 3. Decision Traces (Section 4.3, Architecture PRD) ⚠️ INCOMPLETE

**Requirements (Architecture PRD Section 2, Database Schema):**
```json
{
  "signals_snapshot": { /* key signal values */ },
  "persona_scores": { 
    "primary": {"type":"high_utilization","score":0.85}, 
    "secondary": {"type":"subscription_heavy","score":0.62} 
  },
  "rule_path": ["content_filter:persona_fit", "content_filter:signal_overlap", "eligibility:utilization>=0.5"],
  "eligibility_results": { "passed": true, "failed_rules": [] },
  "rationale_template_id": "credit_utilization_v1",
  "generated_at": "ISO-8601 timestamp"
}
```

**Current Status:**
- ⚠️ **Only stores `generated_at`** in `decision_trace` field
- ❌ Missing `signals_snapshot`
- ❌ Missing `persona_scores`
- ❌ Missing `rule_path`
- ❌ Missing `eligibility_results`
- ❌ Missing `rationale_template_id`

**Location:** `backend/src/ui/routes/recommendations.ts` lines 172, 213

**Fix Required:**
Update recommendation creation to include full decision trace with all required fields.

---

### 4. Content Catalog (Section 4.2) ⚠️ INCOMPLETE

**Requirements (Reqs PRD Section 4.2):**
- 30 total articles (6 per persona)
- Hand-authored JSON metadata with tags, persona_fit, signals, editorial_summary
- Stored in `content/` directory

**Current Status:**
- ✅ Content structure exists (`content/` directory with subdirectories)
- ⚠️ **Only 7 content items loaded** (should be 30)
- ✅ Offers: 21 items loaded (target 15-20, ✅ acceptable)

**Files Checked:**
- `content/high-utilization/` - 2 files
- `content/variable-income/` - 1 file
- `content/subscription-heavy/` - 1 file
- `content/savings-builder/` - 1 file
- `content/net-worth-maximizer/` - 1 file
- Total: **7 items** (need 23 more to reach 30)

**Action Required:**
- Create additional content JSON files (6 per persona = 30 total)
- Ensure all personas have 6 content items each

---

### 5. Library Page (Section 5.6) ⚠️ PARTIAL

**Requirements (Reqs PRD Section 5.6):**
- Fetch all educational content from API
- Filter by topic (credit, savings, budgeting, investing, debt)
- Search by keyword
- Sort by relevance, date, popularity
- Shows all 30 curated articles

**Current Status:**
- ✅ UI structure implemented (`frontend/src/pages/LibraryPage.tsx`)
- ✅ Filtering and search UI exists
- ❌ **Uses mock data** (hardcoded 3 items)
- ❌ **Not connected to API**

**Fix Required:**
- Create API endpoint `GET /api/content` (or extend existing content retrieval)
- Update `LibraryPage.tsx` to fetch from API instead of mock data

---

### 6. Operator View Enhancements (Section 7) ⚠️ PARTIAL

**Requirements (Reqs PRD Section 7.3-7.4):**

**Missing Features:**
1. **User Search & Selection**
   - ✅ Basic operator dashboard exists
   - ❌ **No user search interface**
   - ❌ **No user detail view with tabs**

2. **User Detail View Tabs:**
   - ❌ **Overview Tab** - User info, persona summary, quick stats
   - ❌ **Signals Tab** - All computed signals (30d/180d toggle)
   - ❌ **Recommendations Tab** - List with actions (View trace, Hide, Flag)
   - ❌ **Audit Log Tab** - Operator action history

3. **Decision Trace Viewer:**
   - ❌ **"View Decision Trace" modal/panel**
   - ❌ Display: signals snapshot, persona scores, rule path, eligibility results

4. **Persona Override Tool:**
   - ✅ Backend endpoint exists (`POST /api/operator/user/:userId/persona-override`)
   - ❌ **No UI for persona override**
   - ❌ **No UI for testing/debugging persona assignments**

**Current Status:**
- ✅ Basic operator dashboard (`frontend/src/pages/OperatorPage.tsx`)
- ✅ Flagged recommendations queue displayed
- ✅ Approve/Hide actions implemented
- ❌ Missing user search and detail views
- ❌ Missing decision trace viewer
- ❌ Missing persona override UI

---

### 7. Alert Display Logic (Section 5.2) ✅ MOSTLY COMPLETE

**Requirements (Reqs PRD Section 5.2):**
- 🔴 Red Alert (Critical): Credit card overdue, utilization >80%, savings balance <$100
- 🟡 Yellow Warning: Utilization 50-80%, minimum payment only pattern
- ℹ️ Blue Info: 3+ subscriptions detected, low emergency fund coverage (<3 months)
- Max 2 alerts at once
- Priority: Overdue > 80% utilization > savings <$100

**Current Status:**
- ✅ Alert generation logic implemented (`DashboardPage.tsx` lines 29-71)
- ✅ Alert display with icons (lines 119-136)
- ✅ Max 2 alerts enforced (line 71)
- ✅ Priority logic mostly correct
- ⚠️ Missing "Learn more" link to relevant educational content (line 523 requirement)

---

### 8. Rationale Template Bug 🐛 FIX NEEDED

**Location:** `backend/src/recommend/rationaleGenerator.ts` line 51

**Issue:**
- Line 44: `const creditSignal = signals['credit'];` is defined
- Line 51: `if (personaType === 'high_utilization' && creditSignal && userId)` - correct
- However, the variable is correctly defined, so this may not be a bug

**Status:** ✅ Actually correct - `creditSignal` is defined on line 44

---

### 9. Evaluation Harness (Section 8) ✅ COMPLETE

**Requirements (Reqs PRD Section 8):**
- Coverage metrics ✅
- Explainability metrics ✅
- Latency metrics ✅
- Auditability metrics ✅
- Summary report generation ✅
- Decision trace export ✅

**Current Status:**
- ✅ All metrics implemented (`backend/src/eval/`)
- ✅ Evaluation harness script exists (`backend/scripts/eval-harness.ts`)
- ✅ Generates JSON metrics and summary report

---

### 10. API Endpoints Summary ✅ MOSTLY COMPLETE

**Missing/Incomplete Endpoints:**
- ❌ `GET /api/content` - For Library page (may be handled through recommendations)
- ⚠️ `GET /api/operator/user/:userId` - Exists but frontend not using it
- ⚠️ Decision traces in recommendations endpoint need to include full trace data

**All Other Endpoints:** ✅ Implemented

---

## Priority Fix List

### Critical (Required for MVP):
1. **Implement Chat Interface** - High user value, core feature
2. **Complete Decision Traces** - Required for auditability (PRD Section 8)
3. **Add Content Items** - Need 30 total (currently 7)
4. **Connect Library Page to API** - Currently using mock data

### High Priority:
5. **Implement Interactive Calculators** - All 3 calculators
6. **Enhance Operator View** - User search, detail tabs, decision trace viewer

### Medium Priority:
7. **Add "Learn more" links to alerts** - Nice-to-have UX improvement
8. **Persona Override UI** - Useful for testing

---

## Testing Gaps

**Required Tests (Reqs PRD Section 8.4):**
- ✅ Subscription cadence detection (tests exist)
- ✅ Credit utilization flags (tests exist)
- ✅ Consent gating (tests exist)
- ✅ Offer eligibility rules (tests exist)
- ✅ Tone blocklist enforcement (tests exist)
- ✅ Rationale template substitution (tests exist)
- ✅ Metrics harness output shape (tests exist)
- ✅ Operator override audit entry (tests exist)

**Test Coverage:** ✅ All required tests implemented (19 tests total)

---

## Summary Statistics

| Category | Status | Completion |
|----------|--------|------------|
| Backend Core | ✅ Complete | 100% |
| Signal Detection | ✅ Complete | 100% |
| Persona Assignment | ✅ Complete | 100% |
| Recommendation Engine | ⚠️ Partial | 90% (missing decision traces) |
| API Endpoints | ✅ Complete | 95% (missing content endpoint) |
| Frontend Pages | ⚠️ Partial | 70% (missing calculators, chat) |
| Guardrails | ✅ Complete | 100% |
| Evaluation Metrics | ✅ Complete | 100% |
| Operator View | ⚠️ Partial | 50% (basic dashboard, missing detail views) |
| Content Catalog | ⚠️ Partial | 23% (7/30 items) |

**Overall Completion:** ~80%

---

## Next Steps

1. **Immediate (Before Demo):**
   - Complete decision traces (critical for auditability)
   - Add remaining content items (or document that 7 is sufficient for demo)
   - Connect Library page to API

2. **Short-term (Post-Demo):**
   - Implement chat interface
   - Build interactive calculators
   - Enhance operator view with user detail tabs

3. **Documentation:**
   - Update MEMORY_BANK.md with missing features
   - Document workarounds for demo purposes

---

**Note:** The core system is functional and demonstrates all key concepts. The missing features are primarily UI enhancements and extended functionality that can be added incrementally.

