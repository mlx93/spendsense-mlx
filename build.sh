#!/bin/bash
set -e

echo "Generating Prisma Client at root..."
npx prisma generate --schema=backend/prisma/schema.prisma

echo "Generating Prisma Client in backend..."
cd backend

# Set DATABASE_URL to a persistent location for build
export DATABASE_URL="file:./prisma/backend/spendsense.db"
mkdir -p ./prisma/backend

npx prisma generate

echo "Creating database schema..."
npx prisma db push --accept-data-loss

echo "Seeding database..."
npx prisma db seed || echo "Seed failed, continuing build"

echo "Database created at: ./prisma/backend/spendsense.db"
ls -lh ./prisma/backend/spendsense.db || echo "Database file not found!"

echo "Building frontend..."
cd ../frontend
npm run build

echo "Build complete!"
