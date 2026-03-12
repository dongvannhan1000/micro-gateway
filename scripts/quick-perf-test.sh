#!/bin/bash

# Quick Performance Testing Script for Micro-Security Gateway
# Fast version without long waits

GATEWAY_URL="https://gateway-api.nhandong0205.workers.dev"

echo "=========================================="
echo "Quick Gateway Performance Test"
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
        gsub(/[^0-9.]/, "", $0)
        if ($0 > 0) {
            sum += $0
            count++
            if ($0 < min) min = $0
            if ($0 > max) max = $0
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

echo "=== 1. HEALTH CHECK PERFORMANCE (20 samples) ==="
for i in {1..20}; do
    curl -w "%{time_total}\n" -o /dev/null -s "$GATEWAY_URL/health"
done | tee health_times.txt > /dev/null

echo "Statistics:"
cat health_times.txt | calc_stats

# Calculate percentiles
P95=$(cat health_times.txt | sort -n | awk 'BEGIN{count=0} {nums[count++]=$1} END {print nums[int(count*0.95)] * 1000}')
P99=$(cat health_times.txt | sort -n | awk 'BEGIN{count=0} {nums[count++]=$1} END {print nums[int(count*0.99)] * 1000}')
echo "P95: ${P95} ms"
echo "P99: ${P99} ms"
echo ""

echo "=== 2. ROOT ENDPOINT PERFORMANCE (20 samples) ==="
for i in {1..20}; do
    curl -w "%{time_total}\n" -o /dev/null -s "$GATEWAY_URL/"
done | tee root_times.txt > /dev/null

echo "Statistics:"
cat root_times.txt | calc_stats

P95=$(cat root_times.txt | sort -n | awk 'BEGIN{count=0} {nums[count++]=$1} END {print nums[int(count*0.95)] * 1000}')
P99=$(cat root_times.txt | sort -n | awk 'BEGIN{count=0} {nums[count++]=$1} END {print nums[int(count*0.99)] * 1000}')
echo "P95: ${P95} ms"
echo "P99: ${P99} ms"
echo ""

echo "=== 3. AUTH FAILURE PERFORMANCE (20 samples) ==="
for i in {1..20}; do
    curl -w "%{time_total}\n" -o /dev/null -s "$GATEWAY_URL/v1/models"
done | tee auth_times.txt > /dev/null

echo "Statistics:"
cat auth_times.txt | calc_stats
echo ""

echo "=== 4. LATENCY BREAKDOWN (5 samples) ==="
for i in {1..5}; do
    curl -w "Total: %{time_total}s | Connect: %{time_connect}s | SSL: %{time_appconnect}s | Start: %{time_starttransfer}s\n" \
          -o /dev/null -s "$GATEWAY_URL/health"
done
echo ""

echo "=== 5. CONCURRENT REQUESTS (20 concurrent) ==="
start_time=$(date +%s)

for i in {1..20}; do
    (curl -w "Request $i: %{time_total}s\n" -o /dev/null -s "$GATEWAY_URL/health") &
done

wait
end_time=$(date +%s)
echo "Total time for 20 concurrent requests: $((end_time - start_time))s"
echo ""

echo "=== 6. SUSTAINED LOAD (50 requests, 5 per second) ==="
for i in {1..50}; do
    curl -w "%{time_total}\n" -o /dev/null -s "$GATEWAY_URL/health"
    sleep 0.2
done | tee sustained_times.txt > /dev/null

echo "Statistics:"
cat sustained_times.txt | calc_stats

P95=$(cat sustained_times.txt | sort -n | awk 'BEGIN{count=0} {nums[count++]=$1} END {print nums[int(count*0.95)] * 1000}')
P99=$(cat sustained_times.txt | sort -n | awk 'BEGIN{count=0} {nums[count++]=$1} END {print nums[int(count*0.99)] * 1000}')
echo "P95: ${P95} ms"
echo "P99: ${P99} ms"
echo ""

echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""
echo "Health Check:"
echo "  Average: $(cat health_times.txt | calc_stats | grep "Average" | awk '{print $2}')"
echo "  P95: ${P95} ms (should be < 100ms per requirement)"
echo "  P99: ${P99} ms"
echo ""
echo "Root Endpoint:"
echo "  Average: $(cat root_times.txt | calc_stats | grep "Average" | awk '{print $2}')"
echo ""
echo "Sustained Load (50 requests):"
echo "  Average: $(cat sustained_times.txt | calc_stats | grep "Average" | awk '{print $2}')"
echo ""
echo "Test Completed: $(date)"
echo ""

# Cleanup
rm -f health_times.txt root_times.txt auth_times.txt sustained_times.txt
