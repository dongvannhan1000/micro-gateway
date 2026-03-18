'use client';

/**
 * Health Check API
 * Public endpoint (no authentication required) to check gateway service status
 */

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8787';

export interface HealthStatus {
  status: string;
  version: string;
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const response = await fetch(`${GATEWAY_URL}/api/health`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
