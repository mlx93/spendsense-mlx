# Production Database Seeding

This guide shows how to seed the production database on Vercel.

## Prerequisites

1. **SEED_SECRET** must be set in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add `SEED_SECRET` with a secure random string
   - Generate one: `openssl rand -hex 32`

2. Deploy your application to Vercel (the `/api/seed` endpoint must be deployed)

## Seeding the Database

### Option 1: Initial Seed (Recommended)

Seed the database for the first time:

```bash
curl -X POST https://spendsense-mlx.vercel.app/api/seed \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_SEED_SECRET_HERE"}'
```

**Response on success:**
```json
{
  "success": true,
  "message": "Database seeded successfully",
  "counts": {
    "users": 101,
    "accounts": 318,
    "transactions": 189078,
    "liabilities": 109,
    "signals": 800,
    "personas": 550,
    "content": 32,
    "offers": 21,
    "recommendations": 575
  }
}
```

### Option 2: Force Reseed (Clears Existing Data)

⚠️ **Warning:** This will delete all existing data before seeding!

```bash
curl -X POST https://spendsense-mlx.vercel.app/api/seed \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_SEED_SECRET_HERE", "force": true}'
```

## Troubleshooting

### Error: "Unauthorized. Provide valid SEED_SECRET"
- Verify `SEED_SECRET` is set correctly in Vercel Dashboard
- Check that you're using the exact same value (case-sensitive)
- Ensure the environment variable is set for Production environment

### Error: "Database already seeded"
- The database already has content items
- Use `"force": true` in the request body to reseed (⚠️ this clears existing data)

### Error: "Seed failed"
- Check Vercel function logs in the dashboard
- Verify all environment variables are set (DATABASE_URL, JWT_SECRET, etc.)
- Ensure the database is accessible and migrations have run

## Expected Data After Seeding

After successful seeding, you should have:

- **101 users** (100 regular users + 1 operator)
- **318 accounts** (checking, savings, credit cards, etc.)
- **~189,000 transactions** (2 years of transaction history)
- **109 liabilities** (credit card debt, mortgages, etc.)
- **800 signals** (subscription, savings, credit, income signals for 30d and 180d windows)
- **550 personas** (primary and secondary personas for each user)
- **32 content articles** (educational content)
- **21 offers** (partner offers)
- **~575 recommendations** (personalized recommendations for users)

## Quick Reference

**Replace `YOUR_SEED_SECRET_HERE` with your actual SEED_SECRET value**

```bash
# Initial seed
curl -X POST https://spendsense-mlx.vercel.app/api/seed \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_SEED_SECRET_HERE"}'

# Force reseed (clears existing data)
curl -X POST https://spendsense-mlx.vercel.app/api/seed \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_SEED_SECRET_HERE", "force": true}'
```

## Security Notes

- ⚠️ **Never commit SEED_SECRET to git**
- ⚠️ **Never share SEED_SECRET publicly**
- ✅ Keep SEED_SECRET only in Vercel environment variables
- ✅ Use strong, randomly generated secrets
- ✅ Rotate secrets periodically if compromised

## Alternative: Using Vercel CLI

If you prefer using Vercel CLI instead of the API endpoint:

```bash
# Install Vercel CLI
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

