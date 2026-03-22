'use client';

import React, { useState } from 'react';
import { Activity, DollarSign, Clock, ShieldAlert, BarChart3, ChevronRight, MessageSquare, MessageCircle } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { UsageChart } from '@/components/dashboard/usage-chart';
import { ProjectSelector } from '@/components/dashboard/ProjectSelector';
import { getAnalyticsSummary, getUsageData } from '../actions';
import { clsx } from 'clsx';

interface AnalyticsViewerProps {
    initialSummary: any;
    initialUsage: any[];
    projects: any[];
    initialProjectId: string;
}

export function AnalyticsViewer({ initialSummary, initialUsage, projects, initialProjectId }: AnalyticsViewerProps) {
    const [summary, setSummary] = useState(initialSummary);
    const [usage, setUsage] = useState(initialUsage);
    const [loading, setLoading] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);

    const loadData = async (projectId: string) => {
        setLoading(true);
        try {
            const [s, u] = await Promise.all([
                getAnalyticsSummary(projectId),
                getUsageData(projectId)
            ]);
            setSummary(s);
            setUsage(u);
        } catch (err) {
            console.error('Failed to load analytics data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleProjectChange = (id: string) => {
        setSelectedProjectId(id);
        if (id) {
            loadData(id);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-heading tracking-tight">System <span className="text-gradient">Analytics</span></h1>
                    <p className="text-muted mt-1">Real-time performance and cost monitoring across your gateways.</p>
                </div>
                <div className="flex items-center gap-3">
                    <ProjectSelector
                        projects={projects}
                        selectedId={selectedProjectId}
                        onSelect={handleProjectChange}
                        accentColor="blue"
                    />
                    <div className="flex items-center gap-2 bg-glass-bg border border-glass-border p-1 rounded-xl h-9">
                        <button className="px-4 py-1.5 text-[10px] font-bold rounded-lg bg-accent-blue text-white shadow-lg shadow-accent-blue/20 transition-all uppercase tracking-wider">Last 30 Days</button>
                    </div>
                </div>
            </div>

            {!selectedProjectId ? (
                <div className="glass-card p-12 text-center flex flex-col items-center gap-6 border-dashed">
                    <div className="w-16 h-16 rounded-full bg-accent-blue/10 flex items-center justify-center border border-accent-blue/20">
                        <BarChart3 className="w-8 h-8 text-accent-blue" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Select a project to view analytics</h2>
                        <p className="text-muted text-sm mt-1 max-w-sm mx-auto">Detailed metrics are specific to each gateway project. Choose one from the dropdown to begin monitoring.</p>
                    </div>
                </div>
            ) : (
                <div className={clsx("space-y-6 transition-opacity duration-300", loading ? "opacity-40 pointer-events-none" : "opacity-100")}>
                    {/* First Row: Requests & Tokens */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatsCard
                            title="Total Requests"
                            value={summary?.totalRequests || 0}
                            icon={Activity}
                            color="blue"
                        />
                        <StatsCard
                            title="Input Tokens"
                            value={summary?.totalPromptTokens?.toLocaleString() || 0}
                            icon={MessageSquare}
                            color="blue"
                        />
                        <StatsCard
                            title="Output Tokens"
                            value={summary?.totalCompletionTokens?.toLocaleString() || 0}
                            icon={MessageCircle}
                            color="green"
                        />
                    </div>

                    {/* Second Row: Cost, Latency, Security */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatsCard
                            title="Total Estimated Cost"
                            value={`$${(summary?.totalCost || 0).toFixed(4)}`}
                            icon={DollarSign}
                            color="green"
                        />
                        <StatsCard
                            title="Avg Latency"
                            value={`${Math.round(summary?.avgLatency || 0)}ms`}
                            icon={Clock}
                            color="purple"
                        />
                        <StatsCard
                            title="Security Events"
                            value={summary?.securityEvents || 0}
                            icon={ShieldAlert}
                            color="red"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="glass-card p-6 border-glass-border">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-accent-blue" /> Request Volume
                            </h3>
                            <UsageChart data={usage} type="requests" />
                        </div>
                        <div className="glass-card p-6 border-glass-border">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-500" /> Cost Over Time
                            </h3>
                            <UsageChart data={usage} type="cost" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
