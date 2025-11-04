# Sign-In Authentication Fixes

## Summary

Fixed critical production login issues that prevented users from signing in to SpendSense on Vercel. Two main problems were resolved: Vercel routing configuration and PostgreSQL case-insensitive email lookup.

## Problem 1: 405 Method Not Allowed Error

### Symptoms
- Login endpoint returned `405 Method Not Allowed` in Vercel production
- Same endpoint worked correctly in local development
- Error occurred on `POST /api/auth/login` requests

### Root Cause
The `vercel.json` rewrite rule was incorrectly routing ALL requests (including `/api/*`) to `index.html`:

```json
"rewrites": [
  {
    "source": "/(.*)",  // ❌ Matches EVERYTHING including /api/*
    "destination": "/index.html"
  }
]
```

This caused:
- API requests to be served as HTML files
- HTML files don't support POST methods → 405 error
- Serverless functions in `api/` directory never received requests

### Solution
Changed rewrite rule to use negative lookahead regex to exclude `/api/*` paths:

```json
"rewrites": [
  {
    "source": "/((?!api).*)",  // ✅ Matches anything EXCEPT paths starting with /api
    "destination": "/index.html"
  }
]
```

**File:** `vercel.json`

**How it works:**
- Regex `/((?!api).*)` uses negative lookahead `(?!api)` 
- Matches any path that does NOT start with `api`
- Ensures `/api/*` requests go to serverless functions
- All other requests (SPA routes) go to `index.html`

## Problem 2: 401 Unauthorized Error (Case-Sensitive Email)

### Symptoms
- Login returned `401 Invalid email or password` even with correct credentials
- Example emails displayed on login page had mixed case (e.g., `Kellen_Effertz45@gmail.com`)
- Users couldn't login with seeded accounts

### Root Cause
1. **Email Storage:** Seeded users had emails with mixed case from faker.js
2. **Login Logic:** Code normalized input to lowercase but used SQLite-specific case-insensitive lookup
3. **PostgreSQL Migration:** After migrating to PostgreSQL, case-insensitive lookup broke

The old code tried to:
- Normalize email to lowercase
- Do exact match (failed because stored emails have mixed case)
- Fallback to fetching all users and filtering (inefficient and broken)

### Solution
Updated login query to use PostgreSQL's native case-insensitive comparison:

```typescript
// Before (SQLite-specific, broken on PostgreSQL):
let user = await prisma.user.findUnique({
  where: { email: normalizedEmail },
});
if (!user) {
  // Inefficient fallback that didn't work properly
  const allUsers = await prisma.user.findMany({...});
  user = allUsers.find(u => u.email.toLowerCase() === normalizedEmail);
}

// After (PostgreSQL native):
const user = await prisma.user.findFirst({
  where: {
    email: {
      equals: normalizedEmail,
      mode: 'insensitive', // PostgreSQL case-insensitive comparison
    },
  },
});
```

**File:** `backend/src/ui/routes/auth.ts`

**Benefits:**
- ✅ Works with mixed-case emails in database
- ✅ Single efficient database query
- ✅ Native PostgreSQL feature (no fallback needed)
- ✅ Backwards compatible with lowercase emails

## Additional Fixes

### Explicit Serverless Functions
Created explicit serverless functions for nested auth routes to ensure reliable routing:
- `api/auth/login.ts` - Routes to Express app
- `api/auth/example-users.ts` - Standalone function for example users

These ensure Vercel routes nested `/api/auth/*` paths correctly.

### Path Extraction Improvements
Enhanced `api/[...path].ts` to:
- Better handle nested paths
- Preserve query strings for Express
- Add comprehensive logging for debugging

## Testing

### Before Fixes
```bash
curl -X POST https://spendsense-mlx.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Kellen_Effertz45@gmail.com","password":"password123"}'
# Result: 405 Method Not Allowed
```

### After Fixes
```bash
curl -X POST https://spendsense-mlx.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Kellen_Effertz45@gmail.com","password":"password123"}'
# Result: 200 OK with JWT token
```

## Impact

- ✅ Users can now login in production
- ✅ Works with any email case variation (mixed, lowercase, uppercase)
- ✅ Faster login queries (single database call)
- ✅ Reliable routing for all API endpoints

## Related Files

- `vercel.json` - Routing configuration (CRITICAL FIX)
- `backend/src/ui/routes/auth.ts` - Login endpoint with case-insensitive lookup
- `api/[...path].ts` - Catch-all serverless function handler
- `api/auth/login.ts` - Explicit login route handler
- `api/auth/example-users.ts` - Example users endpoint

## Documentation

- `VERCEL_LOGIN_405_ERROR.md` - Original problem description
- `VERCEL_405_FIX.md` - Detailed fix documentation

