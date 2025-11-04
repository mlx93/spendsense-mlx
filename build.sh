#!/bin/bash
set -e

echo "Installing dependencies at root..."
npm install

echo "Generating Prisma Client in backend..."
cd backend
npx prisma generate

echo "Generating Prisma Client at root for api/ serverless functions..."
# Generate Prisma Client at root level pointing to backend schema
# This ensures api/ functions can import @prisma/client
cd ..
npx prisma generate --schema=./backend/prisma/schema.prisma

# Verify Prisma Client was generated
if [ -d "node_modules/@prisma/client" ]; then
  echo "✅ Prisma Client generated at root"
else
  echo "❌ Warning: Prisma Client not found at root after generation"
  # Fallback: copy from backend
  echo "Attempting to copy from backend..."
  mkdir -p node_modules/@prisma
  cp -r backend/node_modules/@prisma/client node_modules/@prisma/ 2>/dev/null || echo "Copy failed"
  mkdir -p node_modules/.prisma
  cp -r backend/node_modules/.prisma/client node_modules/.prisma/ 2>/dev/null || echo "Copy failed"
fi

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
  
  # Run migrations from backend directory where schema.prisma is located
  cd backend
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
  cd ..
else
  echo "DATABASE_URL not set, skipping database setup"
fi

echo "Building frontend..."
cd ../frontend
npm run build

echo "Build complete!"
