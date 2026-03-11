'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, Terminal, Clock, ExternalLink, Search, Filter } from 'lucide-react';
import { getSecurityLogs } from '../actions';
import { clsx } from 'clsx';

export default function SecurityPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState<string>(''); // Placeholder

    useEffect(() => {
        // In a real scenario, we'd pick the project from context or URL
        // loadLogs('dummy-id');
    }, []);

    const loadLogs = async (projectId: string) => {
        setLoading(true);
        try {
            const data = await getSecurityLogs(projectId);
            setLogs(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-heading tracking-tight">Security <span className="text-red-500">Logs</span></h1>
                    <p className="text-muted mt-1">Monitor blocked requests and prompt injection detection events.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-glass-bg border border-glass-border px-3 py-1.5 rounded-xl flex items-center gap-2">
                        <Search className="w-4 h-4 text-muted" />
                        <input type="text" placeholder="Search logs..." className="bg-transparent border-none text-xs focus:ring-0 w-32" />
                    </div>
                    <button className="p-2 bg-glass-bg border border-glass-border rounded-xl text-muted hover:text-white transition-all">
                        <Filter className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="glass overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-glass-bg/50 border-b border-glass-border">
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted font-heading">Event</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted font-heading">Model</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted font-heading">Injection Score</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted font-heading">Status</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted font-heading">Time</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted font-heading text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-glass-border">
                        {logs.length > 0 ? logs.map((log) => (
                            <tr key={log.id} className="hover:bg-glass-bg/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3 font-medium text-sm">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-lg flex items-center justify-center border",
                                            log.prompt_injection_score >= 0.7 ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-orange-500/10 border-orange-500/20 text-orange-500"
                                        )}>
                                            <ShieldAlert className="w-4 h-4" />
                                        </div>
                                        <span>{log.prompt_injection_score >= 0.7 ? 'Prompt Injection Blocked' : 'Suspicious Activity'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <code className="text-[10px] bg-glass-bg px-2 py-1 rounded text-accent-blue">{log.model}</code>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-glass-bg rounded-full overflow-hidden border border-glass-border">
                                            <div 
                                                className={clsx(
                                                    "h-full rounded-full transition-all",
                                                    log.prompt_injection_score >= 0.7 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                                                )}
                                                style={{ width: `${log.prompt_injection_score * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs font-bold">{Math.round(log.prompt_injection_score * 100)}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                                        log.status_code === 403 ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-green-500/10 border-green-500/20 text-green-500"
                                    )}>
                                        {log.status_code}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 text-xs text-muted">
                                        <Clock className="w-3 h-3" />
                                        {new Date(log.created_at).toLocaleTimeString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-muted hover:text-accent-blue transition-colors">
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <Terminal className="w-10 h-10 text-muted opacity-20" />
                                        <div className="text-muted text-sm font-medium italic">No security violations detected. Stay safe!</div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
