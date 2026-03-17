'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface UsageSummaryCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    loading?: boolean;
}

export function UsageSummaryCard({
    title,
    value,
    icon: Icon,
    trend,
    loading = false
}: UsageSummaryCardProps) {
    if (loading) {
        return (
            <div className="bg-glass-bg border border-glass-border rounded-xl p-6 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                    <div className="h-5 w-24 bg-glass-border rounded" />
                    <div className="h-10 w-10 bg-glass-border rounded-lg" />
                </div>
                <div className="h-8 w-32 bg-glass-border rounded mb-2" />
                <div className="h-4 w-20 bg-glass-border rounded" />
            </div>
        );
    }

    const trendValue = trend ? parseFloat(trend) : 0;
    const isPositive = trendValue > 0;
    const isNeutral = trendValue === 0;

    return (
        <div className="glass-card p-6">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-sm text-muted font-medium mb-1">{title}</h3>
                    <div className="text-3xl font-bold text-foreground">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </div>
                </div>
                <div className="flex-shrink-0 ml-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-blue/20 to-accent-violet/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-accent-blue" />
                    </div>
                </div>
            </div>

            {trend && (
                <div className="flex items-center gap-2 mt-2">
                    {!isNeutral && (
                        <div className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {isPositive ? '↑' : '↓'} {Math.abs(trendValue)}%
                        </div>
                    )}
                    <span className="text-xs text-muted">
                        {isNeutral ? 'No change from last month' : 'from last month'}
                    </span>
                </div>
            )}
        </div>
    );
}

export default UsageSummaryCard;
