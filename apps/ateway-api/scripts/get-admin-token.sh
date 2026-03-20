#!/bin/bash

# Get JWT Token from Supabase
# This script helps you get a JWT token for admin authentication

set -e

echo "=== Get JWT Token from Supabase ==="
echo ""

# Check if .dev.vars exists
if [ ! -f ".dev.vars" ]; then
    echo "❌ Error: .dev.vars file not found"
    echo ""
    echo "Please create .dev.vars with your configuration"
    exit 1
fi

# Source environment variables
export $(grep -v '^#' .dev.vars | xargs)

# Check required variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_JWT_SECRET" ]; then
    echo "❌ Error: SUPABASE_URL or SUPABASE_JWT_SECRET not set in .dev.vars"
    exit 1
fi

echo "✅ Configuration loaded"
echo "   Supabase URL: $SUPABASE_URL"
echo ""

# Prompt for credentials
echo "📝 Enter your Supabase credentials:"
read -p "Email: " EMAIL
read -sp "Password: " PASSWORD
echo ""

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
    echo "❌ Error: Email and password are required"
    exit 1
fi

# Extract project reference from SUPABASE_URL
# https://xxxxx.supabase.co -> xxxxx
PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

echo "🔐 Requesting JWT token..."
echo ""

# Request token from Supabase
RESPONSE=$(curl -s -X POST "https://$PROJECT_REF.supabase.co/auth/v1/token?grant_type=password" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASSWORD" \
  -H "Content-Type: application/x-www-form-urlencoded")

# Parse response
TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

if [ -z "$TOKEN" ]; then
    echo "❌ Error: Failed to get JWT token"
    echo ""
    echo "Response:"
    echo "$RESPONSE"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if email/password are correct"
    echo "2. Check if user exists in Supabase"
    echo "3. Check if SUPABASE_URL is correct"
    exit 1
fi

echo "✅ Success! JWT Token obtained"
echo ""
echo "Your JWT Token:"
echo "$TOKEN"
echo ""

# Save to file
echo "💾 Saving token to .admin-token ..."
echo "$TOKEN" > .admin-token
echo "✅ Saved to .admin-token"
echo ""

# Show user info
USER_EMAIL=$(echo "$RESPONSE" | grep -o '"email":"[^"]*' | sed 's/"email":"//')
echo "User Email: $USER_EMAIL"
echo ""

# Check if user email is in ADMIN_EMAILS
if [[ ",$ADMIN_EMAILS," == *",$USER_EMAIL,"* ]]; then
    echo "✅ User email is in ADMIN_EMAILS - you have admin access"
else
    echo "⚠️  Warning: User email is NOT in ADMIN_EMAILS"
    echo "   Current ADMIN_EMAILS: $ADMIN_EMAILS"
    echo ""
    echo "To grant admin access, add your email to ADMIN_EMAILS in .dev.vars"
fi

echo ""
echo "=== Token Ready ==="
echo ""
echo "You can now test the admin dashboard:"
echo "  ./scripts/test-admin-dashboard.sh"
echo ""
echo "Or use curl directly:"
echo "  curl -X GET 'http://localhost:8787/admin' \\"
echo "    -H 'Authorization: Bearer $TOKEN'"
