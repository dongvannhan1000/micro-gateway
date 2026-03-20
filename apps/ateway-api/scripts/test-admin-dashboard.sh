#!/bin/bash

# Test Admin Dashboard Locally
# This script helps you test the admin dashboard in local development

set -e

echo "=== Admin Dashboard Local Test ==="
echo ""

# Check if .dev.vars exists
if [ ! -f ".dev.vars" ]; then
    echo "❌ Error: .dev.vars file not found"
    echo ""
    echo "Please create .dev.vars with your configuration:"
    echo "  ADMIN_EMAILS=your-email@example.com"
    echo "  SUPABASE_JWT_SECRET=your-jwt-secret"
    echo "  SUPABASE_URL=your-supabase-url"
    echo "  ENCRYPTION_SECRET=your-encryption-secret"
    echo "  RESEND_API_KEY=your-resend-key"
    exit 1
fi

# Source environment variables
export $(grep -v '^#' .dev.vars | xargs)

# Check if ADMIN_EMAILS is set
if [ -z "$ADMIN_EMAILS" ]; then
    echo "❌ Error: ADMIN_EMAILS not set in .dev.vars"
    exit 1
fi

echo "✅ Configuration loaded"
echo "   Admin Email: $ADMIN_EMAILS"
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

echo "✅ Gateway is running at http://localhost:8787"
echo ""

# Prompt for JWT token
echo "📝 Please enter your JWT token:"
echo "   (Get it from Supabase Dashboard or use the login script below)"
echo ""
read -p "JWT Token: " TOKEN

if [ -z "$TOKEN" ]; then
    echo "❌ Error: JWT token is required"
    exit 1
fi

echo ""
echo "🚀 Testing admin dashboard..."
echo ""

# Test admin dashboard endpoint
echo "Fetching admin dashboard..."
RESPONSE=$(curl -s -X GET 'http://localhost:8787/admin' \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Success! Admin dashboard loaded"
    echo ""
    echo "💾 Saving to admin-dashboard.html..."
    echo "$BODY" > admin-dashboard.html
    echo "✅ Saved to admin-dashboard.html"
    echo ""
    echo "🌐 Opening in browser..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open admin-dashboard.html
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open admin-dashboard.html
    else
        start admin-dashboard.html
    fi
    echo ""
    echo "✅ Done! You should see the admin dashboard in your browser."
else
    echo "❌ Error: HTTP $HTTP_CODE"
    echo ""
    echo "Response:"
    echo "$BODY" | head -n 20
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if your email is in ADMIN_EMAILS (.dev.vars)"
    echo "2. Check if JWT token is valid (not expired)"
    echo "3. Check if user email matches admin email"
    exit 1
fi

echo ""
echo "=== Test Complete ==="
