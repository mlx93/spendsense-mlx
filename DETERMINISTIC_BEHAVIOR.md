# Deterministic Behavior Documentation

**Date:** December 2024  
**Purpose:** Document that recommendations and persona assignments are deterministic and not affected by OpenAI API key

---

## ✅ Deterministic Components

### 1. **Persona Assignment** - Fully Deterministic ✅

**Location:** `backend/src/personas/scoringEngine.ts`

**How it works:**
- Rule-based scoring algorithm (no LLM)
- Uses mathematical formulas and thresholds
- Based solely on user's transaction data and signals
- Same input data = same persona assignment

**Persona Criteria (from `personaDefinitions.ts`):**
- **High Utilization:** Utilization ≥50% OR interest charges > 0 OR minimum-payment-only OR overdue
- **Variable Income:** Median pay gap > 45 days AND cash-flow buffer < 1 month
- **Subscription-Heavy:** ≥3 recurring merchants AND (monthly recurring spend ≥$50 OR subscription share ≥10%)
- **Savings Builder:** Savings growth rate ≥2% OR net savings inflow ≥$200/month AND all card utilizations < 30%
- **Net Worth Maximizer:** Low utilization, high savings, investment accounts

**Deterministic Guarantee:** ✅ Same user data always produces same persona scores

---

### 2. **Content Matching** - Fully Deterministic ✅

**Location:** `backend/src/recommend/contentMatcher.ts`

**How it works:**
- Filters content by `persona_fit` array (exact match)
- Calculates signal overlap (mathematical calculation)
- Ranks by `editorial_priority` (hardcoded in content JSON)
- Selects top 3-5 items deterministically

**Ranking Algorithm:**
```typescript
// Deterministic ranking (no randomness)
1. Filter by persona_fit match
2. Calculate signal_overlap score
3. Sort by: persona_fit match DESC, signal_overlap DESC, editorial_priority ASC
4. Select top 3-5
```

**Deterministic Guarantee:** ✅ Same persona + signals = same content recommendations

---

### 3. **Rationale Generation** - Fully Deterministic ✅

**Location:** `backend/src/recommend/rationaleGenerator.ts`

**How it works:**
- **Template-based** (NOT LLM-generated)
- Pre-written templates in code
- Variable substitution from user data
- Same template + same data = same rationale

**Template Examples:**
- `"We noticed your {card_name} is at {utilization}% utilization..."`
- Variables filled from user's actual account data
- No LLM involved in rationale generation

**Deterministic Guarantee:** ✅ Same user data + same content = same rationale text

---

### 4. **Offer Matching** - Fully Deterministic ✅

**Location:** `backend/src/recommend/offerMatcher.ts`

**How it works:**
- Eligibility rules checked deterministically
- Required signals matched exactly
- Conflicting accounts excluded
- Ranked by signal match and persona fit

**Deterministic Guarantee:** ✅ Same user data = same eligible offers

---

## ⚠️ Optional LLM Component (Does NOT Affect Recommendations)

### **Agentic Review** - Only Flags/Hides (Doesn't Change Selection)

**Location:** `backend/src/recommend/agenticReview.ts`

**What it does:**
- Reviews recommendation rationales AFTER they're generated
- Only flags/hides recommendations (doesn't change which ones are selected)
- Defaults to **stub mode** if `USE_LLM_STUB=true` or no `OPENAI_API_KEY`

**Stub Mode (Default):**
```typescript
if (USE_LLM_STUB || !OPENAI_API_KEY) {
  // Auto-approve if no blocklist violations
  return { approved: true };
}
```

**Impact on Recommendations:**
- ✅ **Does NOT affect which recommendations are selected**
- ✅ **Does NOT affect persona assignment**
- ✅ **Only affects visibility** (flagged items are hidden, but selection already happened)
- ✅ **Default behavior is deterministic** (stub mode = auto-approve)

**When LLM is enabled:**
- Still doesn't change selection logic
- Only changes whether recommendation is `active` or `hidden` status
- Selection already happened before review

---

## 💬 Chat Interface - Separate Component

**Location:** `backend/src/services/chat/chatService.ts`

**What it does:**
- Answers questions about user's financial data
- Uses OpenAI GPT-4o-mini with function calling
- **Read-only** - cannot modify data or generate recommendations

**Function Tools (All Read-Only):**
1. `get_user_signals` - Read signals
2. `get_user_recommendations` - Read existing recommendations
3. `get_recommendation_details` - Read recommendation details
4. `search_user_transactions` - Search transactions
5. `get_user_accounts` - Read accounts
6. `get_user_profile` - Read profile
7. `explain_financial_term` - General education
8. `calculate_utilization` - Calculator
9. `calculate_emergency_fund` - Calculator

**Impact on Recommendations:**
- ✅ **Zero impact** - Chat only reads data
- ✅ **Cannot generate recommendations**
- ✅ **Cannot assign personas**
- ✅ **Cannot modify user data**

---

## 🎯 Summary: Deterministic Guarantees

| Component | Deterministic? | Affected by OpenAI? |
|-----------|---------------|---------------------|
| Persona Assignment | ✅ Yes | ❌ No |
| Content Matching | ✅ Yes | ❌ No |
| Rationale Generation | ✅ Yes | ❌ No |
| Offer Matching | ✅ Yes | ❌ No |
| Recommendation Selection | ✅ Yes | ❌ No |
| Agentic Review | ⚠️ Optional | ⚠️ Only affects visibility, not selection |
| Chat Interface | N/A | ✅ Separate component, read-only |

---

## 🔧 Ensuring Deterministic Behavior

### Default Configuration (Deterministic):
```bash
# .env (default behavior)
USE_LLM_STUB=true  # Agentic review uses stub mode
# OPENAI_API_KEY not set = stub mode
```

### With OpenAI Enabled (Still Deterministic for Selection):
```bash
# .env (with OpenAI for chat and review)
USE_LLM_STUB=false
OPENAI_API_KEY=sk-...
```

**Even with OpenAI enabled:**
- ✅ Persona assignment is still deterministic (rule-based)
- ✅ Content matching is still deterministic (algorithm-based)
- ✅ Rationale generation is still deterministic (template-based)
- ⚠️ Only agentic review uses LLM (and only affects visibility, not selection)

---

## 📝 Testing Deterministic Behavior

To verify recommendations are deterministic:

1. **Generate recommendations for same user twice:**
   ```bash
   # Same user, same data = same recommendations
   GET /api/recommendations/:userId?refresh=true
   # Run twice, compare results
   ```

2. **Test with/without OpenAI API key:**
   ```bash
   # With OPENAI_API_KEY unset (stub mode)
   npm run eval
   
   # With OPENAI_API_KEY set
   npm run eval
   
   # Recommendations should be identical (only visibility may differ)
   ```

3. **Persona assignment consistency:**
   ```bash
   # Same user data = same persona
   # Check persona assignment is consistent across refreshes
   ```

---

## ✅ Conclusion

**Recommendations and persona assignments are fully deterministic** and do not depend on OpenAI API key. The chatbot is a separate read-only component that helps users understand their data but does not affect recommendation generation.

**Recommendation Generation Flow (All Deterministic):**
```
User Data → Signals → Personas → Content Matching → Rationale Generation → (Optional Review) → Recommendations
```

**Chat Flow (Separate, Read-Only):**
```
User Question → Chat Service → Function Calls → Read Data → Answer Question
```

The two flows are completely independent.

