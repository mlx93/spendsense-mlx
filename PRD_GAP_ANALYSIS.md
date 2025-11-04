# PRD Gap Analysis - SpendSense

**Date:** December 2024  
**Based on:** SS_Reqs_PRD.md, SS_Architecture_PRD.md, SpendSense.md

---

## 🔴 Critical Gaps (Must Fix)

### 1. **Evaluation Report with Fairness Analysis**
**PRD Requirement:** "Evaluation report includes fairness analysis" (SpendSense.md line 262)

**Current Status:** ❌ **NOT IMPLEMENTED**

**Gap:**
- Evaluation harness exists (`backend/scripts/eval-harness.ts`)
- Metrics computed: Coverage, Explainability, Latency, Auditability
- **Missing:** Fairness analysis (demographic parity check)

**Impact:** High - Required for submission per SpendSense.md

**Fix Required:**
- Add fairness analysis to evaluation harness
- If demographics are tracked, analyze persona distribution by demographic
- Check for bias in persona assignments
- Include fairness metrics in evaluation report

**Location:** `backend/src/eval/` - Add `fairnessMetrics.ts`

---

### 2. **Content Catalog Incomplete**
**PRD Requirement:** "30 curated articles (6 per persona)" (SS_Architecture_PRD.md)

**Current Status:** ⚠️ **PARTIALLY IMPLEMENTED**

**Gap:**
- Current: 7 content items loaded (varies by persona folder)
- Required: 30 articles (6 per persona × 5 personas)
- Missing: ~23 articles

**Impact:** Medium - System works but content diversity is limited

**Fix Required:**
- Add more content items to `content/` directory
- Ensure 6 articles per persona type:
  - `high-utilization/` - 6 articles
  - `variable-income/` - 6 articles  
  - `subscription-heavy/` - 6 articles
  - `savings-builder/` - 6 articles
  - `net-worth-maximizer/` - 6 articles

**Location:** `content/` directory

---

### 3. **Chat Interface Functionality**
**PRD Requirement:** Chat with function calling (SS_Reqs_PRD.md Section 5.3)

**Current Status:** ⚠️ **IMPLEMENTED BUT MAY NOT BE FULLY FUNCTIONAL**

**Gap:**
- Chat endpoint exists (`backend/src/ui/routes/chat.ts`)
- Function calling implemented (9 read-only tools)
- **Risk:** Requires OpenAI API key to function
- **Risk:** Chat limitations may not be fully enforced

**Impact:** Medium - Core feature but may require API key setup

**Fix Required:**
- Verify chat works with OpenAI API key
- Test all 9 function tools work correctly
- Verify chat limitations are enforced (no advice, no predictions)
- Test consent gating for chat

**Location:** `backend/src/ui/routes/chat.ts`, `frontend/src/components/Chat/`

---

## 🟡 Medium Priority Gaps

### 4. **Persona Override Feature Removed**
**PRD Requirement:** Operator can override recommendations (SS_Reqs_PRD.md Section 7.3)

**Current Status:** ✅ **INTENTIONALLY REMOVED** (per user requirement)

**Gap:**
- Persona override endpoint was removed (correctly, per user decision)
- Operators can only approve/hide recommendations
- **Note:** This aligns with SpendSense.md which says "Approve or override recommendations" (not personas)

**Impact:** None - This was intentionally removed

**Status:** ✅ **RESOLVED** - No action needed

---

### 5. **Test Coverage Gaps**
**PRD Requirement:** "≥10 unit/integration tests" (SpendSense.md line 249)

**Current Status:** ⚠️ **PARTIALLY MET**

**Gap:**
- Current test count: ~8 test files
- Missing tests for:
  - Persona assignment logic (`backend/src/personas/scoringEngine.ts`)
  - Content matching algorithm (`backend/src/recommend/contentMatcher.ts`)
  - Recommendation refresh logic (`backend/src/ui/routes/recommendations.ts`)
  - Full integration tests for recommendation flow

**Impact:** Medium - Code quality metric not fully met

**Fix Required:**
- Add tests for persona assignment edge cases
- Add tests for content matching algorithm
- Add integration tests for recommendation generation flow
- Add tests for recommendation refresh with `?refresh=true`

**Location:** `backend/tests/`

---

### 6. **Decision Trace UI Access**
**PRD Requirement:** "Access decision trace (why this recommendation was made)" (SS_Reqs_PRD.md Section 7.3)

**Current Status:** ⚠️ **STORED BUT NOT EASILY ACCESSIBLE**

**Gap:**
- Decision traces are stored in database (`recommendation.decision_trace`)
- Traces accessible via database query
- **Missing:** UI button to view decision trace in operator view

**Impact:** Low - Traces exist but not user-friendly to access

**Fix Required:**
- Add "View Decision Trace" button in operator user detail view
- Display trace in modal or expandable section
- Format trace JSON for readability

**Location:** `frontend/src/components/Operator/UserDetailView.tsx`

---

## 🟢 Low Priority / Nice-to-Have

### 7. **Recommendation Refresh Diff Logic**
**PRD Requirement:** "Uses cached signals/personas per user per window; `refresh` recomputes diffs only" (SS_Reqs_PRD.md Section 4.3)

**Current Status:** ⚠️ **FULL RECOMPUTE INSTEAD OF DIFFS**

**Gap:**
- Current: `refresh=true` fully recomputes all signals and recommendations
- Required: Should only recompute diffs (changes since last generation)
- **Note:** User confirmed full recompute is acceptable (fast enough)

**Impact:** Low - Performance acceptable, but not optimal

**Status:** ✅ **ACCEPTED** - User confirmed this is fine

---

### 8. **Content Schema Validation**
**PRD Requirement:** Content should follow schema (SS_Architecture_PRD.md)

**Current Status:** ⚠️ **SCHEMA EXISTS BUT NOT VALIDATED**

**Gap:**
- Content schema defined (`content/schema.json`)
- Content items may not be validated against schema
- No validation on content load

**Impact:** Low - Content works but may have inconsistencies

**Fix Required:**
- Add schema validation when loading content
- Validate content structure matches schema
- Log warnings for invalid content

**Location:** `backend/src/services/contentLoader.ts` (if exists) or content loading logic

---

### 9. **Interactive Calculators Advanced Features**
**PRD Requirement:** "Results can be saved to user profile" (SS_Reqs_PRD.md Section 5.4)

**Current Status:** ⚠️ **CALCULATORS EXIST BUT SAVE NOT IMPLEMENTED**

**Gap:**
- Calculators exist: Emergency Fund, Debt Payoff, Subscription Audit
- Calculators use user's actual data
- **Missing:** Save results to user profile

**Impact:** Low - Calculators work but results not persisted

**Fix Required:**
- Add save functionality to calculators
- Store calculator results in database
- Display saved results in Insights page

**Location:** `frontend/src/pages/InsightsPage.tsx`, `backend/src/ui/routes/` (new endpoint)

---

## ✅ Working Correctly (No Gaps)

### Features Confirmed Working:
1. ✅ **Data Ingestion:** 100 synthetic users generated
2. ✅ **Signal Detection:** All 4 signal types working (subscription, savings, credit, income)
3. ✅ **Persona Assignment:** All 5 personas assigned correctly
4. ✅ **Recommendation Generation:** 3-5 education + 1-3 offers per user
5. ✅ **Consent Management:** Consent modal, revocation, enforcement all working
6. ✅ **Guardrails:** Eligibility checks and tone validation working
7. ✅ **Operator View:** Dashboard, user search, flagged queue all working
8. ✅ **Frontend Pages:** Dashboard, Insights, Library, Settings all functional
9. ✅ **Recommendation Actions:** Dismiss, save, restore all working
10. ✅ **Dismissed Items Exclusion:** Fixed - dismissed items excluded from matching

---

## 📊 Gap Summary

| Priority | Gap | Status | Impact |
|----------|-----|--------|--------|
| 🔴 Critical | Fairness analysis in evaluation | Missing | High |
| 🔴 Critical | Content catalog (30 articles) | Partial (7/30) | Medium |
| 🔴 Critical | Chat functionality | Implemented but untested | Medium |
| 🟡 Medium | Test coverage (≥10 tests) | Partial (8 tests) | Medium |
| 🟡 Medium | Decision trace UI access | Missing | Low |
| 🟢 Low | Refresh diff logic | Full recompute (accepted) | Low |
| 🟢 Low | Content schema validation | Missing | Low |
| 🟢 Low | Calculator save feature | Missing | Low |

---

## 🎯 Recommended Fix Priority

### Phase 1: Critical (Before Submission)
1. Add fairness analysis to evaluation harness
2. Verify chat functionality works (or document limitations)
3. Add content items to reach 30 total (if time permits)

### Phase 2: Important (If Time Permits)
4. Add missing tests to reach ≥10 tests
5. Add decision trace UI button in operator view

### Phase 3: Nice-to-Have (Future)
6. Add content schema validation
7. Add calculator save functionality

---

## 📝 Notes

- **Persona Override:** Correctly removed per user requirements
- **Refresh Logic:** Full recompute accepted by user (fast enough)
- **Test Coverage:** Current tests cover critical paths, but more would improve quality metric
- **Content Catalog:** System works with any number of articles, but 30 would improve diversity

---

**Last Updated:** December 2024  
**Next Review:** After manual testing execution

