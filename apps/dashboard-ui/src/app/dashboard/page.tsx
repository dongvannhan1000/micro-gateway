import { createClient } from '@/utils/supabase/server';
import { fetchGateway } from '@/utils/api';
import { Project } from '@ms-gateway/db';
import Link from 'next/link';
import { Plus, Folder, ArrowRight, Activity, DollarSign, Clock } from 'lucide-react';
import { NewProjectModal } from '@/components/NewProjectModal';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const token = session?.access_token;
    let projects: Project[] = [];

    if (token) {
        try {
            projects = await fetchGateway('/api/projects', token);
        } catch (e) {
            console.error('Failed to fetch projects:', e);
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Your <span className="text-gradient">Projects</span></h1>
                    <p className="text-muted mt-1">Manage and monitor your AI gateways</p>
                </div>
                <NewProjectModal />
            </div>

            <div className="grid grid-cols-1 md://grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.length > 0 ? (
                    projects.map((project) => (
                        <Link
                            key={project.id}
                            href={`/dashboard/projects/${project.id}`}
                            className="glass-card hover:border-accent-blue/50 group block transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center border border-accent-blue/20">
                                    <Folder className="w-5 h-5 text-accent-blue" />
                                </div>
                                <div className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-500 uppercase">
                                    Active
                                </div>
                            </div>
                            <h3 className="font-bold text-lg mb-1 group-hover:text-accent-blue transition-colors">{project.name}</h3>
                            <p className="text-muted text-xs line-clamp-2 mb-6 h-8">{project.description || 'No description provided.'}</p>

                            <div className="grid grid-cols-3 gap-2 border-t border-glass-border pt-4 mt-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-wider text-muted font-medium flex items-center gap-1">
                                        <Activity className="w-3 h-3" /> Req
                                    </span>
                                    <span className="text-sm font-bold">{project.total_requests || 0}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-wider text-muted font-medium flex items-center gap-1">
                                        <DollarSign className="w-3 h-3" /> Cost
                                    </span>
                                    <span className="text-sm font-bold">${(project.total_cost || 0).toFixed(4)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-wider text-muted font-medium flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Latency
                                    </span>
                                    <span className="text-sm font-bold">{Math.round(project.avg_latency || 0)}ms</span>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center glass-card border-dashed">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-glass-bg flex items-center justify-center border border-glass-border text-muted">
                                <Plus className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">No projects yet</h3>
                                <p className="text-muted text-sm">Create your first gateway project to get started.</p>
                            </div>
                            <button className="mt-4 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue px-6 py-2 rounded-xl border border-accent-blue/30 font-medium transition-all">
                                Create First Project
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
