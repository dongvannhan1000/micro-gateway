'use client';

import React from 'react';
import { Shield, AlertTriangle, Clock } from 'lucide-react';

interface SecurityEvent {
    id: string;
    event_type: string;
    description: string;
    created_at: string;
    anomaly_score?: number;
}

interface SecurityEventsProps {
    events: SecurityEvent[];
    loading?: boolean;
}

const getSeverityLevel = (anomalyScore: number = 0): 'high' | 'medium' | 'low' => {
    if (anomalyScore > 0.8) return 'high';
    if (anomalyScore > 0.5) return 'medium';
    return 'low';
};

const severityConfig = {
    high: {
        bg: 'bg-red-500/20',
        text: 'text-red-500',
        border: 'border-red-500/30',
        icon: AlertTriangle,
        label: 'Critical'
    },
    medium: {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-500',
        border: 'border-yellow-500/30',
        icon: AlertTriangle,
        label: 'Warning'
    },
    low: {
        bg: 'bg-green-500/20',
        text: 'text-green-500',
        border: 'border-green-500/30',
        icon: Shield,
        label: 'Info'
    }
};

const formatRelativeTime = (dateString: string): string => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now.getTime() - past.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins} minute${diffInMins > 1 ? 's' : ''} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    return past.toLocaleDateString();
};

const truncateDescription = (description: string, maxLength: number = 80): string => {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
};

export function SecurityEvents({ events, loading = false }: SecurityEventsProps) {
    if (loading) {
        return (
            <div className="bg-glass-bg border border-glass-border rounded-xl p-6 animate-pulse">
                <div className="flex items-center justify-between mb-6">
                    <div className="h-6 w-48 bg-glass-border rounded" />
                    <div className="h-8 w-8 bg-glass-border rounded" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-20 bg-glass-border rounded" />
                    ))}
                </div>
            </div>
        );
    }

    if (!events || events.length === 0) {
        return (
            <div className="bg-glass-bg border border-glass-border rounded-xl p-12 text-center">
                <Shield className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-50" />
                <p className="text-muted">No security events detected</p>
                <p className="text-xs text-muted mt-2">Your gateway is operating normally</p>
            </div>
        );
    }

    // Show max 10 events, most recent first
    const displayEvents = events
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Security Events</h3>
                <div className="flex items-center gap-2 text-sm text-muted">
                    <Shield className="w-4 h-4" />
                    {events.length > 10 && `Showing 10 of ${events.length}`}
                </div>
            </div>

            <div className="space-y-3">
                {displayEvents.map((event) => {
                    const severity = getSeverityLevel(event.anomaly_score);
                    const config = severityConfig[severity];
                    const SeverityIcon = config.icon;

                    return (
                        <div
                            key={event.id}
                            className={`bg-glass-bg border ${config.border} rounded-lg p-4 hover:border-opacity-50 transition-all`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-lg ${config.bg} ${config.text} flex items-center justify-center flex-shrink-0`}>
                                    <SeverityIcon className="w-4 h-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className={`font-medium text-foreground text-sm`}>
                                            {event.event_type}
                                        </h4>
                                        <span className={`text-xs px-2 py-1 rounded ${config.bg} ${config.text} font-medium`}>
                                            {config.label}
                                        </span>
                                    </div>

                                    <p className="text-sm text-muted mb-2" title={event.description}>
                                        {truncateDescription(event.description)}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-muted">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatRelativeTime(event.created_at)}
                                        </div>
                                        {event.anomaly_score !== undefined && (
                                            <div>
                                                Score: {(event.anomaly_score * 100).toFixed(0)}%
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {events.length > 10 && (
                <div className="mt-4 text-center text-sm text-muted">
                    View all {events.length} events in the Security page
                </div>
            )}
        </div>
    );
}

export default SecurityEvents;
