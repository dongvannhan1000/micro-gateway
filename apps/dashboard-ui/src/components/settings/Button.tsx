'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

export function Button({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    icon,
    children,
    className,
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-accent-blue text-white hover:scale-[1.02] shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40',
        secondary: 'bg-glass-bg text-white border border-glass-border hover:bg-glass-border',
        danger: 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20',
        ghost: 'text-muted hover:text-white hover:bg-glass-bg'
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-6 py-2 text-sm',
        lg: 'px-8 py-3 text-base'
    };

    return (
        <button
            className={cn(
                baseStyles,
                variants[variant],
                sizes[size],
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                icon && <span className="w-4 h-4">{icon}</span>
            )}
            {children}
        </button>
    );
}
