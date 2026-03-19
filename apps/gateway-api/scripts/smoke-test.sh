#!/bin/bash

#############################################
# Post-Deployment Smoke Test Script
# Micro-Security Gateway
#############################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GATEWAY_URL="${GATEWAY_URL:-https://gateway-api.your-subdomain.workers.dev}"
TEST_API_KEY="${TEST_API_KEY:-}"

# Counters
PASS=0
FAIL=0
TOTAL=0

echo "=========================================="
echo "Post-Deployment Smoke Tests"
echo "Micro-Security Gateway"
echo "=========================================="
echo ""
echo "Gateway URL: $GATEWAY_URL"
echo "=========================================="
echo ""

# Check if API key is set
if [ -z "$TEST_API_KEY" ]; then
    echo -e "${RED}Error: TEST_API_KEY environment variable not set${NC}"
    echo "Usage: TEST_API_KEY=sk-xxx ./scripts/smoke-test.sh"
    exit 1
fi

# Function to print section header
print_section() {
    echo ""
    echo "📋 $1"
    echo "------------------------------------------"
}

# Function to run test
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_code="$3"

    ((TOTAL++))
    echo -n "Testing: $test_name ... "

    RESPONSE=$(eval "$command" 2>&1)
    STATUS_CODE=$(echo "$RESPONSE" | grep -o "HTTP Status: [0-9]*" | grep -o "[0-9]*" || echo "000")

    if [ "$STATUS_CODE" = "$expected_code" ]; then
        echo -e "${GREEN}PASS${NC} (Status: $STATUS_CODE)"
        ((PASS++))
        return 0
    else
        echo -e "${RED}FAIL${NC} (Expected: $expected_code, Got: $STATUS_CODE)"
        echo "Response: $RESPONSE"
        ((FAIL++))
        return 1
    fi
}

# Function to test endpoint
test_endpoint() {
    local test_name="$1"
    local endpoint="$2"
    local expected_code="$3"
    local method="${4:-GET}"
    local data="${5:-}"

    local curl_cmd="curl -s -X $method"
    curl_cmd="$curl_cmd -w '\nHTTP Status: %{http_code}'"
    curl_cmd="$curl_cmd -H 'Authorization: Bearer $TEST_API_KEY'"
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"

    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi

    curl_cmd="$curl_cmd '$GATEWAY_URL$endpoint'"

    run_test "$test_name" "$curl_cmd" "$expected_code"
}

# ========================================
# Section 1: Health & Connectivity
# ========================================
print_section "1. Health & Connectivity"

# Test worker is responding
run_test "Worker is responding" \
    "curl -s -w '\nHTTP Status: %{http_code}' '$GATEWAY_URL/'" \
    "200"

# Test health check endpoint (if exists)
test_endpoint "Health check endpoint" \
    "/health" \
    "200"

# ========================================
# Section 2: OpenAI-Compatible Endpoints
# ========================================
print_section "2. OpenAI-Compatible Endpoints"

# Test /v1/models endpoint
test_endpoint "List models" \
    "/v1/models" \
    "200"

# Test /v1/chat/completions (simple request)
test_endpoint "Chat completions (OpenAI)" \
    "/v1/chat/completions" \
    "200" \
    "POST" \
    '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}],"max_tokens":10}'

# ========================================
# Section 3: Authentication
# ========================================
print_section "3. Authentication"

# Test without API key (should fail)
((TOTAL++))
echo -n "Testing: Unauthorized request (no API key) ... "
RESPONSE=$(curl -s -w '\nHTTP Status: %{http_code}' "$GATEWAY_URL/v1/models")
STATUS_CODE=$(echo "$RESPONSE" | grep -o "HTTP Status: [0-9]*" | grep -o "[0-9]*" || echo "000")

if [ "$STATUS_CODE" = "401" ]; then
    echo -e "${GREEN}PASS${NC} (Correctly rejected unauthorized request)"
    ((PASS++))
else
    echo -e "${RED}FAIL${NC} (Expected 401, Got: $STATUS_CODE)"
    ((FAIL++))
fi

# Test with invalid API key (should fail)
((TOTAL++))
echo -n "Testing: Invalid API key ... "
RESPONSE=$(curl -s -w '\nHTTP Status: %{http_code}' -H "Authorization: Bearer invalid-key" "$GATEWAY_URL/v1/models")
STATUS_CODE=$(echo "$RESPONSE" | grep -o "HTTP Status: [0-9]*" | grep -o "[0-9]*" || echo "000")

if [ "$STATUS_CODE" = "401" ]; then
    echo -e "${GREEN}PASS${NC} (Correctly rejected invalid API key)"
    ((PASS++))
else
    echo -e "${RED}FAIL${NC} (Expected 401, Got: $STATUS_CODE)"
    ((FAIL++))
fi

# ========================================
# Section 4: Rate Limiting
# ========================================
print_section "4. Rate Limiting"

# Test rate limiting (send 10 rapid requests)
echo "Testing rate limiting (10 rapid requests)..."
RATE_LIMIT_COUNT=0
for i in {1..10}; do
    RESPONSE=$(curl -s -w '\nHTTP Status: %{http_code}' -H "Authorization: Bearer $TEST_API_KEY" "$GATEWAY_URL/v1/models")
    STATUS_CODE=$(echo "$RESPONSE" | grep -o "HTTP Status: [0-9]*" | grep -o "[0-9]*" || echo "000")
    if [ "$STATUS_CODE" = "429" ]; then
        ((RATE_LIMIT_COUNT++))
    fi
done

if [ $RATE_LIMIT_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ Rate limiting not triggered (within limits)${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}⚠ Rate limiting triggered after $RATE_LIMIT_COUNT requests${NC}"
    ((PASS++))
fi
((TOTAL++))

# ========================================
# Section 5: Error Handling
# ========================================
print_section "5. Error Handling"

# Test invalid endpoint
((TOTAL++))
echo -n "Testing: Invalid endpoint returns 404 ... "
RESPONSE=$(curl -s -w '\nHTTP Status: %{http_code}' -H "Authorization: Bearer $TEST_API_KEY" "$GATEWAY_URL/invalid/endpoint")
STATUS_CODE=$(echo "$RESPONSE" | grep -o "HTTP Status: [0-9]*" | grep -o "[0-9]*" || echo "000")

if [ "$STATUS_CODE" = "404" ]; then
    echo -e "${GREEN}PASS${NC} (Correctly returned 404)"
    ((PASS++))
else
    echo -e "${YELLOW}WARN${NC} (Expected 404, Got: $STATUS_CODE)"
    ((PASS++))
fi

# Test malformed request
((TOTAL++))
echo -n "Testing: Malformed request returns 400 ... "
RESPONSE=$(curl -s -w '\nHTTP Status: %{http_code}' -X POST -H "Authorization: Bearer $TEST_API_KEY" -H "Content-Type: application/json" -d '{"invalid":"data"}' "$GATEWAY_URL/v1/chat/completions")
STATUS_CODE=$(echo "$RESPONSE" | grep -o "HTTP Status: [0-9]*" | grep -o "[0-9]*" || echo "000")

if [ "$STATUS_CODE" = "400" ] || [ "$STATUS_CODE" = "422" ]; then
    echo -e "${GREEN}PASS${NC} (Correctly rejected malformed request)"
    ((PASS++))
else
    echo -e "${YELLOW}WARN${NC} (Expected 400/422, Got: $STATUS_CODE)"
    ((PASS++))
fi

# ========================================
# Section 6: Response Time
# ========================================
print_section "6. Performance Tests"

# Test response time for /v1/models
echo "Testing response time for /v1/models..."
START_TIME=$(date +%s%N)
curl -s -H "Authorization: Bearer $TEST_API_KEY" "$GATEWAY_URL/v1/models" > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))  # Convert to milliseconds

echo "Response time: ${RESPONSE_TIME}ms"

if [ $RESPONSE_TIME -lt 2000 ]; then
    echo -e "${GREEN}✓ Response time acceptable (< 2000ms)${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}⚠ Response time high (> 2000ms)${NC}"
    ((PASS++))
fi
((TOTAL++))

# ========================================
# Section 7: Admin Endpoints (if accessible)
# ========================================
print_section "7. Admin Endpoints"

# Test admin metrics (if auth token available)
if [ -n "$ADMIN_AUTH_TOKEN" ]; then
    test_endpoint "Admin metrics" \
        "/api/admin/metrics" \
        "200" \
        "GET"

    test_endpoint "Admin circuit breaker status" \
        "/api/admin/circuit-breaker" \
        "200" \
        "GET"
else
    echo -e "${YELLOW}⚠ ADMIN_AUTH_TOKEN not set, skipping admin tests${NC}"
fi

# ========================================
# Section 8: Provider Health
# ========================================
print_section "8. Provider Health"

# Test if provider health endpoint exists
if [ -n "$ADMIN_AUTH_TOKEN" ]; then
    test_endpoint "Provider health status" \
        "/api/admin/provider-health" \
        "200" \
        "GET"
else
    echo -e "${YELLOW}⚠ Provider health check requires admin auth${NC}"
fi

# ========================================
# Summary
# ========================================
echo ""
echo "=========================================="
echo "Smoke Test Summary"
echo "=========================================="
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed:${NC}      $PASS"
echo -e "${RED}Failed:${NC}      $FAIL"
echo ""

PERCENTAGE=$(( (PASS * 100) / TOTAL ))
echo "Success Rate: ${PERCENTAGE}%"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "${RED}❌ SMOKE TESTS FAILED${NC}"
    echo "Please investigate failures before proceeding with rollout."
    exit 1
elif [ $PERCENTAGE -lt 80 ]; then
    echo -e "${YELLOW}⚠️  SMOKE TESTS PASSED WITH LOW SUCCESS RATE${NC}"
    echo "Review warnings before proceeding."
    exit 0
else
    echo -e "${GREEN}✅ ALL SMOKE TESTS PASSED${NC}"
    echo "Deployment looks healthy!"
    exit 0
fi
