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
# Note: Since dev and prod share the same Supabase database, migrations are already applied
# Migrations should only be run manually when schema changes, not during every build
if [ -n "$DATABASE_URL" ]; then
  # Skip migrations during build since database is shared with dev
  # Migrations are already applied and will be run manually when schema changes
  echo "Skipping migrations during build (dev and prod share same database)"
  echo "Migrations are already applied. Run manually with 'npx prisma migrate deploy' when schema changes."
  
  # Only run migrations if explicitly requested via environment variable
  if [ "$RUN_MIGRATIONS_IN_BUILD" = "true" ]; then
    echo "RUN_MIGRATIONS_IN_BUILD=true, attempting migrations..."
    
    # Use non-pooling connection for migrations (pooler doesn't support DDL)
    # If we have the non-pooling URL, use it for migrations
    # Otherwise fall back to pooled connection (may not work for migrations but we'll try)
    if [ -n "$SUPABASE_POSTGRES_URL_NON_POOLING" ]; then
      echo "Using direct (non-pooling) connection for migrations..."
      export MIGRATION_DATABASE_URL="$SUPABASE_POSTGRES_URL_NON_POOLING"
    else
      echo "⚠️  SUPABASE_POSTGRES_URL_NON_POOLING not set, using pooled connection (migrations may fail)"
      export MIGRATION_DATABASE_URL="$DATABASE_URL"
    fi
    
    # Run migrations from backend directory where schema.prisma is located
    cd backend
    
    # Try migrations - if they fail, log warning but continue build
    # Migrations might already be applied or connection might not support DDL
    # Temporarily disable set -e for this command to allow graceful failure
    set +e
    DATABASE_URL="$MIGRATION_DATABASE_URL" npx prisma migrate deploy 2>&1
    MIGRATE_EXIT_CODE=$?
    set -e
    
    if [ "$MIGRATE_EXIT_CODE" -eq 0 ]; then
      echo "✅ Migrations completed successfully"
    else
      echo "⚠️  Migration failed (exit code: $MIGRATE_EXIT_CODE)"
      echo "This may be expected if:"
      echo "  - Migrations are already applied"
      echo "  - Using pooled connection (doesn't support DDL)"
      echo "  - Database connection temporarily unavailable"
      echo "Continuing build - migrations can be run manually if needed"
    fi
    cd ..
  fi
  
  echo "Checking if database needs seeding..."
  # Only seed if User table is empty (first deployment)
  # Use check-users.js script (runs from backend directory where Prisma Client exists)
  # Try with pooled connection first (more reliable in Vercel build environment)
  cd backend
  USER_COUNT=$(DATABASE_URL="$DATABASE_URL" SIMPLE_OUTPUT=1 node check-users.js 2>/dev/null | head -1 || echo "0")
  
  # If pooled connection failed, try non-pooling as fallback
  if [ "$USER_COUNT" = "0" ] && [ -n "$SUPABASE_POSTGRES_URL_NON_POOLING" ]; then
    USER_COUNT=$(DATABASE_URL="$SUPABASE_POSTGRES_URL_NON_POOLING" SIMPLE_OUTPUT=1 node check-users.js 2>/dev/null | head -1 || echo "0")
  fi
  
  if [ "$USER_COUNT" = "0" ]; then
    echo "Database appears empty, attempting to seed..."
    # Try seeding with pooled connection first (more reliable in Vercel build environment)
    set +e
    DATABASE_URL="$DATABASE_URL" npx prisma db seed 2>&1
    SEED_EXIT_CODE=$?
    set -e
    
    if [ "$SEED_EXIT_CODE" -eq 0 ]; then
      echo "✅ Seeding completed successfully with pooled connection"
    elif [ -n "$SUPABASE_POSTGRES_URL_NON_POOLING" ]; then
      echo "⚠️  Seed failed with pooled connection, trying non-pooling..."
      # Fall back to non-pooling connection
      set +e
      DATABASE_URL="$SUPABASE_POSTGRES_URL_NON_POOLING" npx prisma db seed 2>&1
      SEED_EXIT_CODE=$?
      set -e
      if [ "$SEED_EXIT_CODE" -eq 0 ]; then
        echo "✅ Seeding completed successfully with non-pooling connection"
      else
        echo "⚠️  Seed failed, continuing build (database may already be seeded or connection unavailable)"
      fi
    else
      echo "⚠️  Seed failed, continuing build (database may already be seeded or connection unavailable)"
    fi
  else
    echo "Database already has data (found $USER_COUNT rows in User table), skipping seed"
  fi
  cd ..
else
  echo "DATABASE_URL not set, skipping database setup"
fi

echo "Building frontend..."
cd frontend
npm run build
cd ..

echo "Build complete!"
