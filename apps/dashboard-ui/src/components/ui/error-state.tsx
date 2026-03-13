import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className
}: ErrorStateProps) {
  return (
    <div className={cn(
      "glass-card border-red-500/20 bg-red-500/5 py-12 text-center",
      className
    )}>
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-red-400">{title}</h3>
          <p className="text-muted text-sm">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
