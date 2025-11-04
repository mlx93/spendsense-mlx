# Vercel Production Login 405 Error Summary

## Quick Intro (3 Sentences)

The login endpoint returns **405 Method Not Allowed** in Vercel production when POSTing to `https://spendsense-mlx.vercel.app/api/auth/login`, but works fine locally at `http://localhost:3000/api/auth/login`. We've tried fixing the Vercel catch-all route handler (`api/[...path].ts`) to properly strip the `/api` prefix and route to Express, updated route mounting in `backend/src/server.ts` to handle both Vercel and local paths, and added OPTIONS preflight handling, but the 405 error persists. The issue appears to be a mismatch between how Vercel's serverless function routing processes the catch-all route and how Express matches POST routes, despite local development working correctly.

## ✅ SOLUTION APPLIED

**Root Cause:** Missing Vercel API configuration in `api/[...path].ts`. Vercel's default body parser was consuming the request body before Express could process it, and the missing `externalResolver: true` flag caused Vercel to incorrectly handle the Express response cycle.

**Fix:** Added `export const config` to `api/[...path].ts` with:
- `bodyParser: false` - Lets Express handle body parsing
- `externalResolver: true` - Tells Vercel to let Express fully control the request/response cycle

**See `VERCEL_405_FIX.md` for complete details.**

---

## Problem Description

The login endpoint is failing in Vercel production with a **405 Method Not Allowed** error when making POST requests to `https://spendsense-mlx.vercel.app/api/auth/login`. The same endpoint works correctly in local development (`http://localhost:3000/api/auth/login`), indicating a Vercel-specific routing or serverless function configuration issue. The error occurs consistently for all login attempts, while the operator login endpoint appears to work (though this may be inconsistent).

## Attempted Fixes (None Successful)

**File: `api/[...path].ts` (lines 1-52)**
- Set `process.env.VERCEL = '1'` before importing the Express server to ensure routes mount correctly (line 6)
- Added OPTIONS preflight request handling for CORS (lines 13-20)
- Implemented path stripping logic to remove `/api` prefix from `req.url` and `req.originalUrl` (lines 24-37)
- Ensured HTTP method is preserved (lines 44-47)
- Updated request properties (`req.url`, `req.originalUrl`, `req.path`) for Express routing

**File: `backend/src/server.ts` (lines 78-97)**
- Mounted routes at both `/auth` (for Vercel, after `/api` prefix is stripped) and `/api/auth` (for local dev) (lines 78-86)
- Ensured routes are always mounted regardless of `isVercel` flag (lines 78-86)
- Added conditional mounting with `/api` prefix only for local dev (lines 88-97)

**File: `backend/src/ui/routes/auth.ts` (line 13)**
- Verified the route handler is correctly defined as `router.post('/login', ...)`
- Confirmed authentication logic works in local development

**File: `vercel.json`**
- Verified rewrites configuration routes `/api/(.*)` to `/api/$1` (lines 6-9)
- Confirmed build command includes Prisma generation

The 405 error persists despite these changes, suggesting that either: (1) the Express route handler isn't receiving the request properly after path manipulation, (2) Vercel's serverless function routing is interfering with Express route matching, or (3) there's a mismatch between how Vercel processes the catch-all route and how Express matches routes. The fact that local development works suggests the Express app itself is correctly configured, pointing to a Vercel-specific serverless function execution issue.

