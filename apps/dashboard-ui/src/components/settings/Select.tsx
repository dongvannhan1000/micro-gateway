'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    helperText?: string;
    required?: boolean;
    className?: string;
}

export function Select({
    label,
    value,
    onChange,
    options,
    placeholder,
    disabled = false,
    error,
    helperText,
    required = false,
    className
}: SelectProps) {
    return (
        <div className={cn('space-y-2', className)}>
            {label && (
                <label className="text-sm font-bold flex items-center gap-1">
                    {label}
                    {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={cn(
                    'input-field appearance-none cursor-pointer',
                    'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23A0AEC0\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10',
                    error && 'border-red-500/50 focus:border-red-500',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((option) => (
                    <option
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                    >
                        {option.label}
                    </option>
                ))}
            </select>
            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}
            {helperText && !error && (
                <p className="text-xs text-muted">{helperText}</p>
            )}
        </div>
    );
}
