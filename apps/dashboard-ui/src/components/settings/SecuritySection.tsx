'use client';

import React, { useState } from 'react';
import { Shield, Laptop, Trash2 } from 'lucide-react';
import { SettingsSection, Button, Toggle } from './index';

interface Session {
    id: string;
    device: string;
    browser: string;
    location: string;
    current: boolean;
    lastActive: string;
    ipAddress: string;
}

interface AuditLog {
    id: string;
    action: string;
    description: string;
    timestamp: string;
    ipAddress: string;
    status: 'success' | 'warning' | 'danger';
}

export function SecuritySection() {
    const [sessions, setSessions] = useState<Session[]>([
        {
            id: '1',
            device: 'MacBook Pro',
            browser: 'Chrome 120',
            location: 'San Francisco, US',
            current: true,
            lastActive: '2 minutes ago',
            ipAddress: '192.168.1.1'
        },
        {
            id: '2',
            device: 'iPhone 14',
            browser: 'Safari 17',
            location: 'San Francisco, US',
            current: false,
            lastActive: '2 hours ago',
            ipAddress: '192.168.1.2'
        }
    ]);

    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
        {
            id: '1',
            action: 'Password Changed',
            description: 'Password was successfully updated',
            timestamp: '2 hours ago',
            ipAddress: '192.168.1.1',
            status: 'success'
        },
        {
            id: '2',
            action: 'New Login',
            description: 'New login from iPhone 14',
            timestamp: '5 hours ago',
            ipAddress: '192.168.1.2',
            status: 'warning'
        },
        {
            id: '3',
            action: 'Failed Login Attempt',
            description: 'Invalid password entered',
            timestamp: '1 day ago',
            ipAddress: '203.0.113.1',
            status: 'danger'
        }
    ]);

    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    const revokeSession = async (sessionId: string) => {
        if (!confirm('Are you sure you want to revoke this session?')) return;

        setSessions(sessions.filter(s => s.id !== sessionId));
        // TODO: Implement when backend endpoint is ready
        // await revokeSession(token, sessionId);
    };

    const revokeAllSessions = async () => {
        if (!confirm('Are you sure you want to revoke all other sessions?')) return;

        setSessions(sessions.filter(s => s.current));
        // TODO: Implement when backend endpoint is ready
        // await revokeAllOtherSessions(token);
    };

    const getStatusColor = (status: AuditLog['status']) => {
        switch (status) {
            case 'success':
                return 'bg-green-500/10 text-green-500';
            case 'warning':
                return 'bg-yellow-500/10 text-yellow-500';
            case 'danger':
                return 'bg-red-500/10 text-red-500';
        }
    };

    return (
        <div className="space-y-6">
            <SettingsSection
                title="Active Sessions"
                description="Manage your active sessions across devices"
                icon={<Laptop className="w-5 h-5 text-accent-blue" />}
            >
                <div className="space-y-4">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className="flex items-center justify-between p-4 bg-glass-bg border border-glass-border rounded-xl hover:border-accent-blue/30 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-glass-bg rounded-lg">
                                    <Laptop className="w-5 h-5 text-accent-blue" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold">{session.device}</h4>
                                        {session.current && (
                                            <span className="px-2 py-0.5 text-xs font-medium bg-accent-blue/10 text-accent-blue rounded-full">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted">
                                        {session.browser} • {session.location}
                                    </p>
                                    <p className="text-xs text-muted mt-1">
                                        Last active: {session.lastActive} • IP: {session.ipAddress}
                                    </p>
                                </div>
                            </div>
                            {!session.current && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={<Trash2 className="w-4 h-4" />}
                                    onClick={() => revokeSession(session.id)}
                                >
                                    Revoke
                                </Button>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex justify-end pt-4 border-t border-glass-border">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={revokeAllSessions}
                    >
                        Revoke All Other Sessions
                    </Button>
                </div>

                {/* TODO: Fetch from /api/management/user/sessions when backend is ready */}
            </SettingsSection>

            <SettingsSection
                title="Two-Factor Authentication"
                description="Add an extra layer of security to your account"
                icon={<Shield className="w-5 h-5 text-accent-violet" />}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-bold">Two-Factor Authentication</h4>
                        <p className="text-sm text-muted mt-1">
                            {twoFactorEnabled
                                ? 'Your account is protected with 2FA'
                                : 'Enable 2FA to secure your account'}
                        </p>
                    </div>
                    <Toggle
                        checked={twoFactorEnabled}
                        onChange={setTwoFactorEnabled}
                    />
                </div>

                {twoFactorEnabled && (
                    <div className="mt-4 p-4 bg-glass-bg border border-glass-border rounded-xl space-y-3">
                        <p className="text-sm text-muted">
                            Use your authenticator app to generate codes when signing in.
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter 6-digit code"
                                className="input-field flex-1"
                                maxLength={6}
                            />
                            <Button size="sm">Verify</Button>
                        </div>
                    </div>
                )}

                {/* TODO: Implement 2FA when backend is ready */}
            </SettingsSection>

            <SettingsSection
                title="Security Audit Log"
                description="Recent security events and account activity"
                icon={<Shield className="w-5 h-5 text-accent-violet" />}
            >
                <div className="space-y-3">
                    {auditLogs.map((log) => (
                        <div
                            key={log.id}
                            className="flex items-start gap-4 p-4 bg-glass-bg border border-glass-border rounded-xl hover:border-accent-blue/30 transition-colors"
                        >
                            <div className={`p-2 rounded-lg ${getStatusColor(log.status)}`}>
                                <Shield className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold">{log.action}</h4>
                                    <span className="text-xs text-muted">{log.timestamp}</span>
                                </div>
                                <p className="text-sm text-muted mt-1">{log.description}</p>
                                <p className="text-xs text-muted mt-1">IP: {log.ipAddress}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center pt-4 border-t border-glass-border">
                    <Button variant="ghost" size="sm">
                        Load More Activity
                    </Button>
                </div>

                {/* TODO: Fetch from /api/management/user/audit-logs when backend is ready */}
            </SettingsSection>
        </div>
    );
}
