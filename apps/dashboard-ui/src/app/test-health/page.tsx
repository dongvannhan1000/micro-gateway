'use client';

import { HealthStatus } from '@/components/HealthStatus';

/**
 * Test page for HealthStatus component
 * This page demonstrates the health check feature working end-to-end
 */
export default function TestHealthPage() {
  return (
    <div className="min-h-screen bg-background-dark p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Health Check Feature Test</h1>
          <p className="text-muted">Testing the /api/health endpoint and HealthStatus component</p>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Gateway Health Status</h2>
            <HealthStatus />
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-2">Feature Details</h3>
            <ul className="space-y-2 text-muted">
              <li>✅ Backend endpoint: GET /api/health</li>
              <li>✅ Frontend component: HealthStatus.tsx</li>
              <li>✅ API client: health-api.ts</li>
              <li>✅ Documentation: HEALTH_CHECK_FEATURE.md</li>
              <li>✅ Automatic polling every 30 seconds</li>
              <li>✅ Visual status indicators</li>
              <li>✅ Error handling and loading states</li>
            </ul>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-2">API Response</h3>
            <pre className="bg-black/50 p-4 rounded-lg text-sm text-green-400 overflow-x-auto">
{`{
  "status": "healthy",
  "version": "1.0.0"
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
