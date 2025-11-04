# Savings by Month Chart Debug Notes

## Issue Resolution ✅
**ROOT CAUSE FOUND**: Backend is generating data correctly, but the issue is visibility/display related.

## Test Results (2025-11-04)

### Test User 1: `Aimee_Oberbrunner@gmail.com`
ID: `6c6f3cca-e1d7-409b-96d4-f1242b7360f9`

**Savings Accounts:**
- Money Market: $175,309.18
- Savings: $90,714.10
- **Total Balance: $266,023.27**

**Transactions:**
- Only **1 transaction in past 6 months** (2025-09-01: +$868.09)
- Transaction from 2024-01-01 is outside the 180-day window

**Generated savingsByMonth Data (WORKING ✅):**
```
2025-05: $265,155.18
2025-06: $265,155.18
2025-07: $265,155.18
2025-08: $265,155.18
2025-09: $266,023.27 (transaction occurred)
2025-10: $266,023.27
2025-11: $266,023.27
```

### Test User 2: `Lenna_Stiedemann73@hotmail.com`
ID: `055e596f-55d6-4d71-b8fa-33742b8c457b`

**Savings Accounts:**
- 2x Money Market: $21,075.08 total

**Transactions:**
- **3 transactions in past 6 months**:
  - 2025-06-01: +$387.54
  - 2025-09-01: +$663.42
  - 2025-11-01: +$819.66

**Generated savingsByMonth Data (WORKING ✅):**
```
2025-05: $19,204.46
2025-06: $19,592.01 (+$387)
2025-07: $19,592.01
2025-08: $19,592.01
2025-09: $20,255.43 (+$663)
2025-10: $20,255.43
2025-11: $21,075.08 (+$819)
```

**Conclusion**: Backend is generating data correctly for BOTH users. The issue is frontend display/API response.

## Implementation Status
✅ **Backend**: `savingsByMonth` calculation is implemented in `backend/src/features/savingsAnalyzer.ts`
   - Works backwards from current balance to calculate historical balances
   - Groups transactions by month
   - Generates data for up to 6 months
   - Includes comprehensive debug logging

✅ **API**: `savingsByMonth` is included in profile signals response
   - Backend routes format and return the data correctly

✅ **Frontend**: Chart rendering is implemented in `frontend/src/pages/InsightsPage.tsx`
   - Filters data by selected time window (1M/3M/6M)
   - Shows placeholder when no data available
   - Includes debug logging in development mode

## Debug Steps

### 1. Check Backend Logs
When developing locally, the backend should log:
```
[Savings Analyzer] Transaction analysis: { userId, totalTransactions, transactionMonths, ... }
[Savings Analyzer] savingsByMonth calculated: { userId, totalMonths, months, ... }
```

### 2. Check Frontend Console
In the browser console, you should see:
```
[Savings Chart] Filtering: { selectedWindow, cutoffDate, cutoffMonthKey, totalMonths, filteredMonths, allMonthsData, filteredMonthsData }
```

### 3. Verify Data Flow
1. Open browser dev tools → Network tab
2. Navigate to Insights page
3. Find the `/api/profile/:userId` request
4. Check the response → `signals['30d'].savings.savingsByMonth`
5. Should be an object with month keys (e.g., "2024-11", "2024-10") and balance values

### 4. Common Issues
- **Empty object**: User might not have savings account transactions in the past 6 months
- **All same value**: Calculation logic might not be working correctly for months with no transactions
- **Not responsive to time toggles**: Frontend filtering logic issue

## Test User
Recommended test user: `Aimee_Oberbrunner@gmail.com`
- Has high monthly income
- Has large savings balance
- Should have transaction history

## Next Steps for User
1. **Build backend**: `cd backend && npm run build` ← **CRITICAL: Must rebuild!**
2. **Start development servers**:
   - Backend: `cd backend && npm run dev`
   - Frontend: `cd frontend && npm run dev`
3. **Login** as test user: `Lenna_Stiedemann73@hotmail.com` or `Aimee_Oberbrunner@gmail.com`
4. **Navigate to Insights page**
5. **Open Browser DevTools**:
   - Check **Console** for `[Savings Chart] Filtering` logs
   - Check **Network tab** for `/api/profile/:userId` response
   - Verify `signals['30d'].savings.savingsByMonth` contains data like:
     ```json
     {
       "2025-05": 19204.46,
       "2025-06": 19592.01,
       ...
     }
     ```

## Expected Chart Behavior (Lenna)
- **1M (30 days)**: Should show Oct & Nov 2025
- **3M (90 days)**: Should show Sep, Oct, Nov 2025
- **6M (180 days)**: Should show all 7 months (May through Nov)

## Root Cause Analysis
**The backend is generating correct data**. If chart is still empty, the issue is:

1. **Backend not rebuilt**: Old compiled code doesn't have `savingsByMonth`
2. **API not returning data**: Check `/api/profile/:userId` response in Network tab
3. **Frontend filtering too aggressive**: Console logs will show if months are being filtered out
4. **Chart component not rendering**: TypeScript/React error preventing display

