'use client';

import { useState } from 'react';
import { saveProviderConfig, updateProjectSettings } from '@/app/dashboard/actions';
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
    Lock
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type TabType = 'general' | 'providers' | 'aliases';

export function ProjectSettingsForm({
    projectId,
    projectName,
    projectDescription,
    providers,
    currentAliases
}: {
    projectId: string,
    projectName: string,
    projectDescription: string | null,
    providers: any[],
    currentAliases?: string
}) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [isPending, setIsPending] = useState(false);

    // General Settings State
    const [name, setName] = useState(projectName);
    const [description, setDescription] = useState(projectDescription || '');

    // Provider Key State
    const [selectedProvider, setSelectedProvider] = useState('google');
    const [providerKey, setProviderKey] = useState('');

    // Aliases State
    const [aliases, setAliases] = useState<any[]>(() => {
        try {
            return currentAliases ? JSON.parse(currentAliases) : [];
        } catch {
            return [];
        }
    });

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

    const handleSaveAliases = async () => {
        setIsPending(true);
        try {
            await updateProjectSettings(projectId, { model_aliases: JSON.stringify(aliases) });
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
    ];

    return (
        <div className="flex flex-col md:flex-row gap-8 animate-fade-in">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 space-y-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                                    ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20 shadow-[0_0_15px_rgba(77,159,255,0.1)]'
                                    : 'text-muted hover:bg-glass-bg border border-transparent'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </aside>

            {/* Main Content Area */}
            <main className="flex-1">
                <div className="glass-card min-h-[400px] border-glass-border/40">
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
                                {['google', 'openai', 'anthropic'].map((p) => (
                                    <div key={p} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${hasProvider(p)
                                            ? 'bg-accent-blue/5 border-accent-blue/20'
                                            : 'bg-glass-bg/30 border-glass-border'
                                        }`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg bg-background/50 border ${hasProvider(p) ? 'border-accent-blue/50 shadow-inner' : 'border-glass-border'}`}>
                                                <Lock className={`w-5 h-5 ${hasProvider(p) ? 'text-accent-blue' : 'text-muted'}`} />
                                            </div>
                                            <div>
                                                <div className="font-bold capitalize">{p === 'google' ? 'Google Gemini' : p}</div>
                                                <div className="text-[10px] text-muted font-mono tracking-tighter">
                                                    {hasProvider(p) ? '••••••••••••••••••••' : 'No key configured'}
                                                </div>
                                            </div>
                                        </div>
                                        {hasProvider(p) ? (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-green-400/10 rounded-full border border-green-400/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                                <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Active</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setSelectedProvider(p)}
                                                className="text-[10px] text-accent-blue font-bold uppercase tracking-widest hover:underline px-3 py-1 bg-accent-blue/10 rounded-full border border-accent-blue/20"
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
                                    Update {selectedProvider === 'google' ? 'Google' : selectedProvider} Key
                                </h3>
                                <form onSubmit={handleSaveProvider} className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-bold text-muted uppercase">Provider API Key</label>
                                            <input
                                                type="password"
                                                value={providerKey}
                                                onChange={(e) => setProviderKey(e.target.value)}
                                                className="input-field bg-background/30 font-mono"
                                                placeholder={`sk-proj-xxxxxxxx...`}
                                                required
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                disabled={isPending || !providerKey}
                                                className="btn-primary h-[48px] px-8"
                                            >
                                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-muted italic">
                                        Keys are encrypted with AES-256-GCM using your project secret. Only the MSGateway worker can decrypt them for proxying.
                                    </p>
                                </form>
                            </div>
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

                            <div className="space-y-4 pt-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 uppercase">
                                {aliases.length > 0 ? aliases.map((alias, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-glass-bg/30 p-4 rounded-2xl border border-glass-border group transition-all hover:border-accent-blue/30">
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[10px] font-bold text-muted">YOUR ALIAS</label>
                                            <input
                                                value={alias.from}
                                                onChange={(e) => updateAlias(idx, 'from', e.target.value)}
                                                className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold placeholder:text-muted/30"
                                                placeholder="e.g. smart-model"
                                            />
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent-blue transition-colors" />
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[10px] font-bold text-muted">PROVIDER MODEL</label>
                                            <input
                                                value={alias.to}
                                                onChange={(e) => updateAlias(idx, 'to', e.target.value)}
                                                className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold placeholder:text-muted/30"
                                                placeholder="e.g. gemini-1.5-pro"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeAlias(idx)}
                                            className="p-2 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-400/10 transition-all"
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
                </div>
            </main>
        </div>
    );
}
