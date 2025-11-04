# SpendSense Deployment Guide

## Pre-Deployment Checklist

**⚠️ CRITICAL: Always test builds before deploying!**

Before deploying to Vercel, ensure you complete these steps **in order**:

### 1. Test Build Locally (REQUIRED)
```bash
# Test frontend build (MUST pass before deploying)
cd frontend && npm run build

# If build succeeds, test backend compilation
cd ../backend && npm run build
```

**If build fails:**
- Fix all TypeScript errors
- Fix all linting errors
- Re-run build until it passes
- **NEVER deploy with build errors**

### 2. Fix All TypeScript Errors
- Run `npm run build` in both frontend and backend directories
- Fix any TypeScript errors before committing
- **Never deploy with build errors**

### 3. Run Tests (Optional but Recommended)
```bash
cd backend && npm run test
```

### 4. Commit and Push
```bash
# Stage all changes
git add -a

# Commit with descriptive message
git commit -m "Your descriptive commit message"

# Push to trigger Vercel deployment
git push
```

**Note:** 
- Pushing to the `main` branch automatically triggers Vercel deployment
- Vercel will run the build command during deployment
- If build fails on Vercel, deployment will fail (this is expected behavior)

## Vercel Deployment

Vercel automatically deploys when you push to `main` branch. The deployment process:

1. **Build Phase**: Vercel runs the build command from `vercel.json`
2. **Install Dependencies**: Installs npm packages for root, frontend, and backend
3. **Build Frontend**: Builds React app using Vite
4. **Deploy**: Deploys frontend and serverless functions

## Production Database Setup

### Initial Seeding

After first deployment, you need to seed the production database. **Note:** SQLite on Vercel serverless functions uses `/tmp` which resets on each deployment. For persistent data, consider using Vercel Postgres or an external database.

#### Option 1: Using Vercel API Endpoint (Easiest)

1. **Set SEED_SECRET environment variable in Vercel Dashboard:**
   - Go to Project Settings → Environment Variables
   - Add `SEED_SECRET` with a secure random string
   - Generate one: `openssl rand -hex 32`

2. **Call the seed endpoint:**
   ```bash
   curl -X POST https://your-vercel-url.vercel.app/api/seed \
     -H "Content-Type: application/json" \
     -d '{"secret": "your-seed-secret-here"}'
   ```

   Or use force reseed (clears existing data first):
   ```bash
   curl -X POST https://your-vercel-url.vercel.app/api/seed \
     -H "Content-Type: application/json" \
     -d '{"secret": "your-seed-secret-here", "force": true}'
   ```

#### Option 2: Using Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Pull production environment variables
vercel env pull .env.production

# Run seed script with production DATABASE_URL
cd backend
DATABASE_URL=$(grep DATABASE_URL ../.env.production | cut -d '=' -f2) npx tsx prisma/seed.ts
```

#### Option 3: Using Vercel Postgres (Recommended for Production)

For persistent data in production, migrate to Vercel Postgres:

1. In Vercel Dashboard → Project → Storage → Create Database → Postgres
2. Update `DATABASE_URL` environment variable to use Postgres connection string
3. Run migrations: `npx prisma migrate deploy`
4. Run seed using Option 1 or 2 above

### Database Migrations

Run migrations before seeding:

```bash
cd backend
DATABASE_URL="your-production-database-url" npx prisma migrate deploy
```

## Environment Variables

Ensure these are set in Vercel Dashboard:

- `DATABASE_URL` - Production database connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `OPENAI_API_KEY` - OpenAI API key (if using chat features)
- `FRONTEND_URL` - Your production frontend URL
- `VERCEL` - Set to `1` (automatically set by Vercel)

## Troubleshooting

### Build Fails on Vercel
1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Verify TypeScript compilation succeeds locally
4. Check for missing environment variables

### Database Connection Issues
1. Verify `DATABASE_URL` is set correctly in Vercel
2. Check database access permissions
3. Ensure database is accessible from Vercel's IP ranges

### API Routes Return 405 Errors
1. Verify `api/[...path].ts` handler is correctly configured
2. Check that routes are mounted correctly in `server.ts`
3. Ensure CORS is configured for production origins

## Post-Deployment Verification

After deployment, verify:

1. ✅ Frontend loads at production URL
2. ✅ API endpoints respond correctly (`/api/health`)
3. ✅ Database is seeded (check table counts)
4. ✅ Authentication works (login/logout)
5. ✅ Recommendations are generated for users
6. ✅ Chat functionality works (if OpenAI key is set)

## Rollback Procedure

If deployment fails:

1. Go to Vercel Dashboard
2. Navigate to Deployments
3. Find last working deployment
4. Click "..." menu → "Promote to Production"

