import { createClient } from '@/utils/supabase/server';
import { fetchGateway } from '@/utils/api';
import { Project, GatewayKey } from '@ms-gateway/db';
import { NewKeyModal } from '@/components/NewKeyModal';
import { RevokeKeyButton } from '@/components/RevokeKeyButton';
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
import { EmptyState } from '@/components/ui/empty-state';

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' '); }

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    let project: Project | null = null;
    let apiKeys: GatewayKey[] = [];
    let providerConfigs: any[] = [];

    if (token) {
        try {
            project = await fetchGateway(`/api/projects/${id}`, token);
            apiKeys = await fetchGateway(`/api/projects/${id}/gateway-keys`, token);
            providerConfigs = await fetchGateway(`/api/projects/${id}/provider-configs`, token);
        } catch (e) {
            console.error('Failed to fetch data:', e);
        }
    }

    if (!project) {
        return (
            <EmptyState
                icon="Activity"
                title="Project not found"
                description="The project you're looking for doesn't exist or you don't have access to it."
                action={{
                    label: 'Back to Projects',
                    href: '/dashboard',
                    variant: 'secondary'
                }}
            />
        );
    }

    return (
        <div className="space-y-6 lg:space-y-8 pb-12">
            <div className="flex flex-col gap-4">
                <Link href="/dashboard" className="text-muted hover:text-white flex items-center gap-1 text-sm transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4" /> Back to projects
                </Link>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{project.name}</h1>
                        <p className="text-muted mt-1 text-sm lg:text-base">{project.description || 'Project Overview'}</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link
                            href={`/dashboard/projects/${id}/settings`}
                            className="glass border-glass-border px-3 lg:px-4 py-2 text-sm font-medium hover:bg-glass-bg rounded-lg transition-all flex items-center gap-2"
                        >
                            <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Settings</span>
                        </Link>
                        <NewKeyModal projectId={id} />
                    </div>
                </div>
            </div>

            {/* Stats Quick View - Mobile Responsive */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {[
                    { label: 'Requests', value: (project.total_requests || 0).toLocaleString(), icon: Activity, color: 'text-accent-blue', href: `/dashboard/analytics?projectId=${id}` },
                    { label: 'Total Cost', value: `$${(project.total_cost || 0).toFixed(4)}`, icon: DollarSign, color: 'text-green-400', href: `/dashboard/analytics?projectId=${id}` },
                    { label: 'Avg Latency', value: `${Math.round(project.avg_latency || 0)}ms`, icon: Clock, color: 'text-accent-violet', href: `/dashboard/analytics?projectId=${id}` },
                    { label: 'Security Blocks', value: (project.security_events || 0).toString(), icon: ShieldCheck, color: 'text-red-400', href: `/dashboard/security?projectId=${id}` },
                ].map((stat, i) => (
                    <Link key={i} href={stat.href} className="glass-card flex items-center gap-3 py-3 lg:py-4 hover:bg-glass-bg/50 transition-all cursor-pointer">
                        <div className={cn("p-2 rounded-lg bg-glass-bg border border-glass-border flex-shrink-0", stat.color)}>
                            <stat.icon className="w-4 h-4 lg:w-5 lg:h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] lg:text-[10px] uppercase font-bold text-muted tracking-wider truncate">{stat.label}</p>
                            <p className="text-base lg:text-xl font-bold truncate">{stat.value}</p>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Left: API Keys Table */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg lg:text-xl font-bold flex items-center gap-2">
                            <Key className="w-4 h-4 lg:w-5 lg:h-5 text-accent-blue" /> Gateway Keys
                        </h2>
                    </div>

                    {/* Mobile-friendly table container */}
                    <div className="glass overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-glass-bg/50 border-b border-glass-border">
                                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-xs font-bold uppercase tracking-wider text-muted">Name</th>
                                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-xs font-bold uppercase tracking-wider text-muted">Key Hint</th>
                                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-xs font-bold uppercase tracking-wider text-muted">Usage</th>
                                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-xs font-bold uppercase tracking-wider text-muted text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-glass-border">
                                    {apiKeys.length > 0 ? apiKeys.map((key) => (
                                        <tr key={key.id} className="hover:bg-glass-bg/30 transition-colors">
                                            <td className="px-4 lg:px-6 py-3 lg:py-4">
                                                <div className="font-medium truncate text-sm">{key.name}</div>
                                                <div className="text-[10px] text-muted">Created {new Date(key.created_at).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-4 lg:px-6 py-3 lg:py-4">
                                                <code className="bg-glass-bg px-2 py-1 rounded text-accent-blue text-xs">{key.key_hint}</code>
                                            </td>
                                            <td className="px-4 lg:px-6 py-3 lg:py-4">
                                                <div className="text-sm font-bold">${key.current_month_usage_usd.toFixed(4)}</div>
                                                <div className="text-[10px] text-muted">Limit: ${key.monthly_limit_usd.toFixed(2)}</div>
                                            </td>
                                            <td className="px-4 lg:px-6 py-3 lg:py-4 text-right">
                                                <RevokeKeyButton projectId={id} keyId={key.id} keyName={key.name} />
                                            </td>
                                        </tr>
                                    )) : null}
                                </tbody>
                            </table>
                        </div>

                        {apiKeys.length === 0 && (
                            <div className="px-4 lg:px-6 py-8 lg:py-12 text-center text-muted text-sm">
                                <p className="mb-4">No Gateway keys created for this project yet.</p>
                                <p className="text-xs">Click "New Key" above to create your first gateway key.</p>
                            </div>
                        )}
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
                        <code className="text-[11px] text-accent-blue truncate flex-1">https://gw.com/v1</code>
                        <button className="text-muted hover:text-white transition-colors p-1 flex-shrink-0 ml-2">
                            <Copy className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div className="glass-card">
                    <h3 className="font-bold mb-4 flex items-center justify-between">
                        <span>Model Aliasing</span>
                        <span className="text-[10px] bg-accent-violet/10 text-accent-violet px-2 py-0.5 rounded border border-accent-violet/20 uppercase font-bold tracking-tighter">Active</span>
                    </h3>
                    <div className="space-y-3">
                        {project.model_aliases ? (
                            Object.entries(JSON.parse(project.model_aliases)).map(([orig, target]: any) => (
                                <div key={orig} className="flex items-center justify-between bg-glass-bg p-3 rounded-xl border border-glass-border">
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-[10px] text-muted uppercase font-bold">Request</span>
                                        <span className="text-xs font-medium truncate">{orig}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted flex-shrink-0 mx-2" />
                                    <div className="flex flex-col flex-1 min-w-0 text-right">
                                        <span className="text-[10px] text-muted uppercase font-bold">Route To</span>
                                        <span className="text-xs font-bold text-accent-violet truncate">{target}</span>
                                    </div>
                                </div>
                            ))
                        ) : null}
                        <div className="text-center py-2 space-y-2">
                            {!project.model_aliases && <p className="text-xs text-muted italic mb-2">No model aliases configured.</p>}
                            <Link
                                href={`/dashboard/projects/${id}/settings?tab=aliases`}
                                className="text-[10px] text-accent-blue hover:underline uppercase font-bold tracking-wider inline-flex items-center gap-1"
                            >
                                Configure Aliasing <Settings className="w-3 h-3" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
