import React, { Suspense } from 'react';
import { getAlertRules, getProjects } from '../actions';
import { AlertViewer } from './alert-viewer';

export default async function AlertsPage(props: { searchParams: Promise<{ projectId?: string }> }) {
    const searchParams = await props.searchParams;
    
    return (
        <Suspense fallback={<div className="animate-pulse space-y-8">
            <div className="h-10 bg-glass-bg w-1/4 rounded-xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1,2,3].map(i => <div key={i} className="h-40 bg-glass-bg rounded-2xl"></div>)}
            </div>
        </div>}>
            <AlertsContent initialProjectId={searchParams.projectId} />
        </Suspense>
    );
}

async function AlertsContent({ initialProjectId }: { initialProjectId?: string }) {
    const projects = await getProjects();
    const selectedId = initialProjectId || (projects.length > 0 ? projects[0].id : '');
    
    let initialRules: any[] = [];
    
    if (selectedId) {
        try {
            initialRules = await getAlertRules(selectedId);
        } catch (err) {
            console.error('Failed to fetch alert rules:', err);
        }
    }
    
    return (
        <AlertViewer 
            initialRules={initialRules}
            projects={projects}
            initialProjectId={selectedId}
        />
    );
}
