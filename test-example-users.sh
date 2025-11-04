#!/bin/bash
# Script to test example-users endpoint in production

# Get production URL from Vercel or use default
PROD_URL="${1:-https://spendsense-mlx.vercel.app}"

echo "Testing example-users endpoint on: $PROD_URL"
echo "=========================================="
echo ""

# Test the endpoint
curl -s "$PROD_URL/api/auth/example-users" | jq '.' 2>/dev/null || curl -s "$PROD_URL/api/auth/example-users"

echo ""
echo ""
echo "If you see an empty array or errors, check:"
echo "1. Vercel logs for backend errors"
echo "2. Browser console for CORS/network errors"
echo "3. Database connection in Vercel environment variables"

