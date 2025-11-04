# SpendSense Manual Test Plan

**Version:** 1.0  
**Date:** December 2024  
**Purpose:** Comprehensive manual testing against PRD requirements and success criteria

---

## 📋 Test Overview

This test plan validates SpendSense against:
1. **Success Criteria** from SpendSense.md (Coverage, Explainability, Latency, Auditability, Code Quality, Documentation)
2. **Requirements PRD** features (Data ingestion, Signals, Personas, Recommendations, Guardrails, Operator view)
3. **Architecture PRD** technical requirements (API endpoints, Frontend pages, Database schema)

---

## 🎯 Success Criteria Testing

### 1. Coverage: Users with Assigned Persona + ≥3 Behaviors
**Target:** 100%

#### Test Steps:
1. **Run Evaluation Harness:**
   ```bash
   cd backend
   npm run eval
   ```
2. **Check Coverage Metrics:**
   - Open `data/evaluation/evaluation-metrics.json`
   - Verify `coveragePercentage >= 100`
   - Verify `usersWithPersona === totalUsers` (all 100 users have personas)
   - Verify `usersWithThreeOrMoreSignals === totalUsers` (all users have ≥3 signals)

#### Manual Verification:
- [ ] Log in as operator (`operator@spendsense.com` / `operator123`)
- [ ] Navigate to Operator Dashboard
- [ ] Check "Total Users" stat (should be 100)
- [ ] Check "Persona Types" stat (should show 5 personas)
- [ ] Select 5 random users from user list
- [ ] For each user, verify:
  - [ ] Primary persona is assigned (not null)
  - [ ] At least 3 signal types exist (credit, subscription, savings, income)
  - [ ] Signals show data (not empty/null)

#### Expected Results:
- ✅ 100% of users have assigned personas
- ✅ 100% of users have ≥3 detected behaviors/signals
- ✅ All 5 persona types are represented

#### Potential Issues:
- ⚠️ Some users may not have sufficient transaction data → Check seed script
- ⚠️ Persona assignment logic may fail edge cases → Review `assignPersonas()` function

---

### 2. Explainability: Recommendations with Rationales
**Target:** 100%

#### Test Steps:
1. **Run Evaluation Harness:**
   ```bash
   cd backend
   npm run eval
   ```
2. **Check Explainability Metrics:**
   - Open `data/evaluation/evaluation-metrics.json`
   - Verify `explainabilityPercentage >= 100`
   - Verify `recommendationsWithRationales === totalRecommendations`

#### Manual Verification:
- [ ] Log in as 5 different users (one per persona type)
- [ ] Navigate to Dashboard for each user
- [ ] For each recommendation displayed:
  - [ ] Verify rationale text is present (not empty/null)
  - [ ] Verify rationale cites specific data (account names, amounts, percentages)
  - [ ] Verify rationale is plain language (no jargon)
  - [ ] Verify rationale includes disclaimer text: "This is educational content, not financial advice..."

#### Expected Results:
- ✅ 100% of recommendations have non-empty rationales
- ✅ All rationales cite specific user data points
- ✅ All rationales include appropriate disclaimers

#### Potential Issues:
- ⚠️ Rationale generation may fail for edge cases → Check `rationaleGenerator.ts`
- ⚠️ Missing data points in rationale → Verify signal data availability

---

### 3. Latency: Time to Generate Recommendations
**Target:** <5 seconds per user

#### Test Steps:
1. **Run Evaluation Harness:**
   ```bash
   cd backend
   npm run eval
   ```
2. **Check Latency Metrics:**
   - Open `data/evaluation/evaluation-metrics.json`
   - Verify `averageLatencyMs < 5000` (5 seconds)
   - Verify `p95LatencyMs < 5000` (95th percentile under 5 seconds)

#### Manual Verification:
- [ ] Log in as a user with consent enabled
- [ ] Navigate to Dashboard
- [ ] Click "Refresh" button
- [ ] Measure time from click to recommendations appearing:
  - [ ] Start timer when clicking "Refresh"
  - [ ] Stop timer when recommendations are visible
  - [ ] Verify time < 5 seconds
- [ ] Repeat for 3 different users
- [ ] Check browser Network tab for API response times:
  - [ ] `GET /api/recommendations/:userId?refresh=true` should complete quickly
  - [ ] `GET /api/profile/:userId` should complete quickly

#### Expected Results:
- ✅ Average recommendation generation time < 5 seconds
- ✅ 95th percentile latency < 5 seconds
- ✅ Refresh feels responsive (< 3 seconds perceived)

#### Potential Issues:
- ⚠️ Slow database queries → Check Prisma query optimization
- ⚠️ Slow signal generation → Profile `generateUserData()` function
- ⚠️ Network latency → Test on localhost vs. deployed environment

---

### 4. Auditability: Recommendations with Decision Traces
**Target:** 100%

#### Test Steps:
1. **Run Evaluation Harness:**
   ```bash
   cd backend
   npm run eval
   ```
2. **Check Auditability Metrics:**
   - Open `data/evaluation/evaluation-metrics.json`
   - Verify `auditabilityPercentage >= 100`
   - Verify `recommendationsWithTraces === totalRecommendations`

#### Manual Verification:
- [ ] Log in as operator
- [ ] Select a user from user list
- [ ] Navigate to "Recommendations" tab in user detail view
- [ ] For each recommendation:
  - [ ] Click "View Decision Trace" (if available in UI)
  - [ ] OR check database directly:
    ```sql
    SELECT decision_trace FROM recommendation WHERE user_id = '<userId>' LIMIT 1;
    ```
  - [ ] Verify `decision_trace` JSON contains:
    - [ ] `signals_snapshot` (credit, subscription, savings, income)
    - [ ] `persona_scores` (primary, secondary)
    - [ ] `rule_path` (array of rule evaluations)
    - [ ] `eligibility_results` (passed/failed rules)
    - [ ] `rationale_template_id`
    - [ ] `generated_at` timestamp

#### Expected Results:
- ✅ 100% of recommendations have decision traces
- ✅ All decision traces contain required fields
- ✅ Decision traces are JSON-parseable

#### Potential Issues:
- ⚠️ Decision trace not stored → Check `generateUserData()` function
- ⚠️ Missing fields in trace → Verify trace building logic

---

### 5. Code Quality: Passing Unit/Integration Tests
**Target:** ≥10 tests

#### Test Steps:
1. **Run Test Suite:**
   ```bash
   cd backend
   npm test
   ```
2. **Check Test Results:**
   - Verify all tests pass (exit code 0)
   - Count number of test files:
     ```bash
     find backend/tests -name "*.test.ts" | wc -l
     ```
   - Verify test count ≥ 10

#### Manual Verification:
- [ ] Check `backend/tests/` directory structure:
  - [ ] `eval/metrics.test.ts` - Evaluation metrics tests
  - [ ] `features/creditAnalyzer.test.ts` - Credit signal detection
  - [ ] `features/subscriptionDetector.test.ts` - Subscription detection
  - [ ] `guardrails/consent.test.ts` - Consent management
  - [ ] `guardrails/eligibility.test.ts` - Offer eligibility
  - [ ] `guardrails/toneBlocklist.test.ts` - Tone validation
  - [ ] `recommend/rationaleGenerator.test.ts` - Rationale generation
  - [ ] `integration/operator.test.ts` - Operator API tests
- [ ] Run coverage report:
   ```bash
   npm run test:coverage
   ```
- [ ] Verify coverage report shows:
  - [ ] Key modules have test coverage
  - [ ] Critical paths are tested

#### Expected Results:
- ✅ ≥10 test files exist
- ✅ All tests pass
- ✅ Test coverage > 50% for critical modules

#### Potential Issues:
- ⚠️ Missing tests for key features → Add tests for:
  - Persona assignment logic
  - Content matching algorithm
  - Recommendation refresh logic
  - Chat function calling

---

### 6. Documentation: Schema and Decision Log Clarity
**Target:** Complete

#### Test Steps:
1. **Check Documentation Files:**
   - [ ] `docs/SCHEMA.md` exists and documents database schema
   - [ ] `docs/DECISIONS.md` exists and documents architectural decisions
   - [ ] `docs/LIMITATIONS.md` exists and documents known limitations
   - [ ] `README.md` exists with setup instructions
   - [ ] `memory-bank/` directory contains project context

#### Manual Verification:
- [ ] Review `docs/SCHEMA.md`:
  - [ ] All tables documented (User, Account, Transaction, Signal, Persona, Recommendation, etc.)
  - [ ] Field types and constraints documented
  - [ ] Relationships between tables explained
- [ ] Review `docs/DECISIONS.md`:
  - [ ] Key architectural decisions documented
  - [ ] Rationale for technology choices provided
  - [ ] Trade-offs explained
- [ ] Review `README.md`:
  - [ ] Setup instructions are clear
  - [ ] API endpoints documented
  - [ ] Testing instructions provided
  - [ ] Evaluation harness usage explained

#### Expected Results:
- ✅ All documentation files exist
- ✅ Documentation is clear and complete
- ✅ Schema is fully documented

#### Potential Issues:
- ⚠️ Missing documentation → Create missing docs
- ⚠️ Outdated documentation → Update with current implementation

---

## 🔍 Feature Testing

### 7. Data Ingestion & Synthetic Data Generator

#### Test Steps:
1. **Verify Seed Data:**
   ```bash
   cd backend
   npm run prisma:seed
   ```
2. **Check Database:**
   - [ ] 100 users created
   - [ ] Each user has accounts (checking, savings, credit cards)
   - [ ] Each user has transactions (≥30 transactions per user)
   - [ ] Each user has liabilities (credit cards with APR, minimum payments)

#### Manual Verification:
- [ ] Log in as operator
- [ ] Check "Total Users" stat = 100
- [ ] Select 5 random users
- [ ] For each user, verify:
  - [ ] Accounts exist (≥2 accounts per user)
  - [ ] Transactions exist (≥30 transactions in last 90 days)
  - [ ] Credit cards have:
    - [ ] Balance, limit, utilization
    - [ ] APR values
    - [ ] Minimum payment amounts
    - [ ] Payment due dates

#### Expected Results:
- ✅ 100 synthetic users created
- ✅ Diverse financial profiles (different income levels, credit behaviors)
- ✅ Plaid-style data structure matches requirements

#### Potential Issues:
- ⚠️ Seed script fails → Check `prisma/seed.ts`
- ⚠️ Insufficient data → Verify seed parameters

---

### 8. Behavioral Signal Detection

#### Test Steps:
1. **Verify Signal Generation:**
   - Log in as a user
   - Navigate to Insights page
   - Check all signal types are displayed

#### Manual Verification:
- [ ] **Subscription Signals:**
  - [ ] Navigate to Insights → Spending Patterns
  - [ ] Verify recurring merchants are detected (≥3 merchants)
  - [ ] Verify monthly recurring spend is calculated
  - [ ] Verify subscription share of total spend is shown
- [ ] **Savings Signals:**
  - [ ] Navigate to Insights → Savings Progress
  - [ ] Verify savings balance is shown
  - [ ] Verify growth rate is calculated
  - [ ] Verify emergency fund coverage (months) is calculated
- [ ] **Credit Signals:**
  - [ ] Navigate to Insights → Credit Health
  - [ ] Verify utilization per card is shown
  - [ ] Verify flags for ≥30%, ≥50%, ≥80% utilization
  - [ ] Verify minimum-payment-only detection
  - [ ] Verify interest charges detected
  - [ ] Verify overdue status shown
- [ ] **Income Signals:**
  - [ ] Navigate to Insights → Income Analysis
  - [ ] Verify payroll ACH detection
  - [ ] Verify payment frequency shown
  - [ ] Verify cash-flow buffer (months) calculated

#### Expected Results:
- ✅ All 4 signal types are detected
- ✅ Signal values are accurate (match user's actual data)
- ✅ Signals update when data changes (test with refresh)

#### Potential Issues:
- ⚠️ Signals not detected → Check signal detection functions
- ⚠️ Incorrect calculations → Verify signal formulas

---

### 9. Persona Assignment System

#### Test Steps:
1. **Verify Persona Assignment:**
   - Log in as operator
   - Check persona distribution (should be ~20 users per persona)

#### Manual Verification:
- [ ] **High Utilization Persona:**
  - [ ] Find users with this persona
  - [ ] Verify they have: utilization ≥50% OR interest charges > 0 OR minimum-payment-only OR overdue
- [ ] **Variable Income Persona:**
  - [ ] Find users with this persona
  - [ ] Verify they have: median pay gap > 45 days AND cash-flow buffer < 1 month
- [ ] **Subscription-Heavy Persona:**
  - [ ] Find users with this persona
  - [ ] Verify they have: ≥3 recurring merchants AND (monthly recurring spend ≥$50 OR subscription share ≥10%)
- [ ] **Savings Builder Persona:**
  - [ ] Find users with this persona
  - [ ] Verify they have: savings growth rate ≥2% OR net savings inflow ≥$200/month AND all card utilizations < 30%
- [ ] **Net Worth Maximizer Persona:**
  - [ ] Find users with this persona
  - [ ] Verify they have: low utilization, high savings, investment accounts

#### Expected Results:
- ✅ All 5 personas are assigned
- ✅ Persona criteria match user's actual data
- ✅ ~20 users per persona (balanced distribution)

#### Potential Issues:
- ⚠️ Users assigned wrong persona → Check persona assignment logic
- ⚠️ Users with no persona → Verify edge case handling

---

### 10. Recommendation Engine

#### Test Steps:
1. **Verify Recommendation Generation:**
   - Log in as a user
   - Navigate to Dashboard
   - Check recommendations are displayed

#### Manual Verification:
- [ ] **Recommendation Count:**
  - [ ] Verify 3-5 education items are shown
  - [ ] Verify 1-3 offers are shown
  - [ ] Verify total recommendations = 4-8 items
- [ ] **Recommendation Quality:**
  - [ ] Verify recommendations match user's persona
  - [ ] Verify recommendations cite specific user data
  - [ ] Verify recommendations are diverse (not all same category)
- [ ] **Recommendation Actions:**
  - [ ] Test "Dismiss" - item should disappear
  - [ ] Test "Save for Later" - item should be marked as saved
  - [ ] Test "Learn More" - should navigate to article page
  - [ ] Test "Restore" from Settings - dismissed item should reappear
- [ ] **Recommendation Refresh:**
  - [ ] Click "Refresh" button
  - [ ] Verify recommendations regenerate
  - [ ] Verify new recommendations appear (may differ from before)

#### Expected Results:
- ✅ 3-5 education recommendations per user
- ✅ 1-3 offers per user
- ✅ Recommendations match persona and signals
- ✅ User actions work correctly

#### Potential Issues:
- ⚠️ Too few recommendations → Check content matching logic
- ⚠️ Recommendations don't match persona → Verify persona assignment
- ⚠️ Dismissed items reappear → Check dismissed item filtering

---

### 11. Consent Management

#### Test Steps:
1. **Test Consent Flow:**
   - Register a new user
   - Verify consent modal appears
   - Test granting consent
   - Test revoking consent

#### Manual Verification:
- [ ] **Consent Modal:**
  - [ ] Register new user
  - [ ] Verify consent modal appears on first login
  - [ ] Verify modal explains what data is used
  - [ ] Test "Accept" - user should see recommendations
  - [ ] Test "Skip" - user should see empty dashboard
- [ ] **Consent Revocation:**
  - [ ] Navigate to Settings
  - [ ] Toggle consent OFF
  - [ ] Verify recommendations disappear
  - [ ] Verify profile data generation stops
  - [ ] Toggle consent ON
  - [ ] Verify recommendations regenerate
- [ ] **Consent Enforcement:**
  - [ ] With consent OFF, try to refresh recommendations
  - [ ] Verify refresh is blocked (no new recommendations)
  - [ ] Verify API returns error or empty results

#### Expected Results:
- ✅ Consent modal appears on first login
- ✅ Consent can be granted/revoked
- ✅ Recommendations respect consent status
- ✅ Data generation stops when consent revoked

#### Potential Issues:
- ⚠️ Consent modal doesn't appear → Check `ConsentModal` component
- ⚠️ Recommendations appear without consent → Check consent middleware

---

### 12. Guardrails (Eligibility & Tone)

#### Test Steps:
1. **Test Eligibility Guardrails:**
   - Log in as a user
   - Check offers shown
   - Verify offers match eligibility rules

#### Manual Verification:
- [ ] **Offer Eligibility:**
  - [ ] Log in as high utilization user
  - [ ] Check offers shown
  - [ ] Verify offers require high utilization signal
  - [ ] Verify offers don't conflict with existing accounts
  - [ ] Verify offers meet minimum income/credit requirements
- [ ] **Tone Guardrails:**
  - [ ] Check recommendation rationales
  - [ ] Verify no shaming language ("overspending", "poor choices")
  - [ ] Verify neutral, supportive tone
  - [ ] Verify educational language (not prescriptive)

#### Expected Results:
- ✅ Only eligible offers are shown
- ✅ No ineligible offers recommended
- ✅ No shaming language in rationales
- ✅ Supportive, educational tone throughout

#### Potential Issues:
- ⚠️ Ineligible offers shown → Check eligibility checker
- ⚠️ Shaming language present → Check tone validator

---

### 13. Operator View

#### Test Steps:
1. **Test Operator Dashboard:**
   - Log in as operator
   - Navigate to Operator Dashboard
   - Test all operator features

#### Manual Verification:
- [ ] **Dashboard Stats:**
  - [ ] Verify "Total Users" stat is accurate
  - [ ] Verify "Total Recommendations" stat is accurate
  - [ ] Verify "Flagged Items" stat is accurate
  - [ ] Verify "Persona Types" stat shows 5 personas
- [ ] **User Search:**
  - [ ] Test search by email (keyword search)
  - [ ] Verify example users appear at top of dropdown
  - [ ] Verify persona badges are shown
  - [ ] Test selecting a user (opens detail view)
- [ ] **User Detail View:**
  - [ ] Verify signals are displayed (30d and 180d)
  - [ ] Verify persona assignments are shown
  - [ ] Verify recommendations list is shown
  - [ ] Verify decision traces are accessible
- [ ] **Flagged Recommendations:**
  - [ ] Verify flagged items appear in queue
  - [ ] Test "Approve" - item should become active
  - [ ] Test "Hide" - item should be hidden from user
- [ ] **Audit Log:**
  - [ ] Verify operator actions are logged
  - [ ] Verify audit log shows: who, what, when, why

#### Expected Results:
- ✅ Operator dashboard shows accurate stats
- ✅ User search works correctly
- ✅ User detail view shows all required information
- ✅ Flagged recommendations can be approved/hidden
- ✅ Audit log tracks all operator actions

#### Potential Issues:
- ⚠️ Stats are inaccurate → Check dashboard query logic
- ⚠️ User search doesn't work → Check search implementation
- ⚠️ Decision traces not accessible → Check trace storage

---

### 14. Frontend Pages

#### Test Steps:
1. **Test All Frontend Pages:**
   - Navigate through all pages
   - Verify functionality on each page

#### Manual Verification:
- [ ] **Dashboard Page:**
  - [ ] Verify recommendations are displayed
  - [ ] Verify alert banners appear (if conditions met)
  - [ ] Verify "Refresh" button works
  - [ ] Verify "Show dismissed" toggle works
  - [ ] Verify user actions (dismiss, save, learn more) work
- [ ] **Insights Page:**
  - [ ] Verify financial snapshot is shown
  - [ ] Verify spending patterns chart is displayed
  - [ ] Verify credit health metrics are shown
  - [ ] Verify savings progress is shown
  - [ ] Verify income analysis is shown
  - [ ] Verify calculators are functional
- [ ] **Library Page:**
  - [ ] Verify all educational content is listed
  - [ ] Verify search functionality works
  - [ ] Verify topic filtering works
  - [ ] Verify "Read More" links work
- [ ] **Settings Page:**
  - [ ] Verify consent toggle works
  - [ ] Verify account preferences can be updated
  - [ ] Verify dismissed items are listed
  - [ ] Verify "Restore" button works
- [ ] **Chat Interface:**
  - [ ] Verify chat icon appears (bottom-right)
  - [ ] Verify chat sidebar opens
  - [ ] Verify suggested questions appear
  - [ ] Test asking questions about user data
  - [ ] Verify chat respects consent (no data access without consent)

#### Expected Results:
- ✅ All pages load correctly
- ✅ All features work as expected
- ✅ UI is responsive and user-friendly

#### Potential Issues:
- ⚠️ Pages don't load → Check routing configuration
- ⚠️ Features don't work → Check API integration
- ⚠️ UI is broken → Check component implementation

---

## 🐛 Known Issues & Gaps

### Missing Features:
1. **Evaluation Report with Fairness Analysis:**
   - ⚠️ Fairness analysis not implemented
   - Should analyze demographic parity if demographics are tracked
   - Should check for bias in persona assignments

2. **Chat Interface:**
   - ⚠️ Chat may not be fully functional (requires OpenAI API key)
   - Verify chat function calling works correctly
   - Verify chat limitations are enforced

3. **Content Catalog:**
   - ⚠️ Only 7 content items loaded (PRD suggests 30 - 6 per persona)
   - Should verify all content categories are covered

### Potential Bugs:
1. **Persona Override Removed:**
   - ✅ Fixed: Persona override endpoint removed (as per requirements)
   - Verify operator can't override personas anymore

2. **Dismissed Items:**
   - ✅ Fixed: Dismissed items excluded from matching
   - Verify dismissed items don't reappear in recommendations

3. **Consent Enforcement:**
   - ✅ Fixed: Consent check added to `generateUserData()`
   - Verify background generation respects consent

---

## 📊 Test Execution Checklist

### Pre-Testing Setup:
- [ ] Backend server is running (`npm run dev` in `backend/`)
- [ ] Frontend is running (`npm run dev` in `frontend/`)
- [ ] Database is seeded (`npm run prisma:seed` in `backend/`)
- [ ] Test users are available (use example users from login page)

### Test Execution Order:
1. [ ] Run evaluation harness (Success Criteria 1-4)
2. [ ] Run test suite (Success Criteria 5)
3. [ ] Review documentation (Success Criteria 6)
4. [ ] Test data ingestion (Feature 7)
5. [ ] Test signal detection (Feature 8)
6. [ ] Test persona assignment (Feature 9)
7. [ ] Test recommendation engine (Feature 10)
8. [ ] Test consent management (Feature 11)
9. [ ] Test guardrails (Feature 12)
10. [ ] Test operator view (Feature 13)
11. [ ] Test frontend pages (Feature 14)

### Test Results Recording:
- [ ] Record pass/fail for each test
- [ ] Document any bugs found
- [ ] Document any missing features
- [ ] Create issue tickets for critical bugs

---

## 🎯 Success Criteria Summary

| Criteria | Target | Test Method | Status |
|----------|--------|-------------|--------|
| Coverage | 100% | Evaluation harness + Manual check | ⏳ Pending |
| Explainability | 100% | Evaluation harness + Manual check | ⏳ Pending |
| Latency | <5s | Evaluation harness + Manual timing | ⏳ Pending |
| Auditability | 100% | Evaluation harness + Manual check | ⏳ Pending |
| Code Quality | ≥10 tests | Test suite run | ⏳ Pending |
| Documentation | Complete | Manual review | ⏳ Pending |

---

## 📝 Notes

- **Test Environment:** Use local development environment for testing
- **Test Data:** Use seeded synthetic users (100 users, password: `password123`)
- **Operator Credentials:** `operator@spendsense.com` / `operator123`
- **Evaluation Output:** Check `data/evaluation/` directory for metrics and reports

---

**Last Updated:** December 2024  
**Next Review:** After test execution

