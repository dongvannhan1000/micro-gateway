'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export function SettingsSection({
    title,
    description,
    icon,
    children,
    className
}: SettingsSectionProps) {
    return (
        <div className={cn('glass-card p-6', className)}>
            <div className="flex items-center gap-3 mb-6">
                {icon && (
                    <div className="p-2 bg-glass-bg rounded-lg">
                        {icon}
                    </div>
                )}
                <div>
                    <h3 className="text-lg font-bold">{title}</h3>
                    {description && (
                        <p className="text-sm text-muted mt-1">{description}</p>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
}
