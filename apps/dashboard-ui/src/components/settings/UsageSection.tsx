'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Activity, MessageSquare, MessageCircle } from 'lucide-react';
import { SettingsSection } from './index';
import { createClient } from '@/utils/supabase/client';
import { getUserUsage, getUserQuotas } from '@/lib/user-api';

interface UsageMetrics {
    total_requests: number;
    total_cost_usd: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_tokens: number;
}

interface QuotaData {
    tier: string;
    limits: {
        projects: { max: number; current: number; remaining: number };
        gateway_keys: { max: number; current: number; remaining: number };
        monthly_requests: { max: number; current: number; remaining: number; period_start: string; period_end: string; days_remaining: number };
    };
    usage_warnings: Array<{ type: string; message: string; severity: string }>;
}

// Mock data for demo purposes
const MOCK_METRICS: UsageMetrics = {
    total_requests: 125430,
    total_cost_usd: 33.42,
    total_prompt_tokens: 52345000,
    total_completion_tokens: 37197000,
    total_tokens: 89542000
};

const MOCK_QUOTAS: QuotaData = {
    tier: 'free',
    limits: {
        projects: { max: 2, current: 1, remaining: 1 },
        gateway_keys: { max: 3, current: 1, remaining: 2 },
        monthly_requests: {
            max: 10000,
            current: 1254,
            remaining: 8746,
            period_start: new Date().toISOString().split('T')[0],
            period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            days_remaining: 30
        }
    },
    usage_warnings: [
        { type: 'monthly_requests', message: 'You\'ve used 80% of your monthly request limit.', severity: 'warning' }
    ]
};

export function UsageSection() {
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
    const [isLoading, setIsLoading] = useState(true);
    const [metrics, setMetrics] = useState<UsageMetrics>({ total_requests: 0, total_cost_usd: 0, total_prompt_tokens: 0, total_completion_tokens: 0, total_tokens: 0 });
    const [quotas, setQuotas] = useState<QuotaData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isUsingMockData, setIsUsingMockData] = useState(false); // Track if currently showing mock

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
                        // Use real data from API (even if it's 0)
                        const realMetrics = {
                            total_requests: data.summary.total_requests || 0,
                            total_cost_usd: data.summary.total_cost_usd || 0,
                            total_prompt_tokens: data.summary.total_prompt_tokens || 0,
                            total_completion_tokens: data.summary.total_completion_tokens || 0,
                            total_tokens: data.summary.total_tokens || 0
                        };
                        console.log('[Usage] Real metrics from API:', realMetrics);
                        setMetrics(realMetrics);
                        setIsUsingMockData(false); // Using real data
                    } else {
                        // Only use mock if API returns null/undefined (not if it returns 0)
                        console.log('[Usage] API returned null data, using mock');
                        console.log('[Usage] Mock metrics:', MOCK_METRICS);
                        setMetrics(MOCK_METRICS);
                        setIsUsingMockData(true); // Using mock data
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
                setIsUsingMockData(true); // Using mock data
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

                    // Use real data from API (even if usage is 0)
                    if (data && data.limits) {
                        setQuotas(data);
                        setIsUsingMockData(false); // Using real data
                    } else if (data && Object.keys(data).length > 0) {
                        // API returned partial data, use what we have
                        setQuotas(data);
                        setIsUsingMockData(false); // Using real data
                    } else {
                        // Only use mock if API returns null/undefined
                        console.log('[Quotas] API returned null data, using mock');
                        setQuotas(MOCK_QUOTAS);
                        setIsUsingMockData(true); // Using mock data
                    }
                }
            } catch (err: any) {
                console.error('Failed to load quotas:', err);
                // Use mock data if API fails
                console.log('[Quotas] API error, using mock data');
                setQuotas(MOCK_QUOTAS);
                setIsUsingMockData(true); // Using mock data
            }
        }
        loadQuotas();
    }, []);

    const MetricCard = ({ title, value, icon: Icon }: any) => (
        <div className="bg-glass-bg border border-glass-border rounded-xl p-4 hover:border-accent-blue/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">{title}</span>
                <Icon className="w-4 h-4 text-accent-blue" />
            </div>
            <div className="text-2xl font-bold">{value}</div>
        </div>
    );

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

    // Debug: Log current state
    console.log('[Usage] Render state:', {
        isLoading,
        isUsingMockData,
        metrics,
        quotas: quotas ? 'exists' : 'null',
        error,
        hasNoData: !metrics || (metrics.total_requests === 0 && metrics.total_cost_usd === 0 && metrics.total_prompt_tokens === 0 && metrics.total_completion_tokens === 0 && metrics.total_tokens === 0),
        willShowEmptyState: !metrics || (!isUsingMockData && metrics.total_requests === 0 && metrics.total_cost_usd === 0 && metrics.total_prompt_tokens === 0 && metrics.total_completion_tokens === 0 && metrics.total_tokens === 0)
    });

    console.log('[Usage] Checking render condition:', {
        metrics: metrics,
        isUsingMockData: isUsingMockData,
        condition: !metrics || (!isUsingMockData && metrics.total_requests === 0 && metrics.total_cost_usd === 0 && metrics.total_prompt_tokens === 0 && metrics.total_completion_tokens === 0 && metrics.total_tokens === 0),
        total_requests: metrics?.total_requests,
        total_cost_usd: metrics?.total_cost_usd,
        total_prompt_tokens: metrics?.total_prompt_tokens,
        total_completion_tokens: metrics?.total_completion_tokens,
        total_tokens: metrics?.total_tokens
    });

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
                    {/* Mock Data Indicator */}
                    {isUsingMockData && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-4 py-3 rounded-xl text-sm font-medium">
                            🎭 Showing demo data (API returned null/error - make API calls to see real metrics)
                        </div>
                    )}
                    {(!metrics || (!isUsingMockData && metrics.total_requests === 0 && metrics.total_cost_usd === 0 && metrics.total_prompt_tokens === 0 && metrics.total_completion_tokens === 0 && metrics.total_tokens === 0)) ? (
                        <div className="text-center py-12 text-muted">
                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No usage data yet</p>
                            <p className="text-sm mt-2">Start making API requests to see your usage metrics</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                                    title="Input Tokens"
                                    value={(metrics.total_prompt_tokens || 0).toLocaleString()}
                                    icon={MessageSquare}
                                />
                                <MetricCard
                                    title="Output Tokens"
                                    value={(metrics.total_completion_tokens || 0).toLocaleString()}
                                    icon={MessageCircle}
                                />
                            </div>

                            {/* Token Summary with Percentages */}
                            <div className="bg-glass-bg border border-glass-border rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-accent-violet" />
                                        <span className="text-sm font-medium">Total Tokens</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold">{(metrics.total_tokens || 0).toLocaleString()}</div>
                                        {metrics.total_tokens > 0 && (
                                            <div className="text-xs text-muted">
                                                Input: {Math.round((metrics.total_prompt_tokens / metrics.total_tokens) * 100)}% |
                                                Output: {Math.round((metrics.total_completion_tokens / metrics.total_tokens) * 100)}%
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {quotas && quotas.usage_warnings && quotas.usage_warnings.length > 0 && (
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 space-y-2">
                                    {quotas.usage_warnings.map((warning, idx) => (
                                        <div key={idx} className="text-sm text-yellow-500">
                                            ⚠️ {warning.message}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </SettingsSection>
            {quotas && quotas.limits && (
                <SettingsSection title="Quota Status" description="Track your resource quotas and limits" icon={<Activity className="w-5 h-5 text-accent-blue" />}>
                    <div className="mb-6 p-4 bg-glass-bg border border-glass-border rounded-xl space-y-2">
                        <h4 className="font-bold text-sm">📅 Understanding Your Limits</h4>
                        <div className="text-xs text-muted space-y-1">
                            <p><span className="font-medium text-accent-blue">Monthly Requests:</span> Rolling 30-day period from your first API request (personalized to your account)</p>
                            <p><span className="font-medium text-accent-violet">Gateway Key Limits:</span> Calendar month (resets on the 1st of each month at 00:00 UTC)</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <QuotaProgress
                            label="Monthly Requests (Rolling 30-day)"
                            used={quotas.limits.monthly_requests?.current || 0}
                            total={quotas.limits.monthly_requests?.max || 10000}
                            unit="requests"
                        />
                        <QuotaProgress
                            label="Projects"
                            used={quotas.limits.projects?.current || 0}
                            total={quotas.limits.projects?.max || 2}
                            unit="projects"
                        />
                    </div>
                    <div className="mt-4">
                        <QuotaProgress
                            label="Gateway Keys"
                            used={quotas.limits.gateway_keys?.current || 0}
                            total={quotas.limits.gateway_keys?.max || 3}
                            unit="keys"
                        />
                    </div>
                    {quotas.limits.monthly_requests?.days_remaining !== undefined && (
                        <div className="mt-4 p-3 bg-accent-blue/10 border border-accent-blue/30 rounded-lg">
                            <div className="text-center text-sm">
                                <span className="text-accent-blue font-medium">Your 30-day period ends in {quotas.limits.monthly_requests.days_remaining} days</span>
                                <p className="text-xs text-muted mt-1">Since your first API request on {new Date(quotas.limits.monthly_requests.period_start).toLocaleDateString()}</p>
                            </div>
                        </div>
                    )}
                    <div className="mt-3 p-3 bg-accent-violet/10 border border-accent-violet/30 rounded-lg">
                        <div className="text-center text-sm">
                            <span className="text-accent-violet font-medium">Gateway Key limits reset on the 1st of each month at 00:00 UTC</span>
                            <p className="text-xs text-muted mt-1">Individual key spending limits are managed per key in project settings</p>
                        </div>
                    </div>
                </SettingsSection>
            )}
        </div>
    );
}
