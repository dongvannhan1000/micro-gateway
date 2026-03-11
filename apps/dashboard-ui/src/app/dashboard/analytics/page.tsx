import React, { Suspense } from 'react';
import { getAnalyticsSummary, getUsageData, getProjects } from '../actions';
import { AnalyticsViewer } from './analytics-viewer';
import { AnalyticsSkeleton } from '@/components/dashboard/analytics-skeleton';

export default async function AnalyticsPage(props: { searchParams: Promise<{ projectId?: string }> }) {
    const searchParams = await props.searchParams;
    
    return (
        <Suspense fallback={<AnalyticsSkeleton />}>
            <AnalyticsContent initialProjectId={searchParams.projectId} />
        </Suspense>
    );
}

async function AnalyticsContent({ initialProjectId }: { initialProjectId?: string }) {
    const projects = await getProjects();
    const selectedId = initialProjectId || (projects.length > 0 ? projects[0].id : '');
    
    let initialSummary = null;
    let initialUsage: any[] = [];
    
    if (selectedId) {
        [initialSummary, initialUsage] = await Promise.all([
            getAnalyticsSummary(selectedId),
            getUsageData(selectedId)
        ]);
    }
    
    return (
        <AnalyticsViewer 
            initialSummary={initialSummary}
            initialUsage={initialUsage}
            projects={projects}
            initialProjectId={selectedId}
        />
    );
}
