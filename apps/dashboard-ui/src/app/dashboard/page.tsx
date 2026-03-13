import { createClient } from '@/utils/supabase/server';
import { fetchGateway } from '@/utils/api';
import { Project } from '@ms-gateway/db';
import Link from 'next/link';
import { Plus, Folder, ArrowRight, Activity, DollarSign, Clock } from 'lucide-react';
import { NewProjectModal } from '@/components/NewProjectModal';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/card-skeleton';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const token = session?.access_token;
    let projects: Project[] = [];
    let isLoading = false;
    let error: string | null = null;

    if (token) {
        try {
            isLoading = true;
            projects = await fetchGateway('/api/projects', token);
        } catch (e) {
            console.error('Failed to fetch projects:', e);
            error = 'Failed to load projects. Please try again.';
        } finally {
            isLoading = false;
        }
    }

    return (
        <div className="space-y-6 lg:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Your <span className="text-gradient">Projects</span></h1>
                    <p className="text-muted mt-1 text-sm lg:text-base">Manage and monitor your AI gateways</p>
                </div>
                <NewProjectModal />
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    <CardSkeleton count={6} />
                </div>
            ) : error ? (
                <EmptyState
                    icon="Activity"
                    title="Unable to Load Projects"
                    description={error}
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
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
                                <h3 className="font-bold text-base lg:text-lg mb-1 group-hover:text-accent-blue transition-colors line-clamp-1">{project.name}</h3>
                                <p className="text-muted text-xs line-clamp-2 mb-6 h-8 lg:h-10">{project.description || 'No description provided.'}</p>

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
                        <div className="col-span-full">
                            <EmptyState
                                icon="Plus"
                                title="No projects yet"
                                description="Create your first gateway project to start monitoring your AI API usage and costs."
                                action={{
                                    label: 'Create First Project',
                                    href: '/dashboard?new=project',
                                    variant: 'primary'
                                }}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
