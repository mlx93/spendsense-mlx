#!/bin/bash
set -e

echo "Generating Prisma Client at root..."
npx prisma generate --schema=backend/prisma/schema.prisma

echo "Generating Prisma Client in backend..."
cd backend
npx prisma generate

# Only run migrations and seed in production if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL is set, running migrations..."
  npx prisma migrate deploy
  
  echo "Checking if database needs seeding..."
  # Only seed if User table is empty (first deployment)
  USER_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tail -1 || echo "0")
  if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    echo "Database is empty, seeding..."
    npx prisma db seed || echo "Seed failed, continuing build"
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
