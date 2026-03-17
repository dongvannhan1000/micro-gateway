'use client';

import React, { useState } from 'react';
import { Activity, DollarSign } from 'lucide-react';

interface DailyUsageChartProps {
    data: Array<{
        date: string;
        api_calls: number;
        cost_usd: number;
    }>;
    loading?: boolean;
}

type ViewMode = 'api_calls' | 'cost_usd';

export function DailyUsageChart({ data, loading = false }: DailyUsageChartProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('api_calls');

    if (loading) {
        return (
            <div className="bg-glass-bg border border-glass-border rounded-xl p-6 animate-pulse">
                <div className="flex items-center justify-between mb-6">
                    <div className="h-6 w-48 bg-glass-border rounded" />
                    <div className="h-8 w-32 bg-glass-border rounded" />
                </div>
                <div className="h-64 bg-glass-border rounded" />
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-glass-bg border border-glass-border rounded-xl p-12 text-center">
                <Activity className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
                <p className="text-muted">No usage data for this period</p>
            </div>
        );
    }

    // Get last 14 days of data
    const chartData = data.slice(-14);
    const maxValue = Math.max(...chartData.map(d => d[viewMode]));
    const minValue = Math.min(...chartData.map(d => d[viewMode]));

    // Calculate points for SVG polyline
    const chartHeight = 200;
    const chartWidth = 100;
    const padding = 10;

    const points = chartData.map((d, index) => {
        const x = (index / (chartData.length - 1)) * (chartWidth - 2 * padding) + padding;
        const normalizedValue = (d[viewMode] - minValue) / (maxValue - minValue || 1);
        const y = chartHeight - (normalizedValue * (chartHeight - 2 * padding) + padding);
        return `${x},${y}`;
    }).join(' ');

    // Create gradient fill path
    const fillPath = `${points} L${chartWidth - padding},${chartHeight} L${padding},${chartHeight} Z`;

    const formatValue = (value: number, mode: ViewMode): string => {
        if (mode === 'cost_usd') {
            return `$${value.toFixed(2)}`;
        }
        return value.toLocaleString();
    };

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Daily Usage</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('api_calls')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            viewMode === 'api_calls'
                                ? 'bg-accent-blue text-white'
                                : 'bg-glass-bg text-muted hover:text-foreground'
                        }`}
                    >
                        <Activity className="w-4 h-4 inline mr-1" />
                        API Calls
                    </button>
                    <button
                        onClick={() => setViewMode('cost_usd')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            viewMode === 'cost_usd'
                                ? 'bg-accent-blue text-white'
                                : 'bg-glass-bg text-muted hover:text-foreground'
                        }`}
                    >
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Cost
                    </button>
                </div>
            </div>

            <div className="relative">
                <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-64"
                    preserveAspectRatio="none"
                >
                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="var(--accent-blue)" />
                            <stop offset="100%" stopColor="var(--accent-violet)" />
                        </linearGradient>
                        <linearGradient id="fillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="var(--accent-violet)" stopOpacity="0.05" />
                        </linearGradient>
                    </defs>

                    {/* Fill gradient under line */}
                    <path
                        d={fillPath}
                        fill="url(#fillGradient)"
                    />

                    {/* Line chart */}
                    <polyline
                        points={points}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Data points */}
                    {chartData.map((d, index) => {
                        const x = (index / (chartData.length - 1)) * (chartWidth - 2 * padding) + padding;
                        const normalizedValue = (d[viewMode] - minValue) / (maxValue - minValue || 1);
                        const y = chartHeight - (normalizedValue * (chartHeight - 2 * padding) + padding);

                        return (
                            <circle
                                key={index}
                                cx={x}
                                cy={y}
                                r="2"
                                fill="var(--accent-blue)"
                                className="hover:r-3 transition-all cursor-pointer"
                            >
                                <title>{d.date}: {formatValue(d[viewMode], viewMode)}</title>
                            </circle>
                        );
                    })}
                </svg>

                {/* X-axis labels */}
                <div className="flex justify-between mt-2 text-xs text-muted">
                    {chartData.map((d, index) => (
                        <div
                            key={index}
                            className={index % 2 === 0 ? '' : 'hidden'}
                        >
                            {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Y-axis labels */}
            <div className="absolute left-2 top-16 bottom-8 flex flex-col justify-between text-xs text-muted">
                <div>{formatValue(maxValue, viewMode)}</div>
                <div>{formatValue(minValue, viewMode)}</div>
            </div>
        </div>
    );
}

export default DailyUsageChart;
