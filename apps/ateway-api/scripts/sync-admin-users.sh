#!/bin/bash

# Sync Admin Users from Supabase
# This script syncs users from Supabase to local database and assigns admin roles

set -e

echo "=== Sync Admin Users from Supabase ==="
echo ""

# Check if .dev.vars exists
if [ ! -f ".dev.vars" ]; then
    echo "❌ Error: .dev.vars file not found"
    echo ""
    echo "Please create .dev.vars with your configuration:"
    echo "  SUPABASE_URL=https://your-project.supabase.co"
    echo "  SUPABASE_JWT_SECRET=your-jwt-secret"
    echo "  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo "  ADMIN_EMAILS=your-email@example.com"
    exit 1
fi

# Source environment variables
export $(grep -v '^#' .dev.vars | xargs)

# Check required variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ -z "$ADMIN_EMAILS" ]; then
    echo "❌ Error: Missing required environment variables"
    echo "Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAILS"
    exit 1
fi

echo "✅ Configuration loaded"
echo "   Supabase URL: $SUPABASE_URL"
echo "   Admin Emails: $ADMIN_EMAILS"
echo ""

# Check if gateway is running
echo "🔍 Checking if gateway is running..."
if ! curl -s http://localhost:8787/health > /dev/null; then
    echo "❌ Error: Gateway is not running"
    echo ""
    echo "Please start the gateway first:"
    echo "  npm run dev"
    exit 1
fi

echo "✅ Gateway is running"
echo ""

echo "🔄 Syncing users from Supabase..."
echo ""

# Call sync endpoint with service role key (bypasses auth)
# The endpoint will use the service role key to fetch users from Supabase
RESPONSE=$(curl -s -X POST 'http://localhost:8787/api/admin/sync-users' \
  -H "Content-Type: application/json" \
  -H "X-Service-Role-Key: $SUPABASE_SERVICE_ROLE_KEY")

echo "$RESPONSE" | head -n 20

# Check if sync was successful
if echo "$RESPONSE" | grep -q "error"; then
    echo ""
    echo "❌ Sync failed"
    exit 1
fi

echo ""
echo "✅ Sync completed!"
echo ""
echo "Next steps:"
echo "1. Login to Supabase with your admin email:"
echo "   $ADMIN_EMAILS"
echo ""
echo "2. Get JWT token from Supabase"
echo ""
echo "3. Test admin access:"
echo "   curl -X GET 'http://localhost:8787/admin' \\"
echo "     -H 'Authorization: Bearer YOUR_JWT_TOKEN'"
echo ""
echo "=== Sync Complete ==="
