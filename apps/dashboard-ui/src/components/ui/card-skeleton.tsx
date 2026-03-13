import React from 'react';

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 3 }: CardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-glass-bg border border-glass-border" />
            <div className="w-16 h-5 rounded-full bg-glass-bg border border-glass-border" />
          </div>
          <div className="space-y-2 mb-6">
            <div className="h-5 w-3/4 bg-glass-bg border border-glass-border rounded" />
            <div className="h-4 w-full bg-glass-bg border border-glass-border rounded" />
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-glass-border pt-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="space-y-1">
                <div className="h-3 w-8 bg-glass-bg border border-glass-border rounded" />
                <div className="h-4 w-10 bg-glass-bg border border-glass-border rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
