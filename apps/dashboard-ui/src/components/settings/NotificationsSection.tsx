'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Mail, AlertTriangle, CheckCircle } from 'lucide-react';
import { SettingsSection, Toggle, Button } from './index';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/user-api';
import { createClient } from '@/utils/supabase/client';

interface NotificationPreferences {
    emailNotifications: boolean;
    securityAlerts: boolean;
    usageAlerts: boolean;
    usageThreshold: number;
}

export function NotificationsSection() {
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        emailNotifications: true,
        securityAlerts: true,
        usageAlerts: true,
        usageThreshold: 80
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const supabase = createClient();

    useEffect(() => {
        const fetchPreferences = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) {
                    setErrors({ form: 'Not authenticated' });
                    return;
                }
                const data = await getNotificationPreferences(session.access_token);
                setPreferences({
                    emailNotifications: data.emailNotifications ?? true,
                    securityAlerts: data.securityAlerts ?? true,
                    usageAlerts: data.usageAlerts ?? true,
                    usageThreshold: data.usageThreshold ?? 80
                });
            } catch (error) {
                console.error('Failed to load preferences:', error);
                setErrors({ form: 'Failed to load notification preferences' });
            } finally {
                setIsInitialLoading(false);
            }
        };
        fetchPreferences();
    }, [supabase]);

    const handleSave = async () => {
        setIsLoading(true);
        setSuccessMessage('');
        setErrors({});

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setErrors({ form: 'Not authenticated' });
                return;
            }

            await updateNotificationPreferences(session.access_token, preferences);
            setSuccessMessage('Notification preferences updated successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Failed to save preferences:', error);
            setErrors({ form: 'Failed to save notification preferences' });
        } finally {
            setIsLoading(false);
        }
    };

    const updatePreference = <K extends keyof NotificationPreferences>(
        key: K,
        value: NotificationPreferences[K]
    ) => {
        setPreferences({ ...preferences, [key]: value });
    };

    if (isInitialLoading) return (
        <div className="flex items-center justify-center py-12">
            <div className="text-muted">Loading notification preferences...</div>
        </div>
    );

    return (
        <div className="space-y-6">
            {errors.form && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-xl text-sm font-medium">
                    {errors.form}
                </div>
            )}
            {successMessage && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-500 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {successMessage}
                </div>
            )}

            <SettingsSection
                title="Email Notifications"
                description="Choose which email notifications you want to receive"
                icon={<Mail className="w-5 h-5 text-accent-blue" />}
            >
                <div className="space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-glass-border">
                        <div>
                            <h4 className="font-bold">Email Notifications</h4>
                            <p className="text-sm text-muted mt-1">
                                {preferences.emailNotifications
                                    ? 'Receive notifications via email'
                                    : 'Email notifications are disabled'}
                            </p>
                        </div>
                        <Toggle
                            checked={preferences.emailNotifications}
                            onChange={(checked) => updatePreference('emailNotifications', checked)}
                        />
                    </div>

                    <div className="space-y-4">
                        <NotificationItem
                            icon={<AlertTriangle className="w-4 h-4 text-yellow-500" />}
                            title="Security Alerts"
                            description="Get notified about security events and suspicious activity"
                            checked={preferences.securityAlerts}
                            onChange={(checked) => updatePreference('securityAlerts', checked)}
                            disabled={!preferences.emailNotifications}
                        />

                        <NotificationItem
                            icon={<Bell className="w-4 h-4 text-accent-blue" />}
                            title="Usage Alerts"
                            description="Receive alerts when approaching usage limits"
                            checked={preferences.usageAlerts}
                            onChange={(checked) => updatePreference('usageAlerts', checked)}
                            disabled={!preferences.emailNotifications}
                        />
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection
                title="Usage Alert Threshold"
                description="Set when to be alerted about usage limits"
                icon={<AlertTriangle className="w-5 h-5 text-accent-violet" />}
            >
                <div className="space-y-6">
                    <div className="text-center py-6">
                        <div className="text-4xl font-bold text-accent-blue mb-2">
                            {preferences.usageThreshold}%
                        </div>
                        <p className="text-sm text-muted">Alert me when usage reaches</p>
                    </div>

                    <div className="px-4">
                        <input
                            type="range"
                            min="50"
                            max="95"
                            step="5"
                            value={preferences.usageThreshold}
                            onChange={(e) => updatePreference('usageThreshold', parseInt(e.target.value))}
                            className="w-full h-2 bg-glass-bg rounded-lg appearance-none cursor-pointer accent-accent-blue"
                            disabled={!preferences.usageAlerts}
                        />
                        <div className="flex justify-between text-xs text-muted mt-2">
                            <span>50%</span>
                            <span>95%</span>
                        </div>
                    </div>

                    <div className="bg-glass-bg border border-glass-border rounded-xl p-4 space-y-3">
                        <h4 className="font-bold text-sm">Alert Settings</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted">Threshold:</span>
                                <span className="ml-2 font-medium">{preferences.usageThreshold}%</span>
                            </div>
                            <div>
                                <span className="text-muted">Frequency:</span>
                                <span className="ml-2 font-medium">Once per day</span>
                            </div>
                        </div>
                    </div>
                </div>
            </SettingsSection>

            <div className="flex justify-end">
                <Button
                    isLoading={isLoading}
                    onClick={handleSave}
                >
                    Save Preferences
                </Button>
            </div>
        </div>
    );
}

interface NotificationItemProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

function NotificationItem({ icon, title, description, checked, onChange, disabled }: NotificationItemProps) {
    return (
        <div className={`flex items-center justify-between p-4 rounded-xl transition-all ${
            disabled ? 'opacity-50' : 'hover:bg-glass-bg'
        }`}>
            <div className="flex items-center gap-4">
                <div className="p-2 bg-glass-bg rounded-lg">
                    {icon}
                </div>
                <div>
                    <h4 className="font-bold">{title}</h4>
                    <p className="text-sm text-muted mt-1">{description}</p>
                </div>
            </div>
            <Toggle
                checked={checked}
                onChange={onChange}
                disabled={disabled}
            />
        </div>
    );
}
