import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="p-4 rounded-2xl bg-accent-violet/10 border border-accent-violet/20">
                <BarChart3 className="w-12 h-12 text-accent-violet" />
            </div>
            <h1 className="text-2xl font-bold">Gateway Analytics</h1>
            <p className="text-muted text-center max-w-md">
                View detailed usage charts, cost breakdowns, and latency metrics.
                <br />
                <span className="text-accent-blue font-semibold">Coming in Sprint 2!</span>
            </p>
        </div>
    );
}
