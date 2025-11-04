#!/bin/bash
# Script to fix DATABASE_URL in .env file for local development

ENV_FILE="backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: $ENV_FILE not found"
  exit 1
fi

# Backup original
cp "$ENV_FILE" "$ENV_FILE.backup"
echo "✅ Backed up .env to .env.backup"

# Update DATABASE_URL to use port 6543 (pooled connection) with pgbouncer=true
sed -i '' 's|@aws-1-us-east-1.pooler.supabase.com:5432/|@aws-1-us-east-1.pooler.supabase.com:6543/|g' "$ENV_FILE"
sed -i '' 's|sslmode=require"|sslmode=require\&pgbouncer=true"|g' "$ENV_FILE"
sed -i '' 's|postgres://|postgresql://|g' "$ENV_FILE"

echo "✅ Updated DATABASE_URL to use port 6543 (pooled connection)"
echo ""
echo "Changes made:"
echo "  - Changed port from 5432 → 6543"
echo "  - Added pgbouncer=true parameter"
echo "  - Changed postgres:// → postgresql://"
echo ""
echo "Testing connection..."
cd backend && DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2 | tr -d '"') npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function test() {
  try {
    await prisma.\$connect();
    console.log('✅ Database connection test successful!');
    const count = await prisma.user.count();
    console.log('Users in database:', count);
  } catch (error: any) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}
test();
" && echo "" && echo "✅ .env file is now configured correctly!" || echo "❌ Connection test failed - please check your Supabase connection string"

