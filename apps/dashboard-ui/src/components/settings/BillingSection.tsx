'use client';

import React, { useState } from 'react';
import { CreditCard, TrendingUp, DollarSign, Activity, Download, Calendar } from 'lucide-react';
import { SettingsSection, Button } from './index';

interface UsageMetrics {
    totalApiCalls: number;
    totalCost: number;
    totalTokens: number;
    requestCount: number;
}

interface BillingRecord {
    id: string;
    date: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
    invoiceUrl?: string;
}

interface UsageData {
    date: string;
    apiCalls: number;
    cost: number;
    tokens: number;
}

export function BillingSection() {
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
    const [isLoading, setIsLoading] = useState(false);

    // Mock data - replace with API calls
    const metrics: UsageMetrics = {
        totalApiCalls: 125430,
        totalCost: 33.42,
        totalTokens: 89542000,
        requestCount: 12543
    };

    const billingHistory: BillingRecord[] = [
        {
            id: 'INV-2024-001',
            date: '2024-02-01',
            amount: 45.50,
            status: 'paid',
            invoiceUrl: '#'
        },
        {
            id: 'INV-2024-002',
            date: '2024-01-01',
            amount: 38.20,
            status: 'paid',
            invoiceUrl: '#'
        },
        {
            id: 'INV-2023-012',
            date: '2023-12-01',
            amount: 52.80,
            status: 'paid',
            invoiceUrl: '#'
        }
    ];

    const usageData: UsageData[] = [
        { date: 'Week 1', apiCalls: 32000, cost: 8.50, tokens: 22500000 },
        { date: 'Week 2', apiCalls: 41000, cost: 11.20, tokens: 29500000 },
        { date: 'Week 3', apiCalls: 28000, cost: 7.30, tokens: 19800000 },
        { date: 'Week 4', apiCalls: 24430, cost: 6.42, tokens: 17742000 }
    ];

    const monthlyLimit = 100;
    const usagePercentage = (metrics.totalCost / monthlyLimit) * 100;

    const MetricCard = ({ title, value, icon: Icon, trend }: any) => (
        <div className="bg-glass-bg border border-glass-border rounded-xl p-4 hover:border-accent-blue/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">{title}</span>
                <Icon className="w-4 h-4 text-accent-blue" />
            </div>
            <div className="text-2xl font-bold">{value}</div>
            {trend && (
                <div className="text-xs text-muted mt-1">{trend}</div>
            )}
        </div>
    );

    const UsageChart = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="font-bold">Usage Trends</h4>
                <div className="flex gap-2">
                    {(['week', 'month', 'year'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                                timeRange === range
                                    ? 'bg-accent-blue text-white'
                                    : 'bg-glass-bg text-muted hover:text-white'
                            }`}
                        >
                            {range.charAt(0).toUpperCase() + range.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Simple bar chart visualization */}
            <div className="space-y-3">
                {usageData.map((item, index) => (
                    <div key={index} className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted">{item.date}</span>
                            <span className="font-medium">{item.cost.toFixed(2)} USD</span>
                        </div>
                        <div className="h-2 bg-glass-bg rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-accent-blue to-accent-violet rounded-full transition-all duration-500"
                                style={{ width: `${(item.cost / 15) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const QuotaProgress = ({ label, used, total, unit }: any) => {
        const percentage = (used / total) * 100;
        const color = percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-yellow-500' : 'bg-accent-blue';

        return (
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted">{label}</span>
                    <span className="font-medium">
                        {used.toLocaleString()} / {total.toLocaleString()} {unit}
                    </span>
                </div>
                <div className="h-2 bg-glass-bg rounded-full overflow-hidden">
                    <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
                <div className="text-xs text-muted text-right">{percentage.toFixed(1)}% used</div>
            </div>
        );
    };

    const downloadInvoice = (invoiceId: string) => {
        // Implement invoice download logic
        console.log('Downloading invoice:', invoiceId);
    };

    return (
        <div className="space-y-6">
            <SettingsSection
                title="Usage Overview"
                description="Monitor your API usage and costs"
                icon={<Activity className="w-5 h-5 text-accent-blue" />}
            >
                <div className="space-y-6">
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="API Calls"
                            value={metrics.totalApiCalls.toLocaleString()}
                            icon={Activity}
                            trend="+12.5% from last month"
                        />
                        <MetricCard
                            title="Total Cost"
                            value={`$${metrics.totalCost.toFixed(2)}`}
                            icon={DollarSign}
                            trend="+8.3% from last month"
                        />
                        <MetricCard
                            title="Tokens Used"
                            value={`${(metrics.totalTokens / 1000000).toFixed(1)}M`}
                            icon={TrendingUp}
                            trend="+15.2% from last month"
                        />
                        <MetricCard
                            title="Requests"
                            value={metrics.requestCount.toLocaleString()}
                            icon={Activity}
                            trend="+9.8% from last month"
                        />
                    </div>

                    {/* Monthly Limit */}
                    <div className="bg-glass-bg border border-glass-border rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold">Monthly Spending Limit</h4>
                                <p className="text-sm text-muted">Your current monthly budget</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold">${metrics.totalCost.toFixed(2)}</div>
                                <div className="text-sm text-muted">of ${monthlyLimit} limit</div>
                            </div>
                        </div>
                        <div className="h-3 bg-glass-bg rounded-full overflow-hidden border border-glass-border">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    usagePercentage > 80
                                        ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                        : 'bg-accent-blue shadow-[0_0_10px_rgba(77,159,255,0.5)]'
                                }`}
                                style={{ width: `${usagePercentage}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-muted">
                            <span>{usagePercentage.toFixed(1)}% used</span>
                            <span>${(monthlyLimit - metrics.totalCost).toFixed(2)} remaining</span>
                        </div>
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection
                title="Usage Analytics"
                description="Detailed usage trends and patterns"
                icon={<TrendingUp className="w-5 h-5 text-accent-violet" />}
            >
                <UsageChart />
            </SettingsSection>

            <SettingsSection
                title="Quota Status"
                description="Track your resource quotas and limits"
                icon={<Activity className="w-5 h-5 text-accent-blue" />}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <QuotaProgress
                        label="API Requests"
                        used={metrics.requestCount}
                        total={50000}
                        unit="requests"
                    />
                    <QuotaProgress
                        label="Tokens"
                        used={metrics.totalTokens}
                        total={100000000}
                        unit="tokens"
                    />
                    <QuotaProgress
                        label="Concurrent Requests"
                        used={25}
                        total={100}
                        unit="requests"
                    />
                    <QuotaProgress
                        label="Storage"
                        used={2.4}
                        total={10}
                        unit="GB"
                    />
                </div>
            </SettingsSection>

            <SettingsSection
                title="Billing History"
                description="View and download your invoices"
                icon={<CreditCard className="w-5 h-5 text-accent-blue" />}
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-glass-border">
                                <th className="text-left py-3 px-4 text-sm font-bold text-muted">Invoice</th>
                                <th className="text-left py-3 px-4 text-sm font-bold text-muted">Date</th>
                                <th className="text-left py-3 px-4 text-sm font-bold text-muted">Amount</th>
                                <th className="text-left py-3 px-4 text-sm font-bold text-muted">Status</th>
                                <th className="text-right py-3 px-4 text-sm font-bold text-muted">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {billingHistory.map((record) => (
                                <tr key={record.id} className="border-b border-glass-border hover:bg-glass-bg transition-colors">
                                    <td className="py-3 px-4 text-sm font-medium">{record.id}</td>
                                    <td className="py-3 px-4 text-sm text-muted">
                                        {new Date(record.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </td>
                                    <td className="py-3 px-4 text-sm font-medium">${record.amount.toFixed(2)}</td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg ${
                                            record.status === 'paid' ? 'bg-green-500/10 text-green-500' :
                                            record.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                            'bg-red-500/10 text-red-500'
                                        }`}>
                                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            icon={<Download className="w-3 h-3" />}
                                            onClick={() => downloadInvoice(record.id)}
                                        >
                                            Download
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SettingsSection>
        </div>
    );
}
