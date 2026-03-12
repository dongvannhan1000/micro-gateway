#!/bin/bash

# Performance Testing Script for Micro-Security Gateway
# Tests baseline performance without requiring API keys

GATEWAY_URL="https://gateway-api.nhandong0205.workers.dev"
RESULTS_FILE="performance-results-$(date +%Y%m%d-%H%M%S).txt"

echo "=========================================="
echo "Gateway Performance Testing"
echo "URL: $GATEWAY_URL"
echo "Started: $(date)"
echo "=========================================="
echo ""

# Function to calculate statistics
calc_stats() {
    awk '
    BEGIN {
        sum = 0; count = 0; min = 999999; max = 0
    }
    {
        gsub(/[^0-9.]/, "", $1)
        if ($1 > 0) {
            sum += $1
            count++
            if ($1 < min) min = $1
            if ($1 > max) max = $1
        }
    }
    END {
        if (count > 0) {
            avg = sum / count
            printf "Count: %d\n", count
            printf "Average: %.3f ms\n", avg * 1000
            printf "Min: %.3f ms\n", min * 1000
            printf "Max: %.3f ms\n", max * 1000
        }
    }
    '
}

# Task 1: Baseline Performance Measurement
echo "=== TASK 1: BASELINE PERFORMANCE ==="
echo ""

# 1.1 Health Check (should be fastest)
echo "1.1 Health Check Performance (10 samples)"
echo "Endpoint: GET /health"
echo "---"
for i in {1..10}; do
    curl -w "Response Time: %{time_total}s\n" -o /dev/null -s "$GATEWAY_URL/health"
done | tee -a health_times.txt
echo ""

# Calculate health check stats
echo "Health Check Statistics:"
grep "Response Time" health_times.txt | awk '{print $3}' | calc_stats
echo ""

# 1.2 Cold Start Test
echo "1.2 Cold Start Test (after 30s idle)"
echo "Waiting 30 seconds..."
sleep 30
echo "Testing /health cold start..."
curl -w "Cold Start Time: %{time_total}s\n" -o /dev/null -s "$GATEWAY_URL/health"
echo ""

# 1.3 Root Endpoint
echo "1.3 Root Endpoint Performance (10 samples)"
echo "Endpoint: GET /"
echo "---"
for i in {1..10}; do
    curl -w "Response Time: %{time_total}s\n" -o /dev/null -s "$GATEWAY_URL/"
done | tee -a root_times.txt
echo ""

echo "Root Endpoint Statistics:"
grep "Response Time" root_times.txt | awk '{print $3}' | calc_stats
echo ""

# 1.4 Models Endpoint (requires auth, should fail quickly)
echo "1.4 Models Endpoint Performance (Testing auth rejection speed)"
echo "Endpoint: GET /v1/models (without auth)"
echo "---"
for i in {1..10}; do
    curl -w "Response Time: %{time_total}s\n" -o /dev/null -s "$GATEWAY_URL/v1/models"
done | tee -a models_times.txt
echo ""

echo "Models Endpoint Statistics (Auth Failure):"
grep "Response Time" models_times.txt | awk '{print $3}' | calc_stats
echo ""

# Task 2: Warm Request Performance
echo "=== TASK 2: WARM REQUEST PERFORMANCE ==="
echo "Testing 50 consecutive requests to /health"
echo "---"

for i in {1..50}; do
    curl -w "%{time_total}\n" -o /dev/null -s "$GATEWAY_URL/health"
done | tee warm_50_times.txt > /dev/null

echo "Warm Request Statistics (50 samples):"
cat warm_50_times.txt | calc_stats
echo ""

# Calculate percentiles manually
echo "Percentiles:"
P95=$(cat warm_50_times.txt | sort -n | awk 'BEGIN{count=0} {nums[count++]=$1} END {print nums[int(count*0.95)] * 1000}')
P99=$(cat warm_50_times.txt | sort -n | awk 'BEGIN{count=0} {nums[count++]=$1} END {print nums[int(count*0.99)] * 1000}')
echo "P95: ${P95} ms"
echo "P99: ${P99} ms"
echo ""

# Task 3: Latency Breakdown Analysis
echo "=== TASK 3: LATENCY BREAKDOWN ==="
echo "Detailed timing analysis (10 samples)"
echo "Format: Total | Connect | SSL | StartTransfer | DNS"
echo "---"

for i in {1..10}; do
    curl -w "Total: %{time_total}s | Connect: %{time_connect}s | SSL: %{time_appconnect}s | Start: %{time_starttransfer}s\n" \
          -o /dev/null -s "$GATEWAY_URL/health"
done
echo ""

# Task 4: Concurrent Load Testing
echo "=== TASK 4: CONCURRENT LOAD TESTING ==="
echo "Testing 10 concurrent requests"
echo "Start Time: $(date)"
echo "---"

# Function to run single request
test_request() {
    local id=$1
    local start=$(date +%s%N)
    curl -s "$GATEWAY_URL/health" > /dev/null
    local end=$(date +%s%N)
    local duration=$((end - start))
    echo "Request $id: ${duration}ms"
}

# Run 10 requests in background
for i in {1..10}; do
    test_request $i &
done

# Wait for all to complete
wait

echo "End Time: $(date)"
echo ""

# Task 5: Sustained Load Testing
echo "=== TASK 5: SUSTAINED LOAD TESTING ==="
echo "Testing 100 requests over 10 seconds (~10 req/s)"
echo "---"

for i in {1..100}; do
    curl -w "%{time_total}\n" -o /dev/null -s "$GATEWAY_URL/health"
    sleep 0.1
done | tee sustained_load.txt > /dev/null

echo "Sustained Load Statistics (100 samples):"
cat sustained_load.txt | calc_stats
echo ""

# Summary
echo "=========================================="
echo "PERFORMANCE TEST SUMMARY"
echo "=========================================="
echo ""
echo "Health Check Performance:"
echo "  Average: $(grep "Response Time" health_times.txt | awk '{print $3}' | calc_stats | grep "Average" | awk '{print $2}')"
echo ""
echo "Root Endpoint Performance:"
echo "  Average: $(grep "Response Time" root_times.txt | awk '{print $3}' | calc_stats | grep "Average" | awk '{print $2}')"
echo ""
echo "Warm Request Performance (50 samples):"
echo "  Average: $(cat warm_50_times.txt | calc_stats | grep "Average" | awk '{print $2}')"
echo "  P95: ${P95} ms"
echo "  P99: ${P99} ms"
echo ""
echo "Sustained Load Performance (100 samples):"
echo "  Average: $(cat sustained_load.txt | calc_stats | grep "Average" | awk '{print $2}')"
echo ""
echo "=========================================="
echo "Test Completed: $(date)"
echo "=========================================="

# Cleanup
rm -f health_times.txt root_times.txt models_times.txt warm_50_times.txt sustained_load.txt
