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
  
  echo "Seeding database..."
  npx prisma db seed || echo "Seed failed, continuing build"
else
  echo "DATABASE_URL not set, skipping database setup"
fi

echo "Building frontend..."
cd ../frontend
npm run build

echo "Build complete!"
