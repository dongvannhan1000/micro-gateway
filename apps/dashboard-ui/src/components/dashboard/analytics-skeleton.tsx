import React from 'react';

export function AnalyticsSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-glass-bg border border-glass-border rounded-lg" />
                    <div className="h-4 w-72 bg-glass-bg border border-glass-border rounded-lg" />
                </div>
                <div className="h-9 w-40 bg-glass-bg border border-glass-border rounded-xl" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-24 bg-glass-bg border border-glass-border rounded-2xl" />
                ))}
            </div>

            <div className="glass p-6 min-h-[400px] flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="h-6 w-32 bg-glass-bg border border-glass-border rounded" />
                    <div className="h-8 w-24 bg-glass-bg border border-glass-border rounded" />
                </div>
                <div className="flex-1 bg-glass-bg/20 rounded-xl" />
            </div>
        </div>
    );
}
