#!/bin/bash

#############################################
# Pre-Deployment Validation Script
# Micro-Security Gateway
#############################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
GATEWAY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="$(cd "$GATEWAY_DIR/../.." && pwd)"

# Counters
PASS=0
FAIL=0
WARN=0

echo "=========================================="
echo "Pre-Deployment Validation"
echo "Micro-Security Gateway"
echo "=========================================="
echo ""

# Function to print section header
print_section() {
    echo ""
    echo "📋 $1"
    echo "------------------------------------------"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

# Function to print failure
print_failure() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN++))
}

# Change to gateway directory
cd "$GATEWAY_DIR"

# ========================================
# Section 1: Code Quality & Testing
# ========================================
print_section "1. Code Quality & Testing"

# Check if tests pass
echo "Running unit tests..."
if npm run test > /dev/null 2>&1; then
    print_success "Unit tests pass"
else
    print_failure "Unit tests failed"
fi

# Check test coverage
echo "Checking test coverage..."
if npm run test:coverage > /dev/null 2>&1; then
    print_success "Test coverage generated"
else
    print_warning "Could not generate test coverage"
fi

# Security audit
echo "Running security audit..."
if npm audit --audit-level high > /dev/null 2>&1; then
    print_success "No critical security vulnerabilities"
else
    print_failure "Critical security vulnerabilities found"
fi

# TypeScript compilation check
echo "Checking TypeScript compilation..."
if npx tsc --noEmit > /dev/null 2>&1; then
    print_success "TypeScript compilation successful"
else
    print_failure "TypeScript compilation failed"
fi

# ========================================
# Section 2: Database & Migrations
# ========================================
print_section "2. Database & Migrations"

cd "$PROJECT_ROOT/packages/db"

# Check migration dry-run
echo "Checking database migrations..."
if npm run migrate:remote -- --dry-run > /dev/null 2>&1; then
    print_success "Database migration dry-run successful"
else
    print_failure "Database migration dry-run failed"
fi

# List migrations
echo "Verifying migration files..."
if [ -d "migrations" ] && [ -n "$(ls -A migrations/*.sql 2>/dev/null)" ]; then
    MIGRATION_COUNT=$(ls -1 migrations/*.sql 2>/dev/null | wc -l)
    print_success "Found $MIGRATION_COUNT migration files"
else
    print_failure "No migration files found"
fi

cd "$GATEWAY_DIR"

# ========================================
# Section 3: Configuration & Environment
# ========================================
print_section "3. Configuration & Environment"

# Check wrangler.toml exists
echo "Checking wrangler configuration..."
if [ -f "wrangler.toml" ]; then
    print_success "wrangler.toml exists"

    # Verify key configuration values
    if grep -q "ENVIRONMENT = \"production\"" wrangler.toml; then
        print_success "Environment set to production"
    else
        print_warning "Environment not set to production in wrangler.toml"
    fi

    if grep -q "enabled = true" wrangler.toml; then
        print_success "Observability enabled"
    else
        print_warning "Observability not enabled"
    fi
else
    print_failure "wrangler.toml not found"
fi

# Check if wrangler is installed
echo "Checking Wrangler CLI..."
if command -v wrangler &> /dev/null; then
    print_success "Wrangler CLI installed"
else
    print_failure "Wrangler CLI not installed"
fi

# Check for secrets (warning only)
echo "Checking for hardcoded secrets..."
if grep -r "sk-" src/ 2>/dev/null | grep -v "node_modules" | grep -v ".test.ts"; then
    print_warning "Potential hardcoded API keys found"
else
    print_success "No hardcoded secrets detected"
fi

# ========================================
# Section 4: Worker Size & Performance
# ========================================
print_section "4. Worker Size & Performance"

# Check worker bundle size
echo "Checking worker bundle size..."
if [ -f "src/index.ts" ]; then
    # Estimate size by counting lines (rough estimate)
    LINE_COUNT=$(find src -name "*.ts" -not -name "*.test.ts" -exec cat {} \; | wc -l)
    print_success "Source code: ~$LINE_COUNT lines"

    if [ $LINE_COUNT -lt 10000 ]; then
        print_success "Code size within reasonable limits"
    else
        print_warning "Code size is large, consider optimization"
    fi
else
    print_failure "src/index.ts not found"
fi

# Check for dependencies that might increase bundle size
echo "Checking dependencies..."
DEP_COUNT=$(cat package.json | jq '.dependencies | length')
print_success "Production dependencies: $DEP_COUNT"

if [ $DEP_COUNT -gt 20 ]; then
    print_warning "High number of dependencies, consider reducing"
fi

# ========================================
# Section 5: Git Status
# ========================================
print_section "5. Git Status"

cd "$PROJECT_ROOT"

# Check if working directory is clean
echo "Checking git status..."
if [ -z "$(git status --porcelain)" ]; then
    print_success "Working directory clean"
else
    print_warning "Uncommitted changes detected"
    git status --short
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "dev" ]; then
    print_success "On main or dev branch"
else
    print_warning "Not on main or dev branch"
fi

# ========================================
# Section 6: Documentation
# ========================================
print_section "6. Documentation"

# Check for deployment documentation
echo "Checking deployment documentation..."
if [ -f "docs/production-rollout-plan.md" ]; then
    print_success "Production rollout plan exists"
else
    print_warning "Production rollout plan not found"
fi

if [ -f "docs/pre-production-checklist.md" ]; then
    print_success "Pre-production checklist exists"
else
    print_warning "Pre-production checklist not found"
fi

if [ -f "docs/production-runbook.md" ]; then
    print_success "Production runbook exists"
else
    print_warning "Production runbook not found"
fi

# ========================================
# Section 7: Deployment Scripts
# ========================================
print_section "7. Deployment Scripts"

# Check for deployment scripts
echo "Checking deployment scripts..."
if [ -f "scripts/pre-deploy-check.sh" ]; then
    print_success "Pre-deploy check script exists"
else
    print_warning "Pre-deploy check script not found"
fi

if [ -f "scripts/smoke-test.sh" ]; then
    print_success "Smoke test script exists"
else
    print_warning "Smoke test script not found"
fi

# Make scripts executable
chmod +x scripts/*.sh 2>/dev/null
print_success "Scripts marked as executable"

# ========================================
# Summary
# ========================================
echo ""
echo "=========================================="
echo "Validation Summary"
echo "=========================================="
echo -e "${GREEN}Passed:${NC}   $PASS"
echo -e "${YELLOW}Warnings:${NC} $WARN"
echo -e "${RED}Failed:${NC}   $FAIL"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo "Please fix the failures before deploying."
    exit 1
elif [ $WARN -gt 0 ]; then
    echo -e "${YELLOW}⚠️  VALIDATION PASSED WITH WARNINGS${NC}"
    echo "Review warnings before proceeding."
    exit 0
else
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo "Ready to deploy!"
    exit 0
fi
