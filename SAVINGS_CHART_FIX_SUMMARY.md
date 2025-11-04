# Savings Chart Fix - Session Summary

**Date:** November 4, 2024  
**Status:** ✅ RESOLVED

## Issue Summary
Savings by Month chart on Insights page showed "No savings data available" despite backend correctly generating `savingsByMonth` data.

## Investigation Process

### 1. Backend Verification ✅
- Confirmed `savingsAnalyzer.ts` generates `savingsByMonth` with 6 months of historical data
- Ran diagnostic script connecting directly to database
- Verified data exists for test users:
  - **Lenna**: $19,204 → $21,075 (7 months, May-Nov 2025)
  - **Aimee**: $265,155 → $266,023 (7 months, May-Nov 2025)

### 2. Frontend Validation ✅
- Tested filtering logic with simulation - working correctly
- Confirmed TypeScript interfaces don't strip data (signals typed as `any`)
- Identified issue: Data flow/caching problem between API and browser

### 3. Root Cause
Data existed in database and backend generated it correctly, but:
- Browser may have cached old API responses
- Dev servers may not have been restarted with new code
- No debug logging to track data flow

## Solutions Implemented

### 1. Debug Logging (`frontend/src/pages/InsightsPage.tsx`)
Added comprehensive logging at three key points:

```javascript
// When profile loads
[InsightsPage] Profile loaded: {
  userId,
  hasSignals30d,
  hasSavingsSignal,
  savingsSignalKeys: [...],
  hasSavingsByMonth: true,
  savingsByMonthKeys: 7
}

// When chart renders
[Savings Chart] Data check: {
  hasSavingsSignal: true,
  savingsByMonthType: "object",
  savingsByMonthKeys: 7,
  hasSavingsData: true,
  savingsSignalKeys: [...]
}

// When filtering months
[Savings Chart] Filtering: {
  selectedWindow: 30,
  cutoffDate: "2025-10-05",
  cutoffMonthKey: "2025-10",
  totalMonths: 7,
  filteredMonths: 2,
  chartData: [...]
}
```

### 2. Y-axis Display Fixes
**Problem 1:** Earliest month appeared as $0  
**Root Cause:** `domain: ['dataMin', 'dataMax']` scales chart so minimum value sits at bottom (appears as height 0)

**Evolution of fixes:**
1. First attempt: `domain: [0, 'dataMax']` - Shows true $0 baseline but doesn't accentuate changes
2. User request: Make flexible to show month-to-month variations better
3. Second attempt: `domain: ['auto', 'auto']` - Auto-scales but minimum bar sits on baseline
4. **Final solution:** `domain: [(dataMin) => Math.max(0, dataMin - 1000), 'auto']`

**Benefits of final solution:**
- Zooms into actual data range for better visualization
- Adds $1,000 padding below minimum value
- Minimum bar always has visible height above baseline
- Auto-scales maximum to fit data
- Never goes below $0 (prevents negative axis)

### 3. Diagnostic Tool (`backend/diagnose-savings.js`)
Created script to check database directly:
- Verifies user has savings accounts
- Checks if savings signal exists
- Parses signal data and validates `savingsByMonth` property
- Shows actual month/balance data
- Identifies users with old signals (missing `savingsByMonth`)

**Usage:**
```bash
cd backend
node diagnose-savings.js
```

## Resolution
After restarting dev servers and clearing browser cache, chart displayed correctly with optimized Y-axis scaling.

## Files Modified

### Frontend
- ✅ `frontend/src/pages/InsightsPage.tsx`
  - Added debug logging in `loadProfile()` function
  - Added debug logging in chart render logic
  - Changed Y-axis domain to `[(dataMin) => Math.max(0, dataMin - 1000), 'auto']`

### Backend
- ✅ `backend/diagnose-savings.js` (NEW)
  - Diagnostic script for checking database directly
  - Validates `savingsByMonth` data for test users

### Memory Bank
- ✅ `memory-bank/activeContext.md` - Added detailed section on fix
- ✅ `memory-bank/progress.md` - Updated with completed items

## Expected Behavior

### Chart Display
- **1M view:** Shows 2 months (Oct-Nov 2025)
- **3M view:** Shows 4 months (Aug-Nov 2025)
- **6M view:** Shows 7 months (May-Nov 2025)
- All bars visible with proportional heights
- Y-axis zoomed to data range with $1k padding below minimum
- Month-to-month changes clearly visible

### Console Logs (Development Mode)
```
[InsightsPage] Profile loaded: { hasSavingsByMonth: true, savingsByMonthKeys: 7 }
[InsightsPage] savingsByMonth data: { "2025-05": 19204.46, ... }
[Savings Chart] Data check: { hasSavingsData: true, savingsByMonthKeys: 7 }
[Savings Chart] Filtering: { filteredMonths: 2, chartData: [...] }
```

## Test Users
- `Lenna_Stiedemann73@hotmail.com` - Growing savings ($19,204 → $21,075)
- `Aimee_Oberbrunner@gmail.com` - Large balance ($265,155 → $266,023, mostly flat)
- Password: `password123`

## Key Learnings

1. **Data flow debugging:** Comprehensive logging at each step helps identify exactly where data is lost
2. **Y-axis scaling:** `domain: ['dataMin', 'dataMax']` makes minimum value appear as zero height
3. **Diagnostic tools:** Direct database access scripts invaluable for verifying backend correctness
4. **Cache issues:** Always clear browser cache and restart dev servers after backend changes

## Related Documentation
- Backend analysis: `SAVINGS_CHART_DEBUG.md` (comprehensive investigation notes)
- Frontend component: `frontend/src/pages/InsightsPage.tsx` (lines 320-450)
- Backend feature: `backend/src/features/savingsAnalyzer.ts` (savingsByMonth generation)
- API route: `backend/src/ui/routes/profile.ts` (signal serialization/parsing)

