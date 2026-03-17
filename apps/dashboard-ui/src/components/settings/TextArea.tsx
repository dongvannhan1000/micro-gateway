'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TextAreaProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    helperText?: string;
    required?: boolean;
    className?: string;
    rows?: number;
    maxLength?: number;
}

export function TextArea({
    label,
    value,
    onChange,
    placeholder,
    disabled = false,
    error,
    helperText,
    required = false,
    className,
    rows = 4,
    maxLength
}: TextAreaProps) {
    const currentLength = value.length;

    return (
        <div className={cn('space-y-2', className)}>
            {label && (
                <label className="text-sm font-bold flex items-center gap-1">
                    {label}
                    {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                rows={rows}
                maxLength={maxLength}
                className={cn(
                    'input-field resize-none',
                    error && 'border-red-500/50 focus:border-red-500',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            />
            <div className="flex items-center justify-between">
                <div>
                    {error && (
                        <p className="text-xs text-red-500">{error}</p>
                    )}
                    {helperText && !error && (
                        <p className="text-xs text-muted">{helperText}</p>
                    )}
                </div>
                {maxLength && (
                    <span className={cn(
                        'text-xs',
                        currentLength > maxLength * 0.9 ? 'text-red-500' : 'text-muted'
                    )}>
                        {currentLength}/{maxLength}
                    </span>
                )}
            </div>
        </div>
    );
}
