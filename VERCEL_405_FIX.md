# Vercel 405 Error - Fix Applied

## Problem Summary

The login endpoint returned **405 Method Not Allowed** in Vercel production when POSTing to `https://spendsense-mlx.vercel.app/api/auth/login`, but worked correctly in local development.

## Root Cause

**PRIMARY ISSUE:** The rewrite rule in `vercel.json` was catching ALL paths (including `/api/*`) and routing them to `index.html` instead of serverless functions. This caused Vercel to return the frontend HTML file for API requests, resulting in a 405 error.

**SECONDARY ISSUE:** The Vercel serverless function configuration in `api/[...path].ts` was missing critical configuration exports.

### Issue 1: Incorrect Rewrite Rule (Main Problem)
The original rewrite rule `"source": "/(.*)"` matched EVERYTHING, including API routes. This sent API requests to `index.html` instead of the serverless functions.

### Issue 2: Missing API Configuration
1. **Missing API configuration export**: Vercel needs an explicit `config` export to disable its default body parser
2. **Missing `externalResolver` flag**: This tells Vercel that we're using an external framework (Express)
3. **Improper typing**: Using `any` types instead of proper `VercelRequest` and `VercelResponse` types

## Changes Made

### 1. Fixed `api/[...path].ts`

**Key changes:**
- Added proper TypeScript types: `VercelRequest` and `VercelResponse` from `@vercel/node`
- Made handler function `async` for better error handling
- Added `export const config` with:
  - `bodyParser: false` - Lets Express handle body parsing instead of Vercel
  - `externalResolver: true` - Tells Vercel we're using Express as an external resolver
- Improved type casting for Express compatibility

```typescript
export const config = {
  api: {
    bodyParser: false, // Let Express handle body parsing
    externalResolver: true, // Tell Vercel we're using an external resolver (Express)
  },
};
```

### 2. Fixed `vercel.json` (CRITICAL FIX)

**The Problem:**
```json
"rewrites": [
  {
    "source": "/(.*)",  // ❌ This catches EVERYTHING including /api/*
    "destination": "/index.html"
  }
]
```

This rewrite rule was sending ALL requests (including `/api/auth/login`) to `index.html`, which resulted in a 405 error because HTML files don't handle POST methods.

**The Solution:**
```json
"rewrites": [
  {
    "source": "/((?!api).*)",  // ✅ Negative lookahead: match anything EXCEPT /api/*
    "destination": "/index.html"
  }
]
```

The regex `/((?!api).*)` uses a **negative lookahead** `(?!api)` to match any path that does NOT start with `api`. This ensures:
- `/api/*` requests → Serverless functions in `api/` directory  
- All other requests (/, /dashboard, etc.) → `index.html` (SPA routing)

## Why This Fixes the 405 Error

1. **Correct routing** (PRIMARY FIX): The negative lookahead regex ensures `/api/*` requests go to serverless functions, not `index.html`. Previously, ALL requests were being routed to `index.html`, which doesn't support POST methods.

2. **`bodyParser: false`**: Vercel doesn't consume the request body before Express can process it.

3. **`externalResolver: true`**: Vercel lets Express fully handle the request/response cycle without timing out or interfering.

## Testing Instructions

After deploying these changes to Vercel:

1. **Test the login endpoint:**
   ```bash
   curl -X POST https://spendsense-mlx.vercel.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

2. **Expected response:**
   - Status: `200 OK` (for valid credentials) or `401 Unauthorized` (for invalid credentials)
   - NOT `405 Method Not Allowed`

3. **Test from frontend:**
   - Try logging in through the UI
   - Check browser console for any errors
   - Verify the request shows as `POST` with proper headers

## Additional Notes

- The `health.ts` and `seed.ts` files in the `api/` directory don't need the same config because they're simple handlers that don't use Express
- Local development continues to work the same way (routes mounted at `/api/*`)
- The Express app correctly handles both Vercel (routes at `/auth`, `/users`, etc.) and local dev (routes at `/api/auth`, `/api/users`, etc.)

## Related Files

- `api/[...path].ts` - Main serverless function handler
- `backend/src/server.ts` - Express app with dual route mounting
- `backend/src/ui/routes/auth.ts` - Login route implementation
- `vercel.json` - Vercel configuration

