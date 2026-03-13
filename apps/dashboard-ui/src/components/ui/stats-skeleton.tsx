import React from 'react';

interface StatsSkeletonProps {
  count?: number;
}

export function StatsSkeleton({ count = 4 }: StatsSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-6 animate-pulse">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="h-4 w-24 bg-glass-bg border border-glass-border rounded mb-2" />
              <div className="h-8 w-20 bg-glass-bg border border-glass-border rounded" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-glass-bg border border-glass-border" />
          </div>
        </div>
      ))}
    </div>
  );
}
