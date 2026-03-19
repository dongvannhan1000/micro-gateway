import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for tracking resilience patterns
const errorRate = new Rate('errors');
const circuitBreakerTrips = new Counter('circuit_breaker_trips');
const timeoutCount = new Counter('timeouts');
const rateLimitHits = new Counter('rate_limit_hits');
const retryAttempts = new Counter('retry_attempts');

// Response time trends
const responseTimeTrend = new Trend('response_time');
const proxyLatency = new Trend('proxy_latency');

// Test configuration
export const options = {
    // Define stages for load testing
    stages: [
        { duration: '30s', target: 10 },   // Warm up: 10 VUs for 30s
        { duration: '2m', target: 50 },    // Normal load: 50 VUs for 2m
        { duration: '1m', target: 200 },   // Spike test: ramp to 200 VUs
        { duration: '2m', target: 50 },    // Cool down: back to 50 VUs
        { duration: '1m', target: 0 },     // Ramp down
    ],

    // Thresholds for pass/fail criteria
    thresholds: {
        // 95% of requests must complete below 2s
        http_req_duration: ['p(95)<2000', 'p(99)<5000'],

        // Error rate must be below 5%
        http_req_failed: ['rate<0.05'],

        // Custom error rate metric
        errors: ['rate<0.05'],

        // Circuit breaker should not trip frequently
        circuit_breaker_trips: ['count<10'],
    },

    // Ramp-up/down settings
    gracefulRampDown: '10s',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8787';
const API_KEY = __ENV.API_KEY || 'test-gateway-key';

// Test data - different scenarios
const testScenarios = [
    {
        name: 'simple_completion',
        model: 'gpt-4',
        messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Say "Hello, world!"' },
        ],
        max_tokens: 10,
    },
    {
        name: 'medium_completion',
        model: 'gpt-4',
        messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Explain quantum computing in one paragraph.' },
        ],
        max_tokens: 100,
    },
    {
        name: 'long_completion',
        model: 'gpt-4',
        messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Write a short story about a robot learning to love.' },
        ],
        max_tokens: 500,
    },
];

export default function () {
    // Select a random test scenario
    const scenario = testScenarios[Math.floor(Math.random() * testScenarios.length)];

    // Prepare request payload
    const payload = JSON.stringify({
        model: scenario.model,
        messages: scenario.messages,
        max_tokens: scenario.max_tokens,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'User-Agent': 'k6-load-test',
        },
        tags: {
            scenario: scenario.name,
            model: scenario.model,
        },
    };

    // Record start time
    const startTime = Date.now();

    // Make the request
    const response = http.post(`${BASE_URL}/v1/chat/completions`, payload, params);

    // Calculate proxy latency (if available)
    const proxyLatencyMs = response.headers['X-MS-Latency-MS'];
    if (proxyLatencyMs) {
        proxyLatency.add(parseFloat(proxyLatencyMs));
    }

    // Record response time
    const responseTime = Date.now() - startTime;
    responseTimeTrend.add(responseTime);

    // Validate response
    const success = check(response, {
        'status is 200': (r) => r.status === 200,
        'has response ID': (r) => {
            try {
                const body = r.json();
                return body.id !== undefined;
            } catch {
                return false;
            }
        },
        'has choices array': (r) => {
            try {
                const body = r.json();
                return Array.isArray(body.choices);
            } catch {
                return false;
            }
        },
        'not circuit broken': (r) => r.status !== 503,
        'not timed out': (r) => r.status !== 408,
        'not rate limited': (r) => r.status !== 429,
        'not server error': (r) => r.status < 500,
    });

    // Track custom metrics
    errorRate.add(!success);

    if (response.status === 503) {
        circuitBreakerTrips.add(1);
        console.warn('Circuit breaker detected', {
            scenario: scenario.name,
            vu: __VU,
            iter: __ITER,
        });
    }

    if (response.status === 408) {
        timeoutCount.add(1);
        console.warn('Request timeout detected', {
            scenario: scenario.name,
            vu: __VU,
            iter: __ITER,
        });
    }

    if (response.status === 429) {
        rateLimitHits.add(1);
        console.warn('Rate limit hit', {
            scenario: scenario.name,
            vu: __VU,
            iter: __ITER,
        });
    }

    // Check for retry headers (if gateway exposes retry count)
    const retryCount = response.headers['X-Retry-Count'];
    if (retryCount) {
        retryAttempts.add(parseInt(retryCount) || 0);
    }

    // Sleep for a random duration between requests (1-3 seconds)
    // This simulates realistic user behavior
    sleep(Math.random() * 2 + 1);
}

// Setup function - runs once before the test
export function setup() {
    console.log('=== Load Test Starting ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Test Stages: ${JSON.stringify(options.stages)}`);
    console.log('========================');

    // Optionally, verify the service is healthy
    const healthResponse = http.get(`${BASE_URL}/health`);
    if (healthResponse.status !== 200) {
        console.error('Health check failed!');
    } else {
        console.log('Health check passed');
    }

    return { startTime: Date.now() };
}

// Teardown function - runs once after the test
export function teardown(data) {
    const duration = Date.now() - data.startTime;
    console.log('=== Load Test Complete ===');
    console.log(`Total Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log('=========================');
}
