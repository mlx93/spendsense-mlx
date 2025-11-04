# Vercel 405 Error - Fix Applied

## Problem Summary

The login endpoint returned **405 Method Not Allowed** in Vercel production when POSTing to `https://spendsense-mlx.vercel.app/api/auth/login`, but worked correctly in local development.

## Root Cause

The issue was with the Vercel serverless function configuration in `api/[...path].ts`:

1. **Missing API configuration export**: Vercel needs an explicit `config` export to disable its default body parser and allow Express to handle requests properly
2. **Missing `externalResolver` flag**: This tells Vercel that we're using an external framework (Express) to handle the requests
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

### 2. Updated `vercel.json`

**Key changes:**
- Removed the redundant `/api/(.*)` rewrite rule that was causing confusion
- Added explicit function configuration for all API routes with proper memory and timeout settings
- Simplified rewrites to only handle SPA routing for the frontend

## Why This Fixes the 405 Error

1. **`bodyParser: false`**: By default, Vercel's API routes parse the request body, which can interfere with Express's body parsing middleware. This caused the body to be consumed before Express could read it, leading to routing issues.

2. **`externalResolver: true`**: This flag tells Vercel not to expect an immediate response and to let Express fully handle the request/response cycle. Without this, Vercel might timeout or return errors if Express doesn't respond immediately.

3. **Proper types**: Using `VercelRequest` and `VercelResponse` ensures compatibility with Vercel's serverless environment.

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

