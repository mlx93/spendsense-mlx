# Deployment Checklist - Vercel 405 Fix

## Pre-Deployment

- [x] Updated `api/[...path].ts` with proper Vercel configuration
- [x] Added `bodyParser: false` to let Express handle parsing
- [x] Added `externalResolver: true` for Express integration
- [x] Added proper TypeScript types (`VercelRequest`, `VercelResponse`)
- [x] Updated `vercel.json` with function configuration
- [x] Verified no linting errors

## Deployment Steps

1. **Commit changes:**
   ```bash
   git add api/[...path].ts vercel.json VERCEL_405_FIX.md VERCEL_LOGIN_405_ERROR.md
   git commit -m "fix: resolve Vercel 405 error for login endpoint

   - Add explicit API config to disable Vercel body parser
   - Enable externalResolver for Express integration
   - Update vercel.json with function configuration
   - Fixes POST requests to /api/auth/login in production"
   ```

2. **Push to deploy:**
   ```bash
   git push origin main
   ```

3. **Wait for deployment** (check Vercel dashboard)

## Post-Deployment Testing

### 1. Basic Health Check
```bash
curl https://spendsense-mlx.vercel.app/api/health
```
Expected: `{"status":"ok"}`

### 2. Test Login Endpoint (should NOT return 405)
```bash
curl -X POST https://spendsense-mlx.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'
```
Expected: `401 Unauthorized` with JSON error (NOT 405 Method Not Allowed)

### 3. Test with Valid Credentials
Use actual credentials from your seeded database:
```bash
curl -X POST https://spendsense-mlx.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"actual-user@example.com","password":"actual-password"}'
```
Expected: `200 OK` with user object and JWT token

### 4. Test from Frontend
1. Open https://spendsense-mlx.vercel.app
2. Navigate to login page
3. Enter valid credentials
4. Click login
5. Check browser DevTools Network tab:
   - Request should show `POST /api/auth/login`
   - Status should be `200 OK` or `401` (NOT 405)

### 5. Test OPTIONS Preflight (CORS)
```bash
curl -X OPTIONS https://spendsense-mlx.vercel.app/api/auth/login \
  -H "Origin: https://spendsense-mlx.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  -v
```
Expected: `200 OK` with CORS headers

## Troubleshooting

### If 405 Still Occurs

1. **Check Vercel logs:**
   - Go to Vercel dashboard > Your project > Logs
   - Filter for requests to `/api/auth/login`
   - Look for any error messages

2. **Verify build succeeded:**
   - Check that Prisma generation ran
   - Verify no TypeScript errors during build

3. **Check function deployment:**
   - Verify `api/[...path].ts` was deployed as a serverless function
   - Check function logs for any initialization errors

4. **Clear Vercel cache:**
   ```bash
   # In Vercel dashboard: Settings > General > Clear Cache
   # Or redeploy with:
   git commit --allow-empty -m "redeploy: clear cache"
   git push
   ```

### If Other Errors Occur

- **500 Internal Server Error**: Check Vercel function logs for errors
- **CORS errors**: Verify origin is in allowed list in `backend/src/server.ts`
- **Timeout**: Increase `maxDuration` in `vercel.json` if needed
- **Database errors**: Verify `VERCEL_URL` and database connection in Vercel env vars

## Success Criteria

✅ Login endpoint returns `401` for invalid credentials (not 405)  
✅ Login endpoint returns `200` with token for valid credentials  
✅ Frontend can successfully authenticate users  
✅ No CORS errors in browser console  
✅ OPTIONS preflight requests work correctly  

## Rollback Plan

If the fix doesn't work:
```bash
git revert HEAD
git push origin main
```

Then investigate Vercel logs for more details.

