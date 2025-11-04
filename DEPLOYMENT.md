# SpendSense Deployment Guide

## Pre-Deployment Checklist

Before deploying to Vercel, ensure you complete these steps:

### 1. Test Build Locally
```bash
# Test frontend build
cd frontend && npm run build

# If build succeeds, test backend compilation
cd ../backend && npm run build
```

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

**Note:** Pushing to the `main` branch automatically triggers Vercel deployment.

## Vercel Deployment

Vercel automatically deploys when you push to `main` branch. The deployment process:

1. **Build Phase**: Vercel runs the build command from `vercel.json`
2. **Install Dependencies**: Installs npm packages for root, frontend, and backend
3. **Build Frontend**: Builds React app using Vite
4. **Deploy**: Deploys frontend and serverless functions

## Production Database Setup

### Initial Seeding

After first deployment, you need to seed the production database:

1. **Option 1: Using Vercel CLI (Recommended)**
   ```bash
   # Install Vercel CLI if not already installed
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Link to your project
   vercel link
   
   # Run seed script in production
   vercel env pull .env.production
   cd backend
   DATABASE_URL=$(grep DATABASE_URL ../.env.production | cut -d '=' -f2) npx tsx prisma/seed.ts
   ```

2. **Option 2: Using Vercel Function**
   - Visit `/api/seed` endpoint (if implemented)
   - Or use Vercel's web console to run a one-time script

3. **Option 3: Direct Database Access**
   - Connect to your production database
   - Run the seed script with production DATABASE_URL

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

