'use client';

import React, { useEffect, useState } from 'react';
import { Activity, DollarSign, Clock, ShieldAlert, BarChart3, ChevronRight } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { UsageChart } from '@/components/dashboard/usage-chart';
import { getAnalyticsSummary, getUsageData } from '../actions';
import { fetchGateway } from '@/utils/api';
import { Project } from '@ms-gateway/db';

export default function AnalyticsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [summary, setSummary] = useState<any>(null);
    const [usage, setUsage] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch all projects initially to let user select
        const loadProjects = async () => {
            try {
                // In a real app, we'd get the session here or from a provider
                // For now, let's assume we can fetch projects (simplified)
                const res = await fetch('/api/dashboard/projects'); // Need a client-safe way or pass from server
                // But since this is a client component, let's use a server action if possible
            } catch (err) {}
        };
        // loadProjects();
    }, []);

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
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Placeholder project select effect
    useEffect(() => {
        // If we had a project, we'd load it. For now, let's assume a dummy ID or prompt selection
    }, []);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-heading tracking-tight">System <span className="text-gradient">Analytics</span></h1>
                    <p className="text-muted mt-1">Real-time performance and cost monitoring across your gateways.</p>
                </div>
                <div className="flex items-center gap-2 bg-glass-bg border border-glass-border p-1 rounded-xl">
                    <button className="px-4 py-1.5 text-xs font-bold rounded-lg bg-accent-blue text-white shadow-lg shadow-accent-blue/20 transition-all">Last 30 Days</button>
                    <button className="px-4 py-1.5 text-xs font-bold rounded-lg text-muted hover:text-white transition-all">Last 7 Days</button>
                </div>
            </div>

            {/* If no project selected, show a nudge or project list */}
            {!selectedProjectId ? (
                <div className="glass-card p-12 text-center flex flex-col items-center gap-6 border-dashed">
                    <div className="w-16 h-16 rounded-full bg-accent-blue/10 flex items-center justify-center border border-accent-blue/20">
                        <BarChart3 className="w-8 h-8 text-accent-blue" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Select a project to view analytics</h2>
                        <p className="text-muted text-sm mt-1 max-w-sm mx-auto">Detailed metrics are specific to each gateway project. Choose one from your dashboard to begin monitoring usage and costs.</p>
                    </div>
                    <a href="/dashboard" className="bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue px-6 py-2.5 rounded-xl border border-accent-blue/30 font-bold transition-all flex items-center gap-2">
                        Go to Projects <ChevronRight className="w-4 h-4" />
                    </a>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatsCard 
                            title="Total Requests" 
                            value={summary?.totalRequests || 0} 
                            icon={Activity} 
                            color="blue"
                            trend={{ value: "+12.5%", positive: true }} 
                        />
                        <StatsCard 
                            title="Total Estimated Cost" 
                            value={`$${(summary?.totalCost || 0).toFixed(4)}`} 
                            icon={DollarSign} 
                            color="green"
                            trend={{ value: "+2.1%", positive: true }} 
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
                            trend={{ value: "-5%", positive: true }} 
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-accent-blue" /> Request Volume
                            </h3>
                            <UsageChart data={usage} type="requests" />
                        </div>
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-500" /> Cost Over Time
                            </h3>
                            <UsageChart data={usage} type="cost" />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
