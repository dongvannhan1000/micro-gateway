import React from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface EmptyStateProps {
    icon?: keyof typeof LucideIcons | React.ComponentType<any>;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick?: () => void;
        href?: string;
        variant?: 'primary' | 'secondary';
    };
    className?: string;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className
}: EmptyStateProps) {
    let IconComponent: any = null;
    if (icon) {
        if (typeof icon === 'string' && LucideIcons[icon as keyof typeof LucideIcons]) {
            IconComponent = LucideIcons[icon as keyof typeof LucideIcons];
        } else if (typeof icon === 'function' || typeof icon === 'object') {
            // If a component is passed directly (only works in Client Components)
            IconComponent = icon;
        }
    }

    const buttonClasses = cn(
        "px-6 py-3 rounded-xl font-medium transition-all inline-block",
        action?.variant === 'primary'
            ? "bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue border border-accent-blue/30"
            : "glass hover:bg-glass-bg"
    );

    return (
        <div className={cn(
            "glass-card border-dashed py-16 text-center",
            className
        )}>
            <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
                {IconComponent && (
                    <div className="w-20 h-20 rounded-2xl bg-glass-bg flex items-center justify-center border border-glass-border text-muted">
                        <IconComponent className="w-10 h-10" />
                    </div>
                )}
                <div className="space-y-2">
                    <h3 className="text-xl font-bold">{title}</h3>
                    <p className="text-muted text-sm">{description}</p>
                </div>
                {action && (
                    <>
                        {action.href ? (
                            <Link href={action.href} className={buttonClasses}>
                                {action.label}
                            </Link>
                        ) : action.onClick ? (
                            <button
                                onClick={action.onClick}
                                className={buttonClasses}
                            >
                                {action.label}
                            </button>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}
