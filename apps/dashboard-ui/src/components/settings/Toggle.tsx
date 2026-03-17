'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
    id?: string;
}

export function Toggle({
    checked,
    onChange,
    label,
    disabled = false,
    className,
    id
}: ToggleProps) {
    return (
        <div className={cn('flex items-center gap-3', className)}>
            <button
                type="button"
                id={id}
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={cn(
                    'relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out',
                    'focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 focus:ring-offset-background',
                    checked ? 'bg-accent-blue' : 'bg-glass-bg border border-glass-border',
                    disabled && 'opacity-50 cursor-not-allowed',
                    !disabled && 'cursor-pointer'
                )}
            >
                <span
                    className={cn(
                        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ease-in-out',
                        checked && 'translate-x-5'
                    )}
                />
            </button>
            {label && (
                <label
                    htmlFor={id}
                    className={cn(
                        'text-sm font-medium',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                >
                    {label}
                </label>
            )}
        </div>
    );
}
