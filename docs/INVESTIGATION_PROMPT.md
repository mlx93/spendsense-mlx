# Vercel 404 Error Investigation Prompt

## Problem Summary

**Production (Vercel):**
- `GET /api/profile/:userId` returns 404 immediately on dashboard load
- `GET /api/recommendations/:userId?refresh=true` returns 404 on refresh button click
- **CRITICAL: NO logs appear in Vercel function logs** - requests don't reach serverless function
- Error: `Failed to load resource: the server responded with a status of 404`

**Development (Local):**
- Refresh button works but takes 5-7 seconds and shows errors
- Dashboard loads successfully
- Profile and recommendations endpoints work

## Key Evidence

1. **No Vercel logs = Requests not reaching serverless function**
   - This suggests Vercel routing configuration issue, not Express routing
   - The catch-all `api/[...path].ts` handler never executes

2. **404 happens immediately on dashboard load**
   - Frontend calls `/api/profile/:userId` via `profileApi.getProfile(userId)`
   - This should route to `api/[...path].ts` → Express `/profile/:userId` route

3. **Some API routes work:**
   - `/api/auth/login` works (has explicit `api/auth/login.ts` file)
   - `/api/auth/example-users` works (has explicit `api/auth/example-users.ts` file)
   - But `/api/profile/:userId` and `/api/recommendations/:userId` don't work

## Current Architecture

### Vercel Routing
- **Catch-all handler:** `api/[...path].ts` - handles all `/api/*` routes
- **Explicit handlers:** `api/auth/login.ts`, `api/auth/example-users.ts`
- **vercel.json:** Uses rewrites to route non-API paths to `index.html`

### Express Routes (backend/src/server.ts)
- Routes mounted without `/api` prefix for Vercel:
  - `/profile` → `profileRoutes`
  - `/recommendations` → `recommendationsRoutes`
- Routes mounted with `/api` prefix for local dev

### Path Extraction (api/[...path].ts)
- Extracts path from `req.url`
- Strips `/api` prefix
- Forwards to Express app

## Files to Investigate

1. **`vercel.json`** - Check routing configuration
2. **`api/[...path].ts`** - Catch-all handler implementation
3. **`backend/src/server.ts`** - Express route mounting
4. **`frontend/src/services/api.ts`** - API client configuration
5. **`frontend/src/lib/apiClient.ts`** - Base URL configuration

## Questions to Answer

1. **Why don't requests reach the catch-all handler?**
   - Is Vercel matching `/api/profile/:userId` to a different route?
   - Is there a conflict with explicit route files?
   - Is the catch-all pattern `[...path]` working correctly?

2. **Why do explicit routes work but catch-all doesn't?**
   - `api/auth/login.ts` works
   - `api/auth/example-users.ts` works
   - But nested paths like `api/profile/:userId` don't

3. **Is there a Vercel configuration issue?**
   - Check `vercel.json` rewrites/routes configuration
   - Check if functions configuration interferes with routing
   - Check if there's a build output issue

4. **Why does dev work but prod doesn't?**
   - Dev uses direct Express server (localhost:3000)
   - Prod uses Vercel serverless functions
   - What's different in the routing?

## Potential Root Causes

1. **Vercel catch-all pattern issue**
   - `[...path]` might not match nested paths correctly
   - May need explicit route files for nested paths

2. **Rewrite configuration conflict**
   - `vercel.json` rewrites might be intercepting `/api/*` requests
   - Negative lookahead regex might not be working correctly

3. **Function deployment issue**
   - Catch-all function might not be deployed correctly
   - Build output might be missing the function

4. **Path matching priority**
   - Vercel might prioritize explicit files over catch-all
   - Need to check Vercel routing precedence

## Recent Changes That Might Be Related

1. Fixed `generateUserData()` to properly save signals/personas
2. Added logging to `api/[...path].ts` (but logs never appear)
3. Improved path extraction logic
4. Fixed Prisma Client generation for `api/` functions

## Testing Strategy

1. **Check Vercel function deployment:**
   - Verify `api/[...path].ts` is in the build output
   - Check function exists in Vercel dashboard

2. **Test routing directly:**
   - Try calling `/api/profile/:userId` directly (curl/Postman)
   - Check if ANY logs appear

3. **Check vercel.json:**
   - Verify rewrites don't conflict with `/api/*` paths
   - Test if removing rewrites helps

4. **Create explicit route files:**
   - Try creating `api/profile/[userId].ts` as test
   - See if explicit route works

## Expected Behavior

- `/api/profile/:userId` → `api/[...path].ts` → extracts `/profile/:userId` → Express route `/profile/:userId`
- `/api/recommendations/:userId?refresh=true` → `api/[...path].ts` → extracts `/recommendations/:userId` → Express route `/recommendations/:userId`

## Debugging Steps

1. Check Vercel deployment logs for any routing warnings
2. Verify `api/[...path].ts` is being deployed
3. Test with explicit route files for profile/recommendations
4. Check if Vercel's routing matches the catch-all pattern
5. Review Vercel documentation on catch-all routes with nested paths

## Success Criteria

- `/api/profile/:userId` returns 200 with profile data
- `/api/recommendations/:userId?refresh=true` returns 200 with recommendations
- Vercel function logs show requests reaching the handler
- No 404 errors on dashboard load or refresh

---

**Investigation Goal:** Determine why Vercel isn't routing `/api/profile/:userId` and `/api/recommendations/:userId` to the catch-all handler, and fix the routing so these endpoints work in production.

