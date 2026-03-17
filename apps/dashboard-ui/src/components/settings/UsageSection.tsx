'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Activity } from 'lucide-react';
import { SettingsSection } from './index';
import { createClient } from '@/utils/supabase/client';
import { getUserUsage, getUserQuotas } from '@/lib/user-api';

interface UsageMetrics {
    total_requests: number;
    total_cost_usd: number;
    total_tokens: number;
}

interface QuotaData {
    limits: { monthly_spend_usd: number; monthly_requests: number };
    usage: { monthly_requests: number; monthly_tokens: number };
    usage_warnings: string[];
}

interface UsageData { date: string; cost: number; }

export function UsageSection() {
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
    const [isLoading, setIsLoading] = useState(true);
    const [metrics, setMetrics] = useState<UsageMetrics>({ total_requests: 0, total_cost_usd: 0, total_tokens: 0 });
    const [quotas, setQuotas] = useState<QuotaData | null>(null);
    const [usageData, setUsageData] = useState<UsageData[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadUsage() {
            try {
                setIsLoading(true);
                setError(null);
                const supabase = await createClient();
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const data = await getUserUsage(session.access_token, timeRange);
                    setMetrics(data.summary || { total_requests: 0, total_cost_usd: 0, total_tokens: 0 });
                    if (data.daily_breakdown) {
                        const chartData = Object.entries(data.daily_breakdown).map(([date, value]: [string, any]) => ({
                            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            cost: value.total_cost_usd || 0
                        }));
                        setUsageData(chartData.slice(-7));
                    }
                }
            } catch (err) {
                console.error('Failed to load usage:', err);
                setError('Failed to load usage data');
            } finally {
                setIsLoading(false);
            }
        }
        loadUsage();
    }, [timeRange]);

    useEffect(() => {
        async function loadQuotas() {
            try {
                const supabase = await createClient();
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const data = await getUserQuotas(session.access_token);
                    setQuotas(data);
                }
            } catch (err) {
                console.error('Failed to load quotas:', err);
            }
        }
        loadQuotas();
    }, []);

    const monthlyLimit = quotas?.limits?.monthly_spend_usd || 100;
    const usagePercentage = monthlyLimit > 0 ? (metrics.total_cost_usd / monthlyLimit) * 100 : 0;

    const MetricCard = ({ title, value, icon: Icon }: any) => (
        <div className="bg-glass-bg border border-glass-border rounded-xl p-4 hover:border-accent-blue/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">{title}</span>
                <Icon className="w-4 h-4 text-accent-blue" />
            </div>
            <div className="text-2xl font-bold">{value}</div>
        </div>
    );

    const UsageChart = () => {
        if (usageData.length === 0) {
            return <div className="text-center py-8 text-muted">No usage data available for this period</div>;
        }
        const maxCost = Math.max(...usageData.map(d => d.cost), 1);
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="font-bold">Usage Trends</h4>
                    <div className="flex gap-2">
                        {(['week', 'month', 'year'] as const).map((range) => (
                            <button key={range} onClick={() => setTimeRange(range)}
                                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                                    timeRange === range ? 'bg-accent-blue text-white' : 'bg-glass-bg text-muted hover:text-white'
                                }`}>
                                {range.charAt(0).toUpperCase() + range.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-3">
                    {usageData.map((item, index) => (
                        <div key={index} className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted">{item.date}</span>
                                <span className="font-medium">${item.cost.toFixed(2)} USD</span>
                            </div>
                            <div className="h-2 bg-glass-bg rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-accent-blue to-accent-violet rounded-full transition-all duration-500"
                                    style={{ width: `${(item.cost / maxCost) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const QuotaProgress = ({ label, used, total, unit }: any) => {
        const percentage = total > 0 ? (used / total) * 100 : 0;
        const color = percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-yellow-500' : 'bg-accent-blue';
        return (
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted">{label}</span>
                    <span className="font-medium">{used.toLocaleString()} / {total.toLocaleString()} {unit}</span>
                </div>
                <div className="h-2 bg-glass-bg rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                </div>
                <div className="text-xs text-muted text-right">{percentage.toFixed(1)}% used</div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <SettingsSection title="Usage Overview" description="Monitor your API usage and costs" icon={<Activity className="w-5 h-5 text-accent-blue" />}>
                    <div className="flex items-center justify-center py-12"><div className="text-muted">Loading usage data...</div></div>
                </SettingsSection>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <SettingsSection title="Usage Overview" description="Monitor your API usage and costs" icon={<Activity className="w-5 h-5 text-accent-blue" />}>
                    <div className="flex items-center justify-center py-12"><div className="text-red-500">{error}</div></div>
                </SettingsSection>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SettingsSection title="Usage Overview" description="Monitor your API usage and costs" icon={<Activity className="w-5 h-5 text-accent-blue" />}>
                <div className="space-y-6">
                    {metrics.total_requests === 0 && metrics.total_cost_usd === 0 ? (
                        <div className="text-center py-12 text-muted">
                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No usage data yet</p>
                            <p className="text-sm mt-2">Start making API requests to see your usage metrics</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <MetricCard title="API Requests" value={metrics.total_requests.toLocaleString()} icon={Activity} />
                                <MetricCard title="Total Cost" value={`$${metrics.total_cost_usd.toFixed(2)}`} icon={DollarSign} />
                                <MetricCard title="Tokens Used" value={`${(metrics.total_tokens / 1000000).toFixed(1)}M`} icon={TrendingUp} />
                            </div>
                            {quotas && (
                                <div className="bg-glass-bg border border-glass-border rounded-xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold">Monthly Spending Limit</h4>
                                            <p className="text-sm text-muted">Your current monthly budget</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold">${metrics.total_cost_usd.toFixed(2)}</div>
                                            <div className="text-sm text-muted">of ${monthlyLimit} limit</div>
                                        </div>
                                    </div>
                                    <div className="h-3 bg-glass-bg rounded-full overflow-hidden border border-glass-border">
                                        <div className={`h-full rounded-full transition-all duration-500 ${
                                            usagePercentage > 80 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-accent-blue shadow-[0_0_10px_rgba(77,159,255,0.5)]'
                                        }`} style={{ width: `${Math.min(usagePercentage, 100)}%` }} />
                                    </div>
                                    <div className="flex justify-between text-xs text-muted">
                                        <span>{usagePercentage.toFixed(1)}% used</span>
                                        <span>${Math.max(0, monthlyLimit - metrics.total_cost_usd).toFixed(2)} remaining</span>
                                    </div>
                                    {quotas.usage_warnings && quotas.usage_warnings.length > 0 && (
                                        <div className="mt-2 text-xs text-yellow-500">
                                            {quotas.usage_warnings.map((warning, idx) => <div key={idx}>⚠️ {warning}</div>)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </SettingsSection>
            <SettingsSection title="Usage Analytics" description="Detailed usage trends and patterns" icon={<TrendingUp className="w-5 h-5 text-accent-violet" />}>
                <UsageChart />
            </SettingsSection>
            {quotas && (
                <SettingsSection title="Quota Status" description="Track your resource quotas and limits" icon={<Activity className="w-5 h-5 text-accent-blue" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <QuotaProgress label="Monthly Requests" used={quotas.usage.monthly_requests} total={quotas.limits.monthly_requests} unit="requests" />
                        <QuotaProgress label="Monthly Tokens" used={quotas.usage.monthly_tokens} total={quotas.limits.monthly_requests * 1000} unit="tokens" />
                    </div>
                </SettingsSection>
            )}
        </div>
    );
}
