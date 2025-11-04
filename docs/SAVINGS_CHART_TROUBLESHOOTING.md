# Savings Chart Troubleshooting Guide

## Problem
The Savings by Month chart on the Insights page shows "No savings data available" even though backend generates data correctly.

## Root Cause Analysis ✅

### What We Confirmed
1. ✅ Backend code (`savingsAnalyzer.ts`) correctly generates `savingsByMonth` data
2. ✅ Database contains `savingsByMonth` data for test users (verified via diagnostic script)
3. ✅ Frontend filtering logic works correctly (tested with simulation)
4. ✅ Both test users (Lenna & Aimee) have 7 months of data (May-Nov 2025)

### Most Likely Issues
The data exists in the database but isn't reaching the frontend chart. This can happen due to:

1. **Browser Cache** - Old API responses cached
2. **Dev Server Not Restarted** - Frontend using old code
3. **API Response Issue** - Data not being serialized correctly

## Solution Steps

### Step 1: Clear Browser Cache
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Check "Disable cache" checkbox
4. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### Step 2: Restart Dev Servers
```bash
# Kill any running servers
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 3: Check Browser Console
1. Login as `Lenna_Stiedemann73@hotmail.com` or `Aimee_Oberbrunner@gmail.com`
2. Navigate to Insights page
3. Open Browser Console (F12 → Console tab)
4. Look for these debug messages:

```
[InsightsPage] Profile loaded: {
  userId: "...",
  hasSignals30d: true,
  hasSavingsSignal: true,
  savingsSignalKeys: ["net_inflow", "growth_rate", "emergency_fund_coverage", "savings_balance", "savingsByMonth"],
  hasSavingsByMonth: true,     <-- Should be TRUE
  savingsByMonthKeys: 7        <-- Should be 7 months
}

[InsightsPage] savingsByMonth data: {
  "2025-05": 19204.46,
  "2025-06": 19592.01,
  ...
}

[Savings Chart] Data check: {
  hasSavingsSignal: true,
  savingsByMonthType: "object",
  savingsByMonthKeys: 7,       <-- Should be 7
  hasSavingsData: true,        <-- Should be TRUE
  savingsSignalKeys: [...]
}

[Savings Chart] Filtering: {
  selectedWindow: 30,
  totalMonths: 7,
  filteredMonths: 2,           <-- Should be 2 for 30-day window
  ...
}
```

### Step 4: Check Network Tab
1. Open DevTools → Network tab
2. Navigate to Insights page
3. Find the `/api/profile/:userId` request
4. Click on it → Preview/Response tab
5. Navigate to: `signals['30d'].savings.savingsByMonth`
6. Should see object with month keys:
```json
{
  "2025-05": 19204.46,
  "2025-06": 19592.01,
  "2025-07": 19592.01,
  "2025-08": 19592.01,
  "2025-09": 20255.43,
  "2025-10": 20255.43,
  "2025-11": 21075.08
}
```

### Step 5: If Still Not Working
If console shows `hasSavingsByMonth: false` or `savingsByMonthKeys: 0`:

1. **Check if API response is correct**:
   - Network tab → `/api/profile/:userId` → Response tab
   - If `savingsByMonth` is missing or empty, backend issue

2. **Try refreshing insights**:
   - Click the "Refresh" button on Insights page
   - This regenerates all signals with latest code

3. **Run diagnostic script**:
```bash
cd backend
node diagnose-savings.js
```

Expected output:
```
✅ savingsByMonth has 7 months:
   2025-05: $19204.46
   2025-06: $19592.01
   ...
```

## Changes Made

### Frontend (`InsightsPage.tsx`)
- Added comprehensive debug logging in development mode
- Logs show exactly what data is received from API
- Logs show whether `savingsByMonth` exists and how many months

### Diagnostic Script (`backend/diagnose-savings.js`)
- Connects directly to database
- Checks if signals have `savingsByMonth` data
- Shows which users need signal regeneration

## Expected Behavior

After fixing, the Savings by Month chart should:
- Display a green bar chart with 2-7 months of data (depending on selected window)
- Show realistic balance growth over time
- Update when switching between 1M/3M/6M buttons
- Match the debug logs in console

## Test Users
- `Lenna_Stiedemann73@hotmail.com` - Growing savings ($19k → $21k)
- `Aimee_Oberbrunner@gmail.com` - Large balance ($265k, mostly flat)
- Password: `password123`

## Related Files
- Backend: `backend/src/features/savingsAnalyzer.ts`
- Frontend: `frontend/src/pages/InsightsPage.tsx`
- API: `backend/src/ui/routes/profile.ts`
- Diagnostic: `backend/diagnose-savings.js`

