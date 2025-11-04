# Focused Action Items - Post-Review

**Date:** December 2024  
**Based on:** Code review and user clarifications

---

## 🔴 **Critical Fixes (Must Implement)**

### 1. **Enforce Recommendation Count Requirements**
**PRD Requirement:** 3-5 education items + 1-3 offers per user

**Current Issue:** 
- Code selects up to 5 education items but doesn't enforce minimum of 3
- Could return 1-2 recommendations if not enough matches
- No minimum enforcement for offers (could return 0)

**Fix Required:**
- After diversification logic, ensure at least 3 education recommendations
- If fewer than 3 matches, pad with lower-relevance items (even if duplicates allowed temporarily)
- Ensure at least 1 offer if any eligible offers exist
- Log warning if can't meet minimums (e.g., user has no eligible content)

**Location:** `backend/src/ui/routes/recommendations.ts` line 288-296 (after selection logic)

**Implementation:**
```typescript
// After final pass, enforce minimums
if (selectedMatches.length < 3) {
  // Pad with remaining contentMatches if available
  // Or log warning that minimum can't be met
}
```

---

### 2. **Add Consent Check Inside generateUserData()**
**PRD Requirement:** "Recomputation is blocked until consent is re-enabled" (SS_Reqs_PRD.md Section 6.1)

**Current Issue:** `refresh=true` starts background `generateUserData()` without checking consent status inside the function

**Fix Required:**
- Add consent check at start of `generateUserData()` function
- Return early if consent revoked
- Add consent check before creating each recommendation batch

**Location:** `backend/src/ui/routes/recommendations.ts` line 20 (start of `generateUserData()`)

**Implementation:**
```typescript
export async function generateUserData(userId: string): Promise<void> {
  // Check consent FIRST
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { consent_status: true },
  });
  
  if (!user?.consent_status) {
    console.log(`[generateUserData] User ${userId} has revoked consent, aborting`);
    return; // Exit early
  }
  
  // ... rest of function
}
```

---

### 3. **Exclude Dismissed Content from Matching**
**PRD Requirement:** "Exclude content user has marked as 'completed' or 'dismissed'" (SS_Reqs_PRD.md Section 4.3)

**Current Issue:** `contentMatcher.ts` doesn't check for dismissed/completed recommendations

**Fix Required:**
- After `matchContentToUser()` returns matches, query user's dismissed/completed recommendations
- Filter out `content_id`s that are already dismissed/completed
- Apply same logic for offers

**Location:** `backend/src/ui/routes/recommendations.ts` - After line 155 (after getting contentMatches)

**Implementation:**
```typescript
// After getting contentMatches and secondaryMatches
// Query dismissed/completed recommendations
const excludedRecommendations = await prisma.recommendation.findMany({
  where: {
    user_id: userId,
    status: { in: ['dismissed', 'completed'] },
  },
  select: { content_id: true, offer_id: true },
});

const excludedContentIds = new Set(
  excludedRecommendations
    .map(r => r.content_id)
    .filter(Boolean)
);

// Filter out excluded content from matches
const filteredMatches = contentMatches.filter(
  m => !excludedContentIds.has(m.contentId)
);
```

---

### 4. **Fix Undismiss to Restore to 'active' Status**
**Current Issue:** Undismiss sets status to 'saved' instead of 'active'

**Fix Required:**
- Add new action type 'undismiss' or change mapping
- When undismissing, set status to 'active' so item reappears in recommendations

**Location:** 
- `frontend/src/pages/SettingsPage.tsx` line 190
- `backend/src/ui/routes/recommendations.ts` status mapping (line 49-54)

**Implementation:**
- Option 1: Add 'undismiss' action that maps to 'active'
- Option 2: Change Settings to call API with explicit status update endpoint

---

### 5. **Add Toggle to Show/Hide Dismissed Recommendations**
**Feature:** Allow users to view their dismissed items and toggle them on/off

**Implementation:**
- Add toggle button/checkbox on Dashboard or Settings page
- When enabled, fetch recommendations with `status=dismissed` and display them
- Allow user to undismiss directly from this view

**Location:** `frontend/src/pages/DashboardPage.tsx` or `frontend/src/pages/SettingsPage.tsx`

---

## 🟡 **Operator Dashboard Improvements**

### 6. **Operator Login Defaults to Operator Tab**
**Feature:** When operator logs in, automatically navigate to `/operator` instead of `/`

**Fix Required:**
- Check user role in login redirect logic
- If role === 'operator', navigate to '/operator'
- Update `frontend/src/lib/authContext.tsx` or `frontend/src/pages/LoginPage.tsx`

**Location:** `frontend/src/lib/authContext.tsx` login function

---

### 7. **User Search: Dropdown with Keyword Search**
**Current State:** Text input with filtered list below

**Enhancement Required:**
- Convert to dropdown/combobox component
- Add keyword search functionality (already works, but make it a proper dropdown)
- Prioritize example users at top of dropdown
- Show user email + persona badge in dropdown

**Location:** `frontend/src/pages/OperatorPage.tsx` line 140-171

**Implementation:**
- Use a proper dropdown component (Headless UI Combobox or similar)
- Sort users: example users first, then alphabetically
- Display persona badge in dropdown items

---

### 8. **Flagged Recommendations Visibility & Actions**
**Current State:** Flagged queue exists but needs enhancement

**Enhancement Required:**
- Ensure operator can see flagged recommendations clearly
- Allow operator to hide flagged recommendations from user view
- Show which user each flagged recommendation belongs to (already implemented)
- Add action to hide directly from flagged queue

**Status:** ✅ **Mostly Implemented** - Just needs UI polish

**Location:** `frontend/src/pages/OperatorPage.tsx` line 182-243

---

## 🟢 **Clarifications & Decisions**

### 9. **Remove Persona Override Feature**
**Decision:** Persona override feature will be removed entirely

**Rationale:** 
- SpendSense.md original prompt specifies "Approve or override recommendations" (not personas)
- Personas are rule-based from transaction data and should not be manually manipulated
- Operators should only have power to approve/hide recommendations, not change persona assignments

**Action Required:**
- Remove `POST /api/operator/user/:userId/persona-override` endpoint
- Remove persona override UI from operator dashboard
- Keep "Regenerate Recommendations" functionality that uses current rule-based persona assignment

**Location:** `backend/src/ui/routes/operator.ts` line 454-530

---

## 📋 **Implementation Priority**

### **Phase 1: Critical Fixes (Do First)**
1. ✅ Enforce recommendation count (3-5 education, 1-3 offers)
2. ✅ Add consent check inside `generateUserData()`
3. ✅ Exclude dismissed content from matching
4. ✅ Fix undismiss to restore to 'active'

### **Phase 2: User Experience (Do Next)**
5. ✅ Add toggle to show/hide dismissed recommendations
6. ✅ Operator login defaults to operator tab
7. ✅ User search dropdown with example users prioritized

### **Phase 3: Polish (Do Last)**
8. ✅ Enhance flagged recommendations UI
9. ✅ Remove persona override feature entirely

---

## ✅ **Already Working Correctly (No Changes Needed)**

- ✅ Refresh logic (full recompute is acceptable, fast enough)
- ✅ Consent middleware on all required endpoints
- ✅ Dismissed items stored in database with status='dismissed'
- ✅ Flagged recommendations queue exists and functional
- ✅ Operator can hide recommendations
- ✅ Recommendation diversification logic implemented

---

## 📝 **Notes**

- **Refresh Logic:** User confirmed full recompute is acceptable (no diff-based logic needed)
- **Dismissed Items:** Should be excluded from matching, but kept in queue for undismiss functionality
- **Persona Override:** Removing entirely - personas are rule-based only, operators can only approve/hide recommendations

