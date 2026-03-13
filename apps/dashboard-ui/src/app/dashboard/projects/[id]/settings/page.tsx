import { createClient } from '@/utils/supabase/server';
import { fetchGateway } from '@/utils/api';
import { Project } from '@ms-gateway/db';
import { ProjectSettingsForm } from './ProjectSettingsForm';
import { ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';

export default async function ProjectSettingsPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    let project: Project | null = null;
    let providerConfigs: any[] = [];

    if (token) {
        try {
            project = await fetchGateway(`/api/projects/${id}`, token);
            providerConfigs = await fetchGateway(`/api/projects/${id}/provider-configs`, token);
        } catch (e) {
            console.error('Failed to fetch settings data:', e);
        }
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <h1 className="text-xl font-bold">Project not found</h1>
                <Link href="/dashboard" className="text-accent-blue hover:underline">Return to dashboard</Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col gap-4">
                <Link
                    href={`/dashboard/projects/${id}`}
                    className="text-muted hover:text-white flex items-center gap-1 text-sm transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to project
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-glass-bg border border-glass-border">
                        <Settings className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Project Settings</h1>
                        <p className="text-muted mt-1">Configure your AI providers, aliases, and project metadata.</p>
                    </div>
                </div>
            </div>

            <ProjectSettingsForm
                projectId={id}
                projectName={project.name}
                projectDescription={project.description || ''}
                providers={providerConfigs}
                currentAliases={project.model_aliases}
                piiScrubbingLevel={project.pii_scrubbing_level || 'medium'}
                piiScrubbingEnabled={project.pii_scrubbing_enabled !== 0}
            />
        </div>
    );
}
