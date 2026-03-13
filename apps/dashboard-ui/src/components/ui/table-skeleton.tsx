import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="glass overflow-hidden animate-pulse">
      <div className="bg-glass-bg/50 border-b border-glass-border h-12" />
      <div className="divide-y divide-glass-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, j) => (
              <div key={j} className="flex-1">
                <div className="h-4 bg-glass-bg border border-glass-border rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
