import { Hono } from 'hono';
import { adminAuth } from '../middleware/admin-auth';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /admin
 *
 * Admin Dashboard HTML UI
 * Displays business metrics, provider health, and observability integration status.
 *
 * Protected by admin authentication - requires valid JWT with admin email.
 */
app.get('/admin', adminAuth, async (c) => {
    // Get JWT token from Authorization header for API calls
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Micro-Security Gateway Admin</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg-primary: #0a0e1a;
            --bg-secondary: #151a2d;
            --bg-tertiary: #1e2740;
            --text-primary: #e8eaed;
            --text-secondary: #9aa0a6;
            --accent-blue: #4fc3f7;
            --accent-green: #4ade80;
            --accent-red: #f87171;
            --accent-yellow: #fbbf24;
            --glass-bg: rgba(30, 39, 64, 0.6);
            --glass-border: rgba(79, 195, 247, 0.2);
            --shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.5);
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, var(--bg-primary) 0%, #0f1419 100%);
            color: var(--text-primary);
            min-height: 100vh;
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }

        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .header h1 {
            font-size: 1.75rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--accent-blue), #64b5f6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .refresh-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        .refresh-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--accent-green);
            animation: pulse 2s ease-in-out infinite;
        }

        .refresh-indicator.loading {
            background: var(--accent-yellow);
            animation: blink 1s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        /* Glassmorphism Card */
        .card {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: var(--shadow-lg);
            margin-bottom: 1.5rem;
        }

        /* Trace Integration Notice */
        .trace-notice {
            display: none;
            background: linear-gradient(135deg, rgba(79, 195, 247, 0.1), rgba(79, 195, 247, 0.05));
            border: 1px solid rgba(79, 195, 247, 0.3);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .trace-notice.visible {
            display: flex;
        }

        .trace-notice-icon {
            font-size: 1.5rem;
        }

        .trace-notice-content {
            flex: 1;
            min-width: 200px;
        }

        .trace-notice-title {
            font-weight: 600;
            color: var(--accent-blue);
            margin-bottom: 0.25rem;
        }

        .trace-notice-text {
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        .trace-notice-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: rgba(79, 195, 247, 0.2);
            border: 1px solid rgba(79, 195, 247, 0.3);
            border-radius: 8px;
            color: var(--accent-blue);
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.2s;
            white-space: nowrap;
        }

        .trace-notice-link:hover {
            background: rgba(79, 195, 247, 0.3);
            transform: translateY(-1px);
        }

        /* Metrics Grid */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .metric-card {
            background: var(--bg-tertiary);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.5rem;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .metric-label {
            color: var(--text-secondary);
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .metric-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 0.25rem;
        }

        .metric-unit {
            font-size: 1rem;
            color: var(--text-secondary);
            font-weight: 400;
        }

        /* Provider Health */
        .provider-health {
            margin-top: 2rem;
        }

        .section-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: var(--text-primary);
        }

        .providers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1rem;
        }

        .provider-card {
            background: var(--bg-secondary);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            padding: 1rem 1.25rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            transition: all 0.2s;
        }

        .provider-card:hover {
            border-color: rgba(79, 195, 247, 0.3);
        }

        .provider-status {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .provider-status.healthy {
            background: var(--accent-green);
            box-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
        }

        .provider-status.degraded {
            background: var(--accent-yellow);
            box-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
        }

        .provider-status.down {
            background: var(--accent-red);
            box-shadow: 0 0 10px rgba(248, 113, 113, 0.5);
        }

        .provider-status.unknown {
            background: var(--text-secondary);
        }

        .provider-info {
            flex: 1;
            min-width: 0;
        }

        .provider-name {
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 0.25rem;
            text-transform: capitalize;
        }

        .provider-metrics {
            display: flex;
            gap: 1rem;
            font-size: 0.75rem;
            color: var(--text-secondary);
            flex-wrap: wrap;
        }

        .provider-metric {
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        /* Loading State */
        .loading {
            text-align: center;
            padding: 3rem;
            color: var(--text-secondary);
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(79, 195, 247, 0.2);
            border-top-color: var(--accent-blue);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 1rem;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Error State */
        .error {
            background: rgba(248, 113, 113, 0.1);
            border: 1px solid rgba(248, 113, 113, 0.3);
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
            color: var(--accent-red);
        }

        .error-title {
            font-weight: 600;
            margin-bottom: 0.5rem;
        }

        .error-message {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        /* Responsive */
        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }

            .header {
                flex-direction: column;
                align-items: flex-start;
            }

            .header h1 {
                font-size: 1.5rem;
            }

            .metrics-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
            }

            .providers-grid {
                grid-template-columns: 1fr;
            }

            .metric-value {
                font-size: 1.75rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>Micro-Security Gateway Admin</h1>
            <div class="refresh-info">
                <div class="refresh-indicator" id="refreshIndicator"></div>
                <span id="refreshText">Loading...</span>
            </div>
        </header>

        <!-- Trace Integration Notice -->
        <div class="trace-notice" id="traceNotice">
            <div class="trace-notice-icon">📊</div>
            <div class="trace-notice-content">
                <div class="trace-notice-title">Request Metrics Available</div>
                <div class="trace-notice-text" id="traceNoticeText"></div>
            </div>
            <a class="trace-notice-link" id="traceNoticeLink" href="#" target="_blank" rel="noopener">
                Open Dashboard →
            </a>
        </div>

        <!-- Main Content -->
        <main>
            <div id="loading" class="loading">
                <div class="spinner"></div>
                <p>Loading metrics...</p>
            </div>

            <div id="error" class="error" style="display: none;">
                <div class="error-title">Failed to load metrics</div>
                <div class="error-message" id="errorMessage"></div>
            </div>

            <div id="content" style="display: none;">
                <!-- Business Metrics -->
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-label">Total Requests</div>
                        <div class="metric-value" id="totalRequests">0</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Total Cost</div>
                        <div class="metric-value">
                            $<span id="totalCost">0.00</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Total Tokens</div>
                        <div class="metric-value" id="totalTokens">0</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Avg Latency</div>
                        <div class="metric-value">
                            <span id="avgLatency">0</span>
                            <span class="metric-unit">ms</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Active Projects</div>
                        <div class="metric-value" id="activeProjects">0</div>
                    </div>
                </div>

                <!-- Provider Health -->
                <div class="card provider-health">
                    <h2 class="section-title">Provider Health</h2>
                    <div class="providers-grid" id="providersGrid"></div>
                </div>
            </div>
        </main>
    </div>

    <script>
        const TOKEN = '${token}';
        const API_BASE = window.location.origin;
        const REFRESH_INTERVAL = 30000; // 30 seconds

        let refreshTimer = null;
        let lastUpdateTime = null;

        // Format numbers with commas
        function formatNumber(num) {
            return Math.round(num).toLocaleString('en-US');
        }

        // Format cost with 2 decimal places
        function formatCost(cost) {
            return cost.toFixed(2);
        }

        // Format latency with appropriate precision
        function formatLatency(ms) {
            if (ms < 10) return ms.toFixed(2);
            if (ms < 100) return ms.toFixed(1);
            return Math.round(ms).toString();
        }

        // Get status class
        function getStatusClass(status) {
            const statusMap = {
                'healthy': 'healthy',
                'degraded': 'degraded',
                'down': 'down',
                'unknown': 'unknown',
                'error': 'unknown'
            };
            return statusMap[status] || 'unknown';
        }

        // Update trace notice
        function updateTraceNotice(traceMetrics) {
            const notice = document.getElementById('traceNotice');
            const text = document.getElementById('traceNoticeText');
            const link = document.getElementById('traceNoticeLink');

            if (traceMetrics.platform && traceMetrics.platform !== 'none') {
                notice.classList.add('visible');
                text.textContent = \`Request metrics available in \${traceMetrics.platform}\`;

                if (traceMetrics.queryUrl) {
                    link.href = traceMetrics.queryUrl;
                    link.style.display = 'inline-flex';
                } else {
                    link.style.display = 'none';
                }
            } else {
                notice.classList.remove('visible');
            }
        }

        // Update metrics display
        function updateMetrics(data) {
            const { businessMetrics, providerHealth, traceMetrics } = data;

            // Update business metrics
            document.getElementById('totalRequests').textContent = formatNumber(businessMetrics.totalRequests);
            document.getElementById('totalCost').textContent = formatCost(businessMetrics.totalCostUsd);
            document.getElementById('totalTokens').textContent = formatNumber(businessMetrics.totalTokens);
            document.getElementById('avgLatency').textContent = formatLatency(businessMetrics.avgLatencyMs);
            document.getElementById('activeProjects').textContent = formatNumber(businessMetrics.activeProjects);

            // Update provider health
            const providersGrid = document.getElementById('providersGrid');
            providersGrid.innerHTML = '';

            const providers = ['openai', 'anthropic', 'google', 'deepseek', 'groq', 'together'];

            providers.forEach(provider => {
                const health = providerHealth[provider] || {
                    status: 'unknown',
                    latency: 0,
                    errorRate: 0,
                    uptime: 100
                };

                const card = document.createElement('div');
                card.className = 'provider-card';
                card.innerHTML = \`
                    <div class="provider-status \${getStatusClass(health.status)}"></div>
                    <div class="provider-info">
                        <div class="provider-name">\${provider}</div>
                        <div class="provider-metrics">
                            <span class="provider-metric">⏱️ \${Math.round(health.latency)}ms</span>
                            <span class="provider-metric">❌ \${(health.errorRate * 100).toFixed(1)}%</span>
                            <span class="provider-metric">✅ \${health.uptime.toFixed(1)}%</span>
                        </div>
                    </div>
                \`;
                providersGrid.appendChild(card);
            });

            // Update trace notice
            updateTraceNotice(traceMetrics);
        }

        // Update refresh indicator
        function updateRefreshIndicator(loading) {
            const indicator = document.getElementById('refreshIndicator');
            const text = document.getElementById('refreshText');

            if (loading) {
                indicator.classList.add('loading');
                text.textContent = 'Refreshing...';
            } else {
                indicator.classList.remove('loading');
                if (lastUpdateTime) {
                    const seconds = Math.floor((Date.now() - lastUpdateTime) / 1000);
                    text.textContent = \`Updated \${seconds}s ago\`;
                } else {
                    text.textContent = 'Auto-refresh: 30s';
                }
            }
        }

        // Show error
        function showError(message) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('content').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            document.getElementById('errorMessage').textContent = message;
            updateRefreshIndicator(false);
        }

        // Show content
        function showContent() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'none';
            document.getElementById('content').style.display = 'block';
            lastUpdateTime = Date.now();
            updateRefreshIndicator(false);
        }

        // Fetch metrics
        async function fetchMetrics() {
            updateRefreshIndicator(true);

            try {
                const response = await fetch(\`\${API_BASE}/api/admin/observability/metrics?hours=24\`, {
                    headers: {
                        'Authorization': \`Bearer \${TOKEN}\`
                    }
                });

                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                }

                const data = await response.json();
                updateMetrics(data);
                showContent();

            } catch (error) {
                console.error('Failed to fetch metrics:', error);
                showError(error.message || 'Failed to load metrics. Please refresh the page.');
            }
        }

        // Start auto-refresh countdown
        function startRefreshCountdown() {
            setInterval(() => {
                if (lastUpdateTime) {
                    const seconds = Math.floor((Date.now() - lastUpdateTime) / 1000);
                    const remaining = Math.max(0, 30 - seconds);
                    const text = document.getElementById('refreshText');

                    if (!document.getElementById('refreshIndicator').classList.contains('loading')) {
                        if (remaining > 0) {
                            text.textContent = \`Refreshing in \${remaining}s\`;
                        } else {
                            text.textContent = 'Refreshing now...';
                        }
                    }
                }
            }, 1000);
        }

        // Initialize
        fetchMetrics();
        startRefreshCountdown();

        // Set up auto-refresh
        setInterval(fetchMetrics, REFRESH_INTERVAL);
    </script>
</body>
</html>
    `;

    return c.html(html);
});

export default app;
