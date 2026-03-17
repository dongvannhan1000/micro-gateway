'use client';

import React from 'react';
import { Zap } from 'lucide-react';

interface ProviderBreakdownProps {
    data: Array<{
        provider: string;
        cost_usd: number;
        requests: number;
    }>;
    loading?: boolean;
}

const providerColors = {
    openai: { bg: 'bg-blue-500/20', text: 'text-blue-500', border: 'border-blue-500/30' },
    anthropic: { bg: 'bg-violet-500/20', text: 'text-violet-500', border: 'border-violet-500/30' },
    google: { bg: 'bg-yellow-500/20', text: 'text-yellow-500', border: 'border-yellow-500/30' },
    deepseek: { bg: 'bg-green-500/20', text: 'text-green-500', border: 'border-green-500/30' }
};

const providerNames = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    deepseek: 'DeepSeek'
};

export function ProviderBreakdown({ data, loading = false }: ProviderBreakdownProps) {
    if (loading) {
        return (
            <div className="bg-glass-bg border border-glass-border rounded-xl p-6 animate-pulse">
                <div className="h-6 w-48 bg-glass-border rounded mb-6" />
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-glass-border rounded" />
                    ))}
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-glass-bg border border-glass-border rounded-xl p-12 text-center">
                <Zap className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
                <p className="text-muted">No provider usage data available</p>
            </div>
        );
    }

    // Sort by cost descending and calculate percentages
    const sortedData = [...data].sort((a, b) => b.cost_usd - a.cost_usd);
    const totalCost = sortedData.reduce((sum, d) => sum + d.cost_usd, 0);
    const totalRequests = sortedData.reduce((sum, d) => sum + d.requests, 0);
    const maxCost = Math.max(...sortedData.map(d => d.cost_usd));

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Provider Breakdown</h3>
                <div className="text-sm text-muted">
                    Total: ${totalCost.toFixed(2)} · {totalRequests.toLocaleString()} requests
                </div>
            </div>

            <div className="space-y-4">
                {sortedData.map((provider) => {
                    const colors = providerColors[provider.provider as keyof typeof providerColors] || providerColors.openai;
                    const percentage = totalCost > 0 ? (provider.cost_usd / totalCost) * 100 : 0;
                    const barWidth = maxCost > 0 ? (provider.cost_usd / maxCost) * 100 : 0;

                    return (
                        <div
                            key={provider.provider}
                            className="bg-glass-bg border border-glass-border rounded-lg p-4 hover:border-accent-blue/50 transition-all"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg ${colors.bg} ${colors.text} flex items-center justify-center font-bold`}>
                                        {provider.provider.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-foreground">
                                            {providerNames[provider.provider as keyof typeof providerNames] || provider.provider}
                                        </div>
                                        <div className="text-xs text-muted">
                                            {provider.requests.toLocaleString()} requests
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-lg text-foreground">
                                        ${provider.cost_usd.toFixed(2)}
                                    </div>
                                    <div className={`text-sm ${colors.text}`}>
                                        {percentage.toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="relative h-2 bg-glass-border rounded-full overflow-hidden">
                                <div
                                    className={`absolute left-0 top-0 h-full ${colors.bg} ${colors.border} border rounded-full transition-all duration-500`}
                                    style={{ width: `${barWidth}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ProviderBreakdown;
