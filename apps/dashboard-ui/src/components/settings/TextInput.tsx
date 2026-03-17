'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TextInputProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel';
    disabled?: boolean;
    error?: string;
    helperText?: string;
    required?: boolean;
    className?: string;
    maxLength?: number;
    min?: number;
    max?: number;
    step?: number;
    icon?: React.ReactNode;
}

export function TextInput({
    label,
    value,
    onChange,
    placeholder,
    type = 'text',
    disabled = false,
    error,
    helperText,
    required = false,
    className,
    maxLength,
    min,
    max,
    step,
    icon
}: TextInputProps) {
    return (
        <div className={cn('space-y-2', className)}>
            {label && (
                <label className="text-sm font-bold flex items-center gap-1">
                    {label}
                    {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    maxLength={maxLength}
                    min={min}
                    max={max}
                    step={step}
                    className={cn(
                        'input-field',
                        icon && 'pl-10',
                        error && 'border-red-500/50 focus:border-red-500',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                />
            </div>
            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}
            {helperText && !error && (
                <p className="text-xs text-muted">{helperText}</p>
            )}
        </div>
    );
}
