import React from 'react';

export function SecuritySkeleton() {
    return (
        <div className="space-y-6 lg:space-y-8 animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-glass-bg border border-glass-border rounded-lg" />
                    <div className="h-4 w-72 bg-glass-bg border border-glass-border rounded-lg" />
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-32 bg-glass-bg border border-glass-border rounded-xl" />
                    <div className="h-9 w-44 bg-glass-bg border border-glass-border rounded-xl" />
                </div>
            </div>

            <div className="glass overflow-hidden border-glass-border">
                <div className="bg-glass-bg/50 border-b border-glass-border h-12" />
                <div className="divide-y divide-glass-border overflow-x-auto">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="px-4 lg:px-6 py-4 lg:py-8 flex items-center justify-between gap-2 lg:gap-4 min-w-[600px]">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-8 h-8 rounded-lg bg-glass-bg border border-glass-border flex-shrink-0" />
                                <div className="h-4 w-32 lg:w-40 bg-glass-bg border border-glass-border rounded" />
                            </div>
                            <div className="h-4 w-20 lg:w-24 bg-glass-bg border border-glass-border rounded flex-1 hidden sm:block" />
                            <div className="h-6 w-16 lg:w-20 bg-glass-bg border border-glass-border rounded-full flex-1 hidden md:block" />
                            <div className="h-4 w-12 lg:w-16 bg-glass-bg border border-glass-border rounded flex-1 hidden md:block" />
                            <div className="h-4 w-20 lg:w-24 bg-glass-bg border border-glass-border rounded flex-1 hidden sm:block" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
