# Setting up PostgreSQL for Vercel Production

## Overview
- **Local Development**: Uses SQLite (`backend/prisma/dev.db`)
- **Vercel Production**: Uses PostgreSQL (Vercel Postgres)

## Setup Steps

### 1. Create Vercel Postgres Database

1. Go to your Vercel project dashboard
2. Navigate to the "Storage" tab
3. Click "Create Database"
4. Select "Postgres"
5. Choose a name (e.g., "spendsense-db")
6. Select a region close to your users
7. Click "Create"

### 2. Connect Database to Project

Vercel will automatically add these environment variables to your project:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL` (optimized for Prisma)
- `POSTGRES_URL_NON_POOLING`
- And others...

### 3. Update DATABASE_URL Environment Variable

1. In your Vercel project settings → Environment Variables
2. Add or update `DATABASE_URL` to use `POSTGRES_PRISMA_URL`:
   - **Key**: `DATABASE_URL`
   - **Value**: Use the reference `$POSTGRES_PRISMA_URL`
   - **Environment**: Production

### 4. Create Initial Migration (One-time)

Run this locally to create the initial PostgreSQL migration:

```bash
cd backend

# Temporarily set DATABASE_URL to a PostgreSQL connection
# (You can use your Vercel Postgres URL or a local PostgreSQL instance)
export DATABASE_URL="your-postgres-url-here"

# Create the migration
npx prisma migrate dev --name init
```

This will create the migration files in `backend/prisma/migrations/`.

### 5. Deploy

```bash
git add -A
git commit -m "feat: migrate to PostgreSQL for production"
git push origin main
```

Vercel will:
1. Generate Prisma Client
2. Run migrations (`prisma migrate deploy`)
3. Seed the database
4. Build the frontend
5. Deploy everything

## Local Development

For local development, continue using SQLite:

```bash
# Set DATABASE_URL for local SQLite
export DATABASE_URL="file:./prisma/dev.db"

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Start dev server
npm run dev
```

## Important Notes

- Database files (`*.db`) are gitignored
- Migrations are tracked in git
- Production uses Vercel Postgres (persistent, scalable)
- Local dev uses SQLite (simple, no setup required)

## Vercel Postgres Benefits

✅ Persistent storage (data survives deployments)
✅ Scalable (handles concurrent connections)
✅ Managed service (backups, monitoring, etc.)
✅ Fast (connection pooling built-in)
