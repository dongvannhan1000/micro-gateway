import { createClient } from '@/utils/supabase/server';
import { fetchGateway } from '@/utils/api';
import { Project, ApiKey } from '@ms-gateway/db';
import { NewKeyModal } from '@/components/NewKeyModal';
import { RevokeKeyButton } from '@/components/RevokeKeyButton';
import { ModelAliasingModal } from '@/components/ModelAliasingModal';
import {
    Key,
    Settings,
    Activity,
    ShieldCheck,
    ArrowLeft,
    Plus,
    Trash2,
    ExternalLink,
    Copy,
    ChevronRight,
    DollarSign,
    Clock
} from 'lucide-react';
import Link from 'next/link';

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    let project: Project | null = null;
    let apiKeys: ApiKey[] = [];
    let providerConfigs: any[] = [];

    if (token) {
        try {
            project = await fetchGateway(`/api/projects/${id}`, token);
            apiKeys = await fetchGateway(`/api/projects/${id}/keys`, token);
            providerConfigs = await fetchGateway(`/api/projects/${id}/provider-configs`, token);
        } catch (e) {
            console.error('Failed to fetch data:', e);
        }
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <h2 className="text-xl font-bold">Project not found</h2>
                <Link href="/dashboard" className="text-accent-blue hover:underline flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col gap-4">
                <Link href="/dashboard" className="text-muted hover:text-white flex items-center gap-1 text-sm transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4" /> Back to projects
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                        <p className="text-muted mt-1">{project.description || 'Project Overview'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/dashboard/projects/${id}/settings`}
                            className="glass border-glass-border px-4 py-2 text-sm font-medium hover:bg-glass-bg rounded-lg transition-all flex items-center gap-2"
                        >
                            <Settings className="w-4 h-4" /> Settings
                        </Link>
                        <NewKeyModal projectId={id} />
                    </div>
                </div>
            </div>

            {/* Stats Quick View */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Requests (24h)', value: '0', icon: Activity, color: 'text-accent-blue' },
                    { label: 'Total Cost', value: '$0.00', icon: DollarSign, color: 'text-green-400' },
                    { label: 'Avg Latency', value: '0ms', icon: Clock, color: 'text-accent-violet' },
                    { label: 'Security Blocks', value: '0', icon: ShieldCheck, color: 'text-red-400' },
                ].map((stat, i) => (
                    <div key={i} className="glass-card flex items-center gap-4 py-4">
                        <div className={cn("p-2 rounded-lg bg-glass-bg border border-glass-border", stat.color)}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-muted tracking-wider">{stat.label}</p>
                            <p className="text-xl font-bold">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: API Keys Table */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Key className="w-5 h-5 text-accent-blue" /> API Keys
                        </h2>
                    </div>
                    <div className="glass overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-glass-bg/50 border-b border-glass-border">
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Name</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Key Hint</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Usage</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-glass-border">
                                {apiKeys.length > 0 ? apiKeys.map((key) => (
                                    <tr key={key.id} className="hover:bg-glass-bg/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium">{key.name}</div>
                                            <div className="text-[10px] text-muted">Created {new Date(key.created_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="bg-glass-bg px-2 py-1 rounded text-accent-blue text-xs">{key.key_hint}</code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold">$0.00</div>
                                            <div className="text-[10px] text-muted">Limit: ${key.monthly_limit_usd.toFixed(2)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <RevokeKeyButton projectId={id} keyId={key.id} keyName={key.name} />
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-muted text-sm">
                                            No API keys created for this project.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Project Settings / Aliasing Preview */}
                <div className="glass-card">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-accent-blue" />
                        Active Providers
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {providerConfigs.length > 0 ? providerConfigs.map((p) => (
                            <div key={p.provider} className="flex items-center gap-2 px-3 py-1 bg-accent-blue/10 rounded-full border border-accent-blue/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue shadow-[0_0_8px_rgba(77,159,255,0.5)]"></span>
                                <span className="text-[10px] text-accent-blue font-bold uppercase tracking-widest">{p.provider === 'google' ? 'Gemini' : p.provider}</span>
                            </div>
                        )) : (
                            <div className="text-[10px] text-muted italic p-2 border border-dashed border-glass-border rounded-lg w-full text-center">
                                No providers configured. Go to Settings.
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass-card border-accent-blue/20 bg-accent-blue/5">
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-accent-blue" /> Gateway Endpoint
                    </h3>
                    <p className="text-xs text-muted mb-4">Use this base URL in your OpenAI SDK.</p>
                    <div className="bg-background/50 p-3 rounded-lg border border-glass-border flex items-center justify-between group">
                        <code className="text-[11px] text-accent-blue truncate">https://gw.com/v1</code>
                        <button className="text-muted hover:text-white transition-colors p-1">
                            <Copy className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div className="glass-card">
                    <h3 className="font-bold mb-4 flex items-center justify-between">
                        <span>Model Aliasing</span>
                        <span className="text-[10px] bg-accent-violet/10 text-accent-violet px-2 py-0.5 rounded border border-accent-violet/20 uppercase font-bold tracking-tighter">Active</span>
                    </h3>
                    <div className="space-y-4">
                        {project.model_aliases ? (
                            Object.entries(JSON.parse(project.model_aliases)).map(([orig, target]: any) => (
                                <div key={orig} className="flex items-center justify-between bg-glass-bg p-3 rounded-xl border border-glass-border">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-muted uppercase font-bold">Request</span>
                                        <span className="text-xs font-medium">{orig}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted" />
                                    <div className="flex flex-col text-right">
                                        <span className="text-[10px] text-muted uppercase font-bold">Route To</span>
                                        <span className="text-xs font-bold text-accent-violet">{target}</span>
                                    </div>
                                </div>
                            ))
                        ) : null}
                        <div className="text-center py-2 space-y-2">
                            {!project.model_aliases && <p className="text-xs text-muted italic mb-2">No model aliases configured.</p>}
                            <ModelAliasingModal projectId={id} currentAliases={project.model_aliases} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' '); }
