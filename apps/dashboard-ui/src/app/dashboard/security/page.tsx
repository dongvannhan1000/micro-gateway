import React, { Suspense } from 'react';
import { getSecurityLogs, getProjects } from '../actions';
import { SecurityLogViewer } from './log-viewer';
import { SecuritySkeleton } from '@/components/dashboard/security-skeleton';

export default async function SecurityPage(props: { searchParams: Promise<{ projectId?: string }> }) {
    const searchParams = await props.searchParams;
    
    return (
        <Suspense fallback={<SecuritySkeleton />}>
            <SecurityContent initialProjectId={searchParams.projectId} />
        </Suspense>
    );
}

async function SecurityContent({ initialProjectId }: { initialProjectId?: string }) {
    const projects = await getProjects();
    
    // Choose initial ID: query param OR first project OR empty
    const selectedId = initialProjectId || (projects.length > 0 ? projects[0].id : '');
    
    let initialLogs: any[] = [];
    if (selectedId) {
        initialLogs = await getSecurityLogs(selectedId);
    }
    
    return (
        <SecurityLogViewer 
            initialLogs={initialLogs} 
            projects={projects} 
            initialProjectId={selectedId} 
        />
    );
}
