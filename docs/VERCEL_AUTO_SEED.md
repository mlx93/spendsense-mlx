# Automatic Database Seeding on Vercel Deployment

## Overview

The SpendSense application now automatically seeds the production database during the Vercel build process. This means that after each deployment, the database will be populated with:
- 101 users (100 regular users + 1 operator)
- ~318 accounts
- ~189,000 transactions
- 109 liabilities
- 800+ signals
- 550+ personas
- 32 content articles
- 21 offers
- ~575 recommendations

## How It Works

The build process in `vercel.json` now includes:
1. **Prisma Client Generation** - `npx prisma generate`
2. **Database Migrations** - `npx prisma migrate deploy` (creates schema)
3. **Database Seeding** - `npx prisma db seed` (populates data)
4. **Frontend Build** - `npm run build`

## Build Command

```json
{
  "buildCommand": "cd backend && npx prisma generate && npx prisma migrate deploy && (npx prisma db seed || echo 'Warning: Seed failed, but continuing build. You can seed via /api/seed endpoint.') && cd ../frontend && npm run build"
}
```

### Build Steps Explained

1. **`npx prisma generate`** ✅ **Required** - Generates Prisma Client
   - If this fails, the build fails
   - Needed for all Prisma operations

2. **`npx prisma migrate deploy`** ✅ **Required** - Runs database migrations
   - If this fails, the build fails
   - Creates all database tables

3. **`npx prisma db seed`** ⚠️ **Optional** - Seeds the database
   - If this fails, the build continues with a warning
   - You can manually seed later via `/api/seed` endpoint
   - Takes 1-3 minutes depending on server resources

4. **Frontend build** ✅ **Required** - Builds React app
   - If this fails, the build fails

## Why Seeding is Optional

Seeding can take 1-3 minutes and might fail due to:
- Timeout issues (though unlikely with Vercel's 45-minute limit)
- Memory constraints during large transaction generation
- Network issues when loading content/offers from JSON files

By making it optional, the application can still deploy successfully even if seeding fails. You can then manually seed via the API endpoint:

```bash
curl -X POST https://spendsense-mlx.vercel.app/api/seed \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_SEED_SECRET"}'
```

## Environment Variables Required

For automatic seeding to work, you need these environment variables in Vercel:

- **`DATABASE_URL`** - SQLite database path
  - Can be: `/tmp/spendsense.db` or `file:/tmp/spendsense.db`
  - The build command will automatically add `file:` prefix if missing
  - Default (if not set): `file:/tmp/spendsense.db`
- **`DATA_SEED`** - Seed value for deterministic data generation (default: `1337`)
- **`JWT_SECRET`** - Secret for JWT token generation
- **`JWT_EXPIRES_IN`** - JWT expiration (default: `24h`)

Optional:
- **`SEED_SECRET`** - Only needed if you want to manually seed via API

## Database Persistence

**Important:** SQLite databases on Vercel are stored in `/tmp`, which means:
- ✅ Database persists during the same deployment
- ❌ Database **resets on every redeploy**
- ✅ Automatic seeding ensures fresh data on each deployment

For production persistence, consider:
- Vercel Postgres (serverless PostgreSQL)
- External database service (AWS RDS, PlanetScale, etc.)

## Troubleshooting

### Build Fails During Migrations

If `prisma migrate deploy` fails:
- Check that migrations exist in `backend/prisma/migrations/`
- Verify `DATABASE_URL` is correctly set in Vercel
- Check Vercel build logs for specific error messages

### Build Succeeds But Seeding Fails

If seeding fails but build continues:
1. Check Vercel build logs for seed error messages
2. Manually seed via `/api/seed` endpoint after deployment
3. Verify `DATA_SEED` environment variable is set (if using custom seed)

### Seed Takes Too Long

The seed script generates ~189K transactions, which can take 1-3 minutes. If it's taking longer:
- Check Vercel function memory allocation (currently 1024MB)
- Consider reducing transaction count in seed script
- Seed manually after deployment via API endpoint

## Manual Seeding (Alternative)

If automatic seeding doesn't work or you want to reseed, use the API endpoint:

```bash
# Initial seed
curl -X POST https://spendsense-mlx.vercel.app/api/seed \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_SEED_SECRET"}'

# Force reseed (clears existing data first)
curl -X POST https://spendsense-mlx.vercel.app/api/seed \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_SEED_SECRET", "force": true}'
```

See `SEED_PRODUCTION.md` for more details on manual seeding.

## Verification

After deployment, verify seeding worked:

```bash
# Check health endpoint
curl https://spendsense-mlx.vercel.app/api/health

# Try logging in with seeded user
curl -X POST https://spendsense-mlx.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kellen_effertz45@gmail.com","password":"password123"}'
```

If login succeeds, seeding worked! ✅

## Demo Credentials

After successful seeding, you can use:

**Operator:**
- Email: `operator@spendsense.com`
- Password: `operator123`

**Regular Users:**
- Email: Any seeded email (case-insensitive)
- Examples: `kellen_effertz45@gmail.com`, `emmie.leannon@gmail.com`
- Password: `password123` (for all users)
