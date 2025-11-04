#!/bin/bash
set -e

echo "Installing dependencies at root..."
npm install

echo "Generating Prisma Client in backend..."
cd backend
npx prisma generate

echo "Copying Prisma Client to root for api/ directory..."
# Prisma generates to backend/node_modules/@prisma/client
# We need it in root node_modules for api/ serverless functions
mkdir -p ../node_modules/@prisma
cp -r node_modules/@prisma/client ../node_modules/@prisma/ 2>/dev/null || echo "Note: Prisma Client copy may have failed, but backend generation succeeded"

# Only run migrations and seed in production if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL is set, running migrations..."
  
  # Use non-pooling connection for migrations (pooler doesn't support DDL)
  # If we have the non-pooling URL, use it for migrations
  if [ -n "$SUPABASE_POSTGRES_URL_NON_POOLING" ]; then
    echo "Using direct (non-pooling) connection for migrations..."
    export MIGRATION_DATABASE_URL="$SUPABASE_POSTGRES_URL_NON_POOLING"
  else
    export MIGRATION_DATABASE_URL="$DATABASE_URL"
  fi
  
  DATABASE_URL="$MIGRATION_DATABASE_URL" npx prisma migrate deploy
  
  echo "Checking if database needs seeding..."
  # Only seed if User table is empty (first deployment)
  # Use check-users.js script (runs from backend directory where Prisma Client exists)
  USER_COUNT=$(DATABASE_URL="$MIGRATION_DATABASE_URL" SIMPLE_OUTPUT=1 node check-users.js 2>/dev/null | head -1 || echo "0")
  if [ "$USER_COUNT" = "0" ]; then
    echo "Database is empty, seeding..."
    DATABASE_URL="$MIGRATION_DATABASE_URL" npx prisma db seed || echo "Seed failed, continuing build"
  else
    echo "Database already has data (found $USER_COUNT rows in User table), skipping seed"
  fi
else
  echo "DATABASE_URL not set, skipping database setup"
fi

echo "Building frontend..."
cd ../frontend
npm run build

echo "Build complete!"
