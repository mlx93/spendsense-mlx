#!/bin/bash
set -e

echo "Generating Prisma Client at root..."
npx prisma generate --schema=backend/prisma/schema.prisma

echo "Generating Prisma Client in backend..."
cd backend
npx prisma generate

echo "Creating database schema..."
npx prisma db push --accept-data-loss

echo "Seeding database..."
npx prisma db seed || echo "Seed failed, continuing build"

echo "Building frontend..."
cd ../frontend
npm run build

echo "Build complete!"
