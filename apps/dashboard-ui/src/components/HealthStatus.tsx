'use client';

import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle, XCircle } from 'lucide-react';
import { getHealthStatus, type HealthStatus as HealthStatusType } from '@/lib/health-api';

/**
 * HealthStatus Component
 *
 * This component displays the current health status of the Micro-Security Gateway.
 * It polls the /api/health endpoint every 30 seconds to check if the gateway service
 * is running and displays the status with appropriate visual indicators.
 *
 * The component shows:
 * - Current status (healthy/unhealthy)
 * - Gateway version
 * - Visual indicator (green checkmark for healthy, red X for unhealthy)
 * - Last checked timestamp
 *
 * This component is useful for dashboard monitoring and helps users verify
 * that the gateway service is operational.
 */
export const HealthStatus: React.FC = () => {
    const [health, setHealth] = useState<HealthStatusType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    const fetchHealth = async () => {
        try {
            setError(null);
            const status = await getHealthStatus();
            setHealth(status);
            setLastChecked(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch health status');
            setLastChecked(new Date());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();

        // Poll health status every 30 seconds
        const interval = setInterval(fetchHealth, 30000);

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="p-6 rounded-2xl border bg-background-light glass-morphism hover-glow transition-all">
                <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-muted animate-pulse" />
                    <div>
                        <p className="text-sm font-medium text-muted">Gateway Status</p>
                        <p className="text-lg font-bold font-heading text-muted">Checking...</p>
                    </div>
                </div>
            </div>
        );
    }

    const isHealthy = health?.status === 'healthy';

    return (
        <div className="p-6 rounded-2xl border bg-background-light glass-morphism hover-glow transition-all">
            <div className="flex items-center gap-3">
                {isHealthy ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                )}
                <div>
                    <p className="text-sm font-medium text-muted">Gateway Status</p>
                    <p className={`text-lg font-bold font-heading ${isHealthy ? 'text-green-500' : 'text-red-500'}`}>
                        {isHealthy ? 'Healthy' : 'Unhealthy'}
                    </p>
                    {health && (
                        <p className="text-xs text-muted mt-1">
                            Version: {health.version}
                        </p>
                    )}
                    {error && (
                        <p className="text-xs text-red-500 mt-1">
                            {error}
                        </p>
                    )}
                    {lastChecked && (
                        <p className="text-xs text-muted mt-1">
                            Last checked: {lastChecked.toLocaleTimeString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
