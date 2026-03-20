'use client';

import { useState } from 'react';
import { deleteProviderConfig, saveProviderConfig, updateProjectSettings } from '@/app/dashboard/actions';
import { AlertsTab } from '@/components/AlertsTab';
import {
    Loader2,
    ShieldCheck,
    Save,
    Globe,
    Cpu,
    Settings as SettingsIcon,
    Key,
    Info,
    Plus,
    Trash2,
    ArrowRight,
    Lock,
    Eye,
    EyeOff,
    RefreshCw,
    Bell
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type TabType = 'general' | 'providers' | 'aliases' | 'privacy' | 'alerts';

// API Key Input Component with Show/Hide Toggle
function ApiKeyInput({
    value,
    onChange,
    placeholder,
    disabled = false
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
}) {
    const [showKey, setShowKey] = useState(false);

    return (
        <div className="relative">
            <input
                type={showKey ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="input-field bg-background/30 font-mono pr-12"
                placeholder={placeholder}
                disabled={disabled}
                required
            />
            <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-accent-blue transition-colors p-1"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
            >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    );
}

export function ProjectSettingsForm({
    projectId,
    projectName,
    projectDescription,
    providers,
    currentAliases,
    piiScrubbingLevel,
    piiScrubbingEnabled,
    defaultTab,
    token
}: {
    projectId: string,
    projectName: string,
    projectDescription: string | null,
    providers: any[],
    currentAliases?: string,
    piiScrubbingLevel?: 'low' | 'medium' | 'high',
    piiScrubbingEnabled?: boolean,
    defaultTab?: TabType,
    token?: string
}) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>(defaultTab || 'general');
    const [isPending, setIsPending] = useState(false);

    // General Settings State
    const [name, setName] = useState(projectName);
    const [description, setDescription] = useState(projectDescription || '');

    // Provider Key State
    const [selectedProvider, setSelectedProvider] = useState('openai');
    const [providerKey, setProviderKey] = useState('');

    // Delete confirmation dialog state
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; provider: string }>({
        open: false,
        provider: '',
    });

    // Provider configuration
    const providers_config = [
        { id: 'openai', name: 'OpenAI', description: 'GPT-4, GPT-4o, o1 models' },
        { id: 'anthropic', name: 'Anthropic', description: 'Claude 3 Opus, Sonnet, Haiku' },
        { id: 'google', name: 'Google Gemini', description: 'Gemini 1.5, 2.0 Flash, Pro' },
        { id: 'deepseek', name: 'DeepSeek', description: 'DeepSeek Chat, Coder' },
        { id: 'groq', name: 'Groq', description: 'Llama, Mixtral, Gemma' },
        { id: 'together', name: 'Together AI', description: 'Open-source models' }
    ];

    // Aliases State - Convert backend object format {from: to} to UI array format [{from, to}]
    const [aliases, setAliases] = useState<any[]>(() => {
        try {
            if (!currentAliases) return [];
            const parsed = JSON.parse(currentAliases);

            // Convert object format to array format for UI
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                return Object.entries(parsed).map(([from, to]) => ({ from, to: String(to) }));
            }

            // Already in array format
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });

    // Privacy/PII State
    const [piiEnabled, setPiiEnabled] = useState(piiScrubbingEnabled ?? true);
    const [piiLevel, setPiiLevel] = useState<'low' | 'medium' | 'high'>(piiScrubbingLevel || 'medium');

    const handleUpdateMetadata = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPending(true);
        try {
            await updateProjectSettings(projectId, { name, description });
            router.refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setIsPending(false);
        }
    };

    const handleSaveProvider = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!providerKey) return;
        setIsPending(true);
        try {
            await saveProviderConfig(projectId, selectedProvider, providerKey);
            setProviderKey('');
            router.refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setIsPending(false);
        }
    };

    const handleDeleteProvider = async (provider: string) => {
        setDeleteDialog({ open: true, provider });
    };

    const confirmDeleteProvider = async () => {
        setIsPending(true);
        try {
            await deleteProviderConfig(projectId, deleteDialog.provider);
            setDeleteDialog({ open: false, provider: '' });
            router.refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setIsPending(false);
        }
    };

    const handleUpdateProvider = (provider: string) => {
        setSelectedProvider(provider);
        // Scroll to form
        document.getElementById('provider-key-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSaveAliases = async () => {
        setIsPending(true);
        try {
            // Convert array format [{from, to}] to object format {from: to} for backend
            const aliasesObject = aliases.reduce((acc, alias) => {
                if (alias.from && alias.to) {
                    acc[alias.from] = alias.to;
                }
                return acc;
            }, {} as Record<string, string>);

            await updateProjectSettings(projectId, { model_aliases: JSON.stringify(aliasesObject) });
            router.refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setIsPending(false);
        }
    };

    const handleSavePrivacy = async () => {
        setIsPending(true);
        try {
            await updateProjectSettings(projectId, {
                pii_scrubbing_level: piiLevel,
                pii_scrubbing_enabled: piiEnabled ? 1 : 0
            });
            router.refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setIsPending(false);
        }
    };

    const addAlias = () => {
        setAliases([...aliases, { from: '', to: '' }]);
    };

    const removeAlias = (index: number) => {
        setAliases(aliases.filter((_, i) => i !== index));
    };

    const updateAlias = (index: number, field: 'from' | 'to', value: string) => {
        const newAliases = [...aliases];
        newAliases[index][field] = value;
        setAliases(newAliases);
    };

    const hasProvider = (p: string) => providers.some(config => config.provider === p);

    const tabs = [
        { id: 'general', label: 'General', icon: Globe },
        { id: 'providers', label: 'AI Providers', icon: ShieldCheck },
        { id: 'aliases', label: 'Model Aliases', icon: Cpu },
        { id: 'privacy', label: 'Privacy & PII', icon: Eye },
        { id: 'alerts', label: 'Alerts', icon: Bell },
    ];

    return (
        <div className="flex flex-col lg:flex-row gap-8 animate-fade-in">
            {/* Sidebar Navigation */}
            <aside className="w-full lg:w-64 space-y-2">
                <div className="glass-card p-2 space-y-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20 shadow-[0_0_15px_rgba(77,159,255,0.2)]'
                                        : 'text-muted hover:text-white hover:bg-glass-bg border border-transparent'
                                }`}
                            >
                                <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
                <div className="glass-card min-h-[400px] border-glass-border/40 overflow-y-auto custom-scrollbar max-h-[calc(100vh-200px)]">
                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h2 className="text-2xl font-bold text-gradient mb-1">Project Metadata</h2>
                                <p className="text-sm text-muted">Update your project's identity and description.</p>
                            </div>

                            <form onSubmit={handleUpdateMetadata} className="space-y-6 pt-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                                        <Info className="w-3 h-3 text-accent-blue" />
                                        Project Name
                                    </label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="input-field bg-background/30 focus:border-accent-blue/50"
                                        placeholder="My Awesome AI App"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                                        <Info className="w-3 h-3 text-accent-blue" />
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="input-field min-h-[120px] resize-none bg-background/30 focus:border-accent-blue/50"
                                        placeholder="Briefly describe what this project does..."
                                    />
                                </div>
                                <div className="pt-4">
                                    <button
                                        disabled={isPending || (name === projectName && description === projectDescription)}
                                        className="btn-primary px-10 flex items-center gap-2 group"
                                    >
                                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                            <>
                                                <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Providers Tab */}
                    {activeTab === 'providers' && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h2 className="text-2xl font-bold text-gradient mb-1">AI Provider Keys</h2>
                                <p className="text-sm text-muted">Manage your credentials for external AI services.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {providers_config.map((p) => (
                                    <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:shadow-lg ${
                                        hasProvider(p.id)
                                            ? 'bg-accent-blue/5 border-accent-blue/30 shadow-md'
                                            : 'bg-glass-bg/50 border-glass-border hover:border-glass-border/60'
                                    }`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl bg-background/50 border transition-all ${
                                                hasProvider(p.id)
                                                    ? 'border-accent-blue/50 shadow-[0_0_15px_rgba(77,159,255,0.2)]'
                                                    : 'border-glass-border'
                                            }`}>
                                                <Lock className={`w-5 h-5 ${hasProvider(p.id) ? 'text-accent-blue' : 'text-muted'}`} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-base">{p.name}</div>
                                                <div className="text-xs text-muted mt-0.5">{p.description}</div>
                                                <div className="text-xs text-muted font-mono tracking-tighter mt-1">
                                                    {hasProvider(p.id) ? '••••••••••••••••••••' : 'No key configured'}
                                                </div>
                                            </div>
                                        </div>
                                        {hasProvider(p.id) ? (
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-400/10 rounded-full border border-green-400/30">
                                                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                                    <span className="text-xs text-green-400 font-bold uppercase tracking-wider">Active</span>
                                                </div>
                                                <button
                                                    onClick={() => handleUpdateProvider(p.id)}
                                                    className="text-xs text-accent-blue font-medium hover:underline px-3 py-1.5 bg-accent-blue/10 rounded-full border border-accent-blue/20 transition-all hover:bg-accent-blue/20"
                                                    title="Update API key"
                                                >
                                                    <RefreshCw className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProvider(p.id)}
                                                    className="text-xs text-red-400 font-medium hover:underline px-3 py-1.5 bg-red-400/10 rounded-full border border-red-400/20 transition-all hover:bg-red-400/20"
                                                    title="Delete API key"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setSelectedProvider(p.id)}
                                                className="text-xs text-accent-blue font-bold uppercase tracking-wider hover:underline px-4 py-2 bg-accent-blue/10 rounded-full border border-accent-blue/20 transition-all hover:bg-accent-blue/20"
                                            >
                                                Configure
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Update Key Section */}
                            <div className="pt-6 border-t border-glass-border/30">
                                <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-accent-blue" />
                                    Configure {providers_config.find(p => p.id === selectedProvider)?.name || selectedProvider} API Key
                                </h3>
                                <form id="provider-key-form" onSubmit={handleSaveProvider} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                                            <Key className="w-3 h-3 text-accent-blue" />
                                            Provider API Key
                                        </label>
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <ApiKeyInput
                                                    value={providerKey}
                                                    onChange={setProviderKey}
                                                    placeholder={`Enter your ${providers_config.find(p => p.id === selectedProvider)?.name || selectedProvider} API key`}
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isPending || !providerKey}
                                                className="btn-primary h-[48px] px-8 flex items-center gap-2"
                                            >
                                                {isPending ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4" />
                                                        Save Key
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-accent-blue/5 border border-accent-blue/20">
                                        <div className="flex items-start gap-2">
                                            <Lock className="w-4 h-4 text-accent-blue flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-muted">
                                                Keys are encrypted with AES-256-GCM and stored securely. The gateway temporarily decrypts keys in memory only when proxying requests to AI providers.
                                            </p>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* Delete Confirmation Dialog */}
                            {deleteDialog.open && (
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                    <div className="glass-card max-w-md w-full p-6 space-y-4">
                                        <h3 className="text-xl font-bold text-red-400">Delete Provider Key?</h3>
                                        <p className="text-sm text-muted">
                                            Are you sure you want to delete the {deleteDialog.provider} API key?
                                            This action cannot be undone. API calls using this provider will fail.
                                        </p>
                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={() => setDeleteDialog({ open: false, provider: '' })}
                                                className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
                                                disabled={isPending}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={confirmDeleteProvider}
                                                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                                                disabled={isPending}
                                            >
                                                {isPending ? 'Deleting...' : 'Delete Key'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Aliases Tab */}
                    {activeTab === 'aliases' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gradient mb-1">Model Aliasing</h2>
                                    <p className="text-sm text-muted">Map your custom model names to specific provider models.</p>
                                </div>
                                <button
                                    onClick={addAlias}
                                    className="p-2 rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/20 hover:bg-accent-blue/20 transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4 pt-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {aliases.length > 0 ? aliases.map((alias, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-glass-bg/50 p-4 rounded-2xl border border-glass-border group transition-all hover:border-accent-blue/30 hover:shadow-lg">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Your Alias</label>
                                            <input
                                                value={alias.from}
                                                onChange={(e) => updateAlias(idx, 'from', e.target.value)}
                                                className="input-field bg-background/30"
                                                placeholder="e.g. smart-model"
                                            />
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent-blue transition-colors flex-shrink-0 mt-6" />
                                        <div className="flex-1 space-y-2">
                                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Provider Model</label>
                                            <input
                                                value={alias.to}
                                                onChange={(e) => updateAlias(idx, 'to', e.target.value)}
                                                className="input-field bg-background/30"
                                                placeholder="e.g. gemini-1.5-pro"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeAlias(idx)}
                                            className="p-2 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-400/10 transition-all mt-6"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )) : (
                                    <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-glass-border rounded-3xl">
                                        <Cpu className="w-8 h-8 text-muted/30 mb-3" />
                                        <p className="text-sm text-muted">No model aliases configured yet.</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6">
                                <button
                                    onClick={handleSaveAliases}
                                    disabled={isPending}
                                    className="btn-primary w-full sm:w-auto px-10 flex items-center justify-center gap-2"
                                >
                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Update Aliases
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Privacy & PII Tab */}
                    {activeTab === 'privacy' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h2 className="text-2xl font-bold text-gradient mb-1">Privacy & PII Protection</h2>
                                <p className="text-sm text-muted">Configure how sensitive data is scrubbed from your logs.</p>
                            </div>

                            <div className="space-y-6 pt-4">
                                {/* Enable/Disable Toggle */}
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-glass-bg/30 border border-glass-border">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${piiEnabled ? 'bg-green-400/10 border border-green-400/20' : 'bg-red-400/10 border border-red-400/20'}`}>
                                            {piiEnabled ? <Eye className="w-5 h-5 text-green-400" /> : <EyeOff className="w-5 h-5 text-red-400" />}
                                        </div>
                                        <div>
                                            <div className="font-bold">PII Scrubbing</div>
                                            <div className="text-xs text-muted">
                                                {piiEnabled ? 'Enabled - Sensitive data will be masked' : 'Disabled - Raw data logged'}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setPiiEnabled(!piiEnabled)}
                                        className={`relative w-14 h-7 rounded-full transition-colors ${piiEnabled ? 'bg-accent-blue' : 'bg-glass-border'}`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${piiEnabled ? 'left-8' : 'left-1'}`} />
                                    </button>
                                </div>

                                {/* Scrubbing Level Selector */}
                                {piiEnabled && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-accent-blue" />
                                                Scrubbing Level
                                            </label>
                                            <span className="text-xs text-muted font-mono">Current: {piiLevel}</span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            {[
                                                {
                                                    value: 'low' as const,
                                                    label: 'Low',
                                                    description: 'Basic PII detection (emails, phones, SSN, credit cards)',
                                                    color: 'border-yellow-400/40 bg-yellow-400/10',
                                                    glow: 'shadow-[0_0_20px_rgba(250,204,21,0.2)]'
                                                },
                                                {
                                                    value: 'medium' as const,
                                                    label: 'Medium',
                                                    description: 'Basic + API keys, tokens, IP addresses',
                                                    color: 'border-blue-400/40 bg-blue-400/10',
                                                    glow: 'shadow-[0_0_20px_rgba(96,165,250,0.2)]'
                                                },
                                                {
                                                    value: 'high' as const,
                                                    label: 'High',
                                                    description: 'Medium + Secret patterns, credentials, JSON sensitive fields',
                                                    color: 'border-purple-400/40 bg-purple-400/10',
                                                    glow: 'shadow-[0_0_20px_rgba(192,132,252,0.2)]'
                                                }
                                            ].map((level) => (
                                                <button
                                                    key={level.value}
                                                    onClick={() => setPiiLevel(level.value)}
                                                    className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                                                        piiLevel === level.value
                                                            ? `${level.color} ${level.glow}`
                                                            : 'border-glass-border bg-glass-bg/50 hover:border-glass-border/80'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="font-bold text-sm mb-1">{level.label}</div>
                                                            <div className="text-xs text-muted">{level.description}</div>
                                                        </div>
                                                        {piiLevel === level.value && (
                                                            <div className="w-6 h-6 rounded-full bg-accent-blue flex items-center justify-center shadow-lg">
                                                                <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Save Button */}
                                <div className="pt-6 border-t border-glass-border/30">
                                    <button
                                        onClick={handleSavePrivacy}
                                        disabled={isPending}
                                        className="btn-primary w-full sm:w-auto px-10 flex items-center justify-center gap-2"
                                    >
                                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Save Privacy Settings
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Info Box */}
                                <div className="p-4 rounded-xl bg-accent-blue/5 border border-accent-blue/20">
                                    <div className="flex items-start gap-3">
                                        <Info className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
                                        <div className="text-xs text-muted">
                                            <strong className="text-white">PII Scrubbing</strong> automatically detects and masks sensitive information in your request logs before they are stored.
                                            This helps protect user privacy and comply with data protection regulations like GDPR and CCPA.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Alerts Tab */}
                    {activeTab === 'alerts' && (
                        <div className="animate-fade-in">
                            {token ? (
                                <AlertsTab projectId={projectId} token={token} />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Lock className="w-12 h-12 text-muted mb-3" />
                                    <p className="text-muted">Authentication required to manage alerts</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
