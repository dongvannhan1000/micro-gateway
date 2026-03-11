import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    trend?: {
        value: string;
        positive: boolean;
    };
    icon: LucideIcon;
    color: 'blue' | 'purple' | 'green' | 'red';
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, trend, icon: Icon, color }) => {
    const colorClasses = {
        blue: 'bg-accent-blue/10 border-accent-blue/20 text-accent-blue',
        purple: 'bg-accent-violet/10 border-accent-violet/20 text-accent-violet',
        green: 'bg-green-500/10 border-green-500/20 text-green-500',
        red: 'bg-red-500/10 border-red-500/20 text-red-500',
    };

    return (
        <div className="p-6 rounded-2xl border bg-background-light glass-morphism hover-glow transition-all">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-muted mb-1">{title}</p>
                    <h3 className="text-2xl font-bold font-heading">{value}</h3>
                    {trend && (
                        <p className={`text-xs mt-2 ${trend.positive ? 'text-green-500' : 'text-red-500'} font-medium`}>
                            {trend.value} <span className="text-muted ml-1">vs last month</span>
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-xl border ${colorClasses[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
};
