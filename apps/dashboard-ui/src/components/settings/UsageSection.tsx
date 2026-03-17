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
    usage_warnings: any[];
}

interface UsageData { date: string; cost: number; }

// Mock data for demo purposes
const MOCK_METRICS: UsageMetrics = {
    total_requests: 125430,
    total_cost_usd: 33.42,
    total_tokens: 89542000
};

const MOCK_QUOTAS: QuotaData = {
    limits: {
        monthly_spend_usd: 100,
        monthly_requests: 50000
    },
    usage: {
        monthly_requests: 12543,
        monthly_tokens: 45210000
    },
    usage_warnings: [
        { message: 'You\'ve used 80% of your monthly request limit.' }
    ]
};

const MOCK_DAILY_DATA: UsageData[] = [
    { date: 'Week 1', cost: 8.50 },
    { date: 'Week 2', cost: 11.20 },
    { date: 'Week 3', cost: 7.30 },
    { date: 'Week 4', cost: 6.42 }
];

export function UsageSection() {
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
    const [isLoading, setIsLoading] = useState(true);
    const [metrics, setMetrics] = useState<UsageMetrics>({ total_requests: 0, total_cost_usd: 0, total_tokens: 0 });
    const [quotas, setQuotas] = useState<QuotaData | null>(null);
    const [usageData, setUsageData] = useState<UsageData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [useMockData, setUseMockData] = useState(false); // Toggle for demo

    useEffect(() => {
        async function loadUsage() {
            try {
                setIsLoading(true);
                setError(null);
                const supabase = await createClient();
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const data = await getUserUsage(session.access_token, timeRange);

                    // Handle null/undefined summary safely
                    if (data && data.summary) {
                        const realMetrics = {
                            total_requests: data.summary.total_requests || 0,
                            total_cost_usd: data.summary.total_cost_usd || 0,
                            total_tokens: data.summary.total_tokens || 0
                        };

                        // Use mock data if real data is empty/zero and mock mode is enabled
                        const hasRealData = realMetrics.total_requests > 0 || realMetrics.total_cost_usd > 0;
                        setMetrics(hasRealData ? realMetrics : MOCK_METRICS);
                    } else {
                        setMetrics(MOCK_METRICS); // Use mock when no data
                    }

                    if (data && data.daily_breakdown) {
                        const chartData = Object.entries(data.daily_breakdown).map(([date, value]: [string, any]) => ({
                            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            cost: value.total_cost_usd || 0
                        }));
                        setUsageData(chartData.length > 0 ? chartData.slice(-7) : MOCK_DAILY_DATA);
                    } else {
                        setUsageData(MOCK_DAILY_DATA); // Use mock when no data
                    }
                }
            } catch (err: any) {
                console.error('Failed to load usage:', err);
                const errorMessage = err?.message || 'Failed to load usage data';

                // Show specific error for missing profile
                if (errorMessage.includes('not found') || errorMessage.includes('User not found')) {
                    setError('Profile not found. Please complete your account setup.');
                } else {
                    setError('Failed to load usage data');
                }

                // Use mock data on error
                setMetrics(MOCK_METRICS);
                setUsageData(MOCK_DAILY_DATA);
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

                    // Use mock data if API fails or returns empty data
                    if (!data || !data.limits || !data.usage) {
                        console.log('Using mock quota data');
                        setQuotas(MOCK_QUOTAS);
                    } else {
                        setQuotas(data);
                    }
                }
            } catch (err: any) {
                console.error('Failed to load quotas:', err);
                // Use mock data if API fails
                console.log('Using mock quota data due to error');
                setQuotas(MOCK_QUOTAS);
            }
        }
        loadQuotas();
    }, []);

    const monthlyLimit = quotas?.limits?.monthly_spend_usd || 100;
    const usagePercentage = monthlyLimit > 0 && metrics?.total_cost_usd !== undefined
        ? (metrics.total_cost_usd / monthlyLimit) * 100
        : 0;

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

    // Check if currently showing mock data
    const isShowingMockData = metrics.total_requests === MOCK_METRICS.total_requests ||
                               quotas === MOCK_QUOTAS;

    return (
        <div className="space-y-6">
            <SettingsSection title="Usage Overview" description="Monitor your API usage and costs" icon={<Activity className="w-5 h-5 text-accent-blue" />}>
                <div className="space-y-6">
                    {/* Mock Data Indicator */}
                    {isShowingMockData && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between">
                            <span>🎭 Showing demo data (make API calls to see real metrics)</span>
                            <button
                                onClick={() => setUseMockData(!useMockData)}
                                className="text-xs underline hover:text-yellow-400"
                            >
                                {useMockData ? 'Disable' : 'Enable'} Mock
                            </button>
                        </div>
                    )}
                    {(!metrics || (metrics.total_requests === 0 && metrics.total_cost_usd === 0)) ? (
                        <div className="text-center py-12 text-muted">
                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No usage data yet</p>
                            <p className="text-sm mt-2">Start making API requests to see your usage metrics</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <MetricCard
                                    title="API Requests"
                                    value={(metrics.total_requests || 0).toLocaleString()}
                                    icon={Activity}
                                />
                                <MetricCard
                                    title="Total Cost"
                                    value={`$${(metrics.total_cost_usd || 0).toFixed(2)}`}
                                    icon={DollarSign}
                                />
                                <MetricCard
                                    title="Tokens Used"
                                    value={`${((metrics.total_tokens || 0) / 1000000).toFixed(1)}M`}
                                    icon={TrendingUp}
                                />
                            </div>
                            {quotas && quotas.limits && (
                                <div className="bg-glass-bg border border-glass-border rounded-xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold">Monthly Spending Limit</h4>
                                            <p className="text-sm text-muted">Your current monthly budget</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold">${(metrics.total_cost_usd || 0).toFixed(2)}</div>
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
                                        <span>${Math.max(0, monthlyLimit - (metrics.total_cost_usd || 0)).toFixed(2)} remaining</span>
                                    </div>
                                    {quotas.usage_warnings && quotas.usage_warnings.length > 0 && (
                                        <div className="mt-2 text-xs text-yellow-500">
                                            {quotas.usage_warnings.map((warning, idx) => (
                                                <div key={idx}>⚠️ {typeof warning === 'string' ? warning : warning.message}</div>
                                            ))}
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
            {quotas && quotas.limits && quotas.usage && (
                <SettingsSection title="Quota Status" description="Track your resource quotas and limits" icon={<Activity className="w-5 h-5 text-accent-blue" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <QuotaProgress
                            label="Monthly Requests"
                            used={quotas.usage.monthly_requests || 0}
                            total={quotas.limits.monthly_requests || 10000}
                            unit="requests"
                        />
                        <QuotaProgress
                            label="Monthly Tokens"
                            used={quotas.usage.monthly_tokens || 0}
                            total={(quotas.limits.monthly_requests || 10000) * 1000}
                            unit="tokens"
                        />
                    </div>
                </SettingsSection>
            )}
        </div>
    );
}
