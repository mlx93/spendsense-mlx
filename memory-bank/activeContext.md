# Active Context - Recent Development

## Current Focus
Completing gap analysis items and fixing Vercel production deployment issues.

## Recent Changes (Post-Memory Bank Update)

### 1. Vercel Production Deployment Fixes
**Issue:** 405 Method Not Allowed errors on `/api/auth/login` in production
**Solution:**
- Updated `api/[...path].ts` to properly handle Vercel serverless function routing
- Strips `/api` prefix from URLs when present
- Routes are now always mounted at both `/auth` (Vercel) and `/api/auth` (local dev)
- Fixed CORS configuration to allow Vercel production domain

**Files Changed:**
- `api/[...path].ts` - Added path prefix stripping and proper handler
- `backend/src/server.ts` - Routes always mounted for both environments
- `frontend/src/lib/apiClient.ts` - Auto-detects production and uses relative URLs

### 2. Spending Patterns & Visualizations
**New Feature:** Complete spending analysis section on Insights page
- Added `/api/transactions` endpoint for spending pattern analysis
- Category breakdown pie chart (Recharts)
- Recurring vs one-time spending bar chart
- Category details table with percentages
- 30/180 day window toggle

**Files Added:**
- `backend/src/ui/routes/transactions.ts` - New spending patterns API
- Updated `frontend/src/pages/InsightsPage.tsx` - Added charts and spending section
- Installed `recharts` package

### 3. Calculator Improvements
**Subscription Audit Tool:**
- Now uses real `recurring_merchants` from subscription signal
- Fetches actual transaction amounts per merchant
- Calculates estimated monthly spend per subscription

**Debt Payoff Simulator:**
- Now uses real APR from liability data (`aprs` JSON field)
- Uses actual `minimum_payment_amount` from liability
- Profile API updated to include `apr` and `minimumPayment` fields

**All Calculators:**
- Added "Take Action" buttons linking to Library with topic filters
- Added collapsible "Show Formula" sections for transparency
- Formula details show calculation steps

**Files Changed:**
- `frontend/src/components/Calculators/SubscriptionAuditTool.tsx`
- `frontend/src/components/Calculators/DebtPayoffSimulator.tsx`
- `frontend/src/components/Calculators/EmergencyFundCalculator.tsx`
- `backend/src/ui/routes/profile.ts` - Added liability data to account response

### 4. Consent Modal
**New Feature:** Modal shown on first login for users without consent
- Explains what data is analyzed
- Privacy information
- "Allow" and "Skip" options
- Auto-loads dashboard after consent granted

**Files Added:**
- `frontend/src/components/ConsentModal.tsx`

**Files Changed:**
- `frontend/src/pages/DashboardPage.tsx` - Shows modal if `consentStatus === false`

### 5. Alert Enhancements
**New Feature:** "Learn more" links on alert banners
- Links to Library page filtered by topic
- Topic determined by alert content (credit, savings, budgeting)
- Improves user flow from alerts to educational content

**Files Changed:**
- `frontend/src/pages/DashboardPage.tsx` - Added links to alerts

### 6. Test Fixes
**Issue:** Rationale generator test failing after return type change
**Solution:** Updated test to expect `RationaleResult` object with `rationale` and `templateId` properties

**Files Changed:**
- `backend/tests/recommend/rationaleGenerator.test.ts`

## Next Steps
1. ✅ All gap analysis items completed
2. Test all changes locally
3. Deploy to Vercel and verify production fixes
4. Update memory bank documentation
5. Git commit and push

## Known Issues Resolved
- ✅ Vercel 405 errors on login routes
- ✅ CORS issues in production
- ✅ Calculator data using mock instead of real data
- ✅ Missing spending patterns visualization
- ✅ Missing consent modal on first login
- ✅ Missing calculator action buttons
- ✅ Missing formula transparency

