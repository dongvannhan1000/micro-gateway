'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      "glass-card border-dashed py-16 text-center",
      className
    )}>
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
        {Icon && (
          <div className="w-20 h-20 rounded-2xl bg-glass-bg flex items-center justify-center border border-glass-border text-muted">
            <Icon className="w-10 h-10" />
          </div>
        )}
        <div className="space-y-2">
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-muted text-sm">{description}</p>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              "px-6 py-3 rounded-xl font-medium transition-all",
              action.variant === 'primary'
                ? "bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue border border-accent-blue/30"
                : "glass hover:bg-glass-bg"
            )}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
