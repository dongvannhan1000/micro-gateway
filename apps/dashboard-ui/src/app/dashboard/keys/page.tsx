import { createClient } from '@/utils/supabase/server';
import { fetchGateway } from '@/utils/api';
import { Key, ExternalLink, Activity, DollarSign, Clock } from 'lucide-react';
import Link from 'next/link';

export default async function GlobalApiKeysPage() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    let apiKeys: any[] = [];

    if (token) {
        try {
            apiKeys = await fetchGateway('/api/gateway-keys', token);
        } catch (e) {
            console.error('Failed to fetch keys:', e);
        }
    }

    if (!token) {
        return <div className="p-8 text-center text-muted">Please log in to view keys.</div>;
    }

    return (
        <div className="space-y-8 pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Global Gateway Keys</h1>
                    <p className="text-muted mt-1">Manage all your MSGateway keys across all projects in one place.</p>
                </div>
            </div>

            <div className="glass overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-glass-bg/50 border-b border-glass-border">
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Key Name</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Project</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Key Hint</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted text-right">Usage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-glass-border">
                        {apiKeys.length > 0 ? apiKeys.map((key) => (
                            <tr key={key.id} className="hover:bg-glass-bg/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium flex items-center gap-2">
                                        {key.name}
                                        {key.status === 'active' ? (
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                        ) : (
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-muted">Created {new Date(key.created_at).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <Link
                                        href={`/dashboard/projects/${key.project_id}`}
                                        className="text-xs font-medium text-accent-blue hover:underline flex items-center gap-1"
                                    >
                                        {key.project_name} <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </td>
                                <td className="px-6 py-4">
                                    <code className="bg-glass-bg px-2 py-1 rounded text-accent-blue text-xs font-mono">{key.key_hint}</code>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="text-sm font-bold">${key.current_month_usage_usd.toFixed(2)}</div>
                                    <div className="text-[10px] text-muted">Monthly Limit: ${key.monthly_limit_usd.toFixed(2)}</div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-muted text-sm">
                                    No Gateway keys found. Create one within a project to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
