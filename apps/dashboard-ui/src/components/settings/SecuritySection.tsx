'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Laptop, Trash2, Plus, Key, Eye, AlertCircle } from 'lucide-react';
import { SettingsSection, Button, TextInput, Toggle } from './index';
import { createClient } from '@/utils/supabase/client';
import { getGatewayKeys, createGatewayKey, deleteGatewayKey } from '@/lib/user-api';

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

interface GatewayKey {
    id: string;
    name: string;
    prefix: string;
    key?: string; // Only shown on creation
    created_at: string;
    last_used: string | null;
    is_active: boolean;
}

export function SecuritySection() {
    const [currentProjectId, setCurrentProjectId] = useState<string>('');
    const [apiKeys, setApiKeys] = useState<GatewayKey[]>([]);
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

    const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [isLoadingKeys, setIsLoadingKeys] = useState(true);
    const [isCreatingKey, setIsCreatingKey] = useState(false);
    const [newKeyData, setNewKeyData] = useState<{ key: string; name: string } | null>(null);
    const [error, setError] = useState<string>('');

    // Load project ID and keys on mount
    useEffect(() => {
        async function loadData() {
            try {
                // Get project ID from localStorage
                const projectId = localStorage.getItem('currentProjectId') || '';
                setCurrentProjectId(projectId);

                if (!projectId) {
                    setError('No project selected. Please select a project first.');
                    setIsLoadingKeys(false);
                    return;
                }

                // Load gateway keys
                const supabase = await createClient();
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.access_token) {
                    const response = await getGatewayKeys(session.access_token, projectId);
                    if (response.keys) {
                        setApiKeys(response.keys);
                    }
                }
            } catch (err) {
                console.error('Failed to load gateway keys:', err);
                setError('Failed to load API keys. Please try again.');
            } finally {
                setIsLoadingKeys(false);
            }
        }

        loadData();
    }, []);

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

    const createApiKey = async () => {
        if (!newKeyName.trim() || !currentProjectId) return;

        setIsCreatingKey(true);
        setError('');

        try {
            const supabase = await createClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error('Not authenticated');
            }

            const response = await createGatewayKey(
                session.access_token,
                currentProjectId,
                { name: newKeyName }
            );

            if (response.key) {
                // Store the full key (only shown once)
                setNewKeyData({
                    key: response.key.key,
                    name: response.key.name
                });

                // Add key to list with prefix only
                setApiKeys([...apiKeys, response.key]);
                setNewKeyName('');
                setShowCreateKeyModal(false);
            }
        } catch (err) {
            console.error('Failed to create API key:', err);
            setError('Failed to create API key. Please try again.');
        } finally {
            setIsCreatingKey(false);
        }
    };

    const revokeApiKey = async (keyId: string) => {
        if (!confirm('Are you sure you want to revoke this API key?')) return;
        if (!currentProjectId) return;

        try {
            const supabase = await createClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error('Not authenticated');
            }

            await deleteGatewayKey(session.access_token, currentProjectId, keyId);
            setApiKeys(apiKeys.filter(k => k.id !== keyId));
        } catch (err) {
            console.error('Failed to revoke API key:', err);
            setError('Failed to revoke API key. Please try again.');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
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

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString();
    };

    const formatLastUsed = (dateString: string | null) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        return `${diffDays} days ago`;
    };

    return (
        <div className="space-y-6">
            {/* New Key Success Modal */}
            {newKeyData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                        onClick={() => setNewKeyData(null)}
                    />
                    <div className="glass-card w-full max-w-lg relative z-10 animate-fade-in shadow-2xl border-accent-blue/20 p-6 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-accent-blue/10 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-accent-blue" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold">Save Your API Key</h3>
                                <p className="text-sm text-muted mt-1">
                                    This key will only be shown once. Copy it now and store it securely.
                                </p>
                            </div>
                        </div>

                        <div className="p-3 bg-glass-bg border border-accent-blue/30 rounded-lg">
                            <p className="text-xs text-muted mb-2">Key Name: {newKeyData.name}</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 bg-background border border-glass-border rounded text-sm font-mono break-all">
                                    {newKeyData.key}
                                </code>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    icon={<Eye className="w-4 h-4" />}
                                    onClick={() => copyToClipboard(newKeyData.key)}
                                >
                                    Copy
                                </Button>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-glass-border">
                            <Button onClick={() => setNewKeyData(null)}>
                                I've Saved My Key
                            </Button>
                        </div>
                    </div>
                </div>
            )}

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
            </SettingsSection>

            <SettingsSection
                title="API Keys"
                description="Manage your API keys for programmatic access"
                icon={<Key className="w-5 h-5 text-accent-blue" />}
            >
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                        <p className="text-sm text-red-500">{error}</p>
                    </div>
                )}

                <div className="space-y-4">
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={() => setShowCreateKeyModal(true)}
                        disabled={!currentProjectId}
                    >
                        Create New API Key
                    </Button>

                    {isLoadingKeys ? (
                        <div className="space-y-3">
                            {[1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="p-4 bg-glass-bg border border-glass-border rounded-xl animate-pulse"
                                >
                                    <div className="h-4 bg-glass-border rounded w-1/3 mb-2"></div>
                                    <div className="h-3 bg-glass-border rounded w-1/4"></div>
                                </div>
                            ))}
                        </div>
                    ) : apiKeys.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-glass-border rounded-xl">
                            <Key className="w-12 h-12 text-muted mx-auto mb-3" />
                            <p className="text-muted">No API keys yet. Create your first key to get started.</p>
                        </div>
                    ) : (
                        apiKeys.map((key) => (
                            <div
                                key={key.id}
                                className="p-4 bg-glass-bg border border-glass-border rounded-xl space-y-3"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-bold">{key.name}</h4>
                                        <p className="text-sm text-muted">
                                            Created: {formatDate(key.created_at)}
                                        </p>
                                        <p className="text-xs text-muted">
                                            Last used: {formatLastUsed(key.last_used)}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        icon={<Trash2 className="w-3 h-3" />}
                                        onClick={() => revokeApiKey(key.id)}
                                    >
                                        Revoke
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-sm font-mono">
                                        {key.prefix}
                                    </code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        icon={<Eye className="w-3 h-3" />}
                                        onClick={() => copyToClipboard(key.prefix)}
                                        title="Copy prefix"
                                    >
                                        Copy
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Create API Key Modal */}
                {showCreateKeyModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                            onClick={() => setShowCreateKeyModal(false)}
                        />
                        <div className="glass-card w-full max-w-md relative z-10 animate-fade-in shadow-2xl border-accent-blue/20 p-6 space-y-4">
                            <h3 className="text-lg font-bold">Create New API Key</h3>
                            <TextInput
                                label="Key Name"
                                value={newKeyName}
                                onChange={setNewKeyName}
                                placeholder="e.g., Development Key"
                                required
                            />
                            <div className="flex justify-end gap-2 pt-4 border-t border-glass-border">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowCreateKeyModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    isLoading={isCreatingKey}
                                    onClick={createApiKey}
                                    disabled={!newKeyName.trim()}
                                >
                                    Create Key
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
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
