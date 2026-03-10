'use client';

import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Settings, Plus, Trash2, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { updateProjectSettings } from '@/app/dashboard/actions';

export function ModelAliasingModal({ projectId, currentAliases }: { projectId: string, currentAliases: string | undefined }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [aliases, setAliases] = useState<Record<string, string>>(
        currentAliases ? JSON.parse(currentAliases) : {}
    );

    const [newOrig, setNewOrig] = useState('');
    const [newTarget, setNewTarget] = useState('gemini-1.5-flash');

    const addAlias = () => {
        if (newOrig) {
            setAliases({ ...aliases, [newOrig]: newTarget });
            setNewOrig('');
        }
    };

    const removeAlias = (orig: string) => {
        const updated = { ...aliases };
        delete updated[orig];
        setAliases(updated);
    };

    const handleSave = async () => {
        setIsPending(true);
        try {
            await updateProjectSettings(projectId, { model_aliases: JSON.stringify(aliases) });
            setIsOpen(false);
        } catch (e) {
            console.error('Failed to update aliases:', e);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="text-[10px] text-accent-blue hover:underline uppercase font-bold tracking-wider"
            >
                Configure Aliasing
            </button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Model Aliasing Configuration">
                <div className="space-y-6">
                    <p className="text-xs text-muted leading-relaxed">
                        Map expensive models like <span className="text-foreground">GPT-4o</span> to cheaper alternatives like <span className="text-accent-blue">Gemini Flash</span>. Your code remains unchanged.
                    </p>

                    <div className="space-y-3">
                        {Object.entries(aliases).map(([orig, target]) => (
                            <div key={orig} className="flex items-center gap-3 bg-glass-bg p-3 rounded-xl border border-glass-border animate-fade-in">
                                <div className="flex-1 bg-background/50 px-3 py-1.5 rounded border border-glass-border text-xs truncate">
                                    {orig}
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted" />
                                <div className="flex-1 bg-background/50 px-3 py-1.5 rounded border border-glass-border text-xs font-bold text-accent-violet truncate">
                                    {target}
                                </div>
                                <button onClick={() => removeAlias(orig)} className="p-1 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-glass-bg rounded-xl border border-dashed border-glass-border space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-5 h-5 text-accent-violet" />
                            <h2 className="text-xl font-bold">Provider API Keys</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-muted">Original Model</label>
                                <input
                                    value={newOrig}
                                    onChange={(e) => setNewOrig(e.target.value)}
                                    placeholder="gpt-4o"
                                    className="w-full bg-background border border-glass-border rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-accent-blue"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-muted">Route To</label>
                                <select
                                    value={newTarget}
                                    onChange={(e) => setNewTarget(e.target.value)}
                                    className="w-full bg-background border border-glass-border rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-accent-blue"
                                >
                                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                                </select>
                            </div>
                        </div>
                        <button
                            onClick={addAlias}
                            disabled={!newOrig}
                            className="w-full py-2 bg-glass-bg hover:bg-glass-border rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                        >
                            Add Alias Rule
                        </button>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex-1 bg-glass-bg border border-glass-border text-white py-2.5 rounded-lg text-sm font-medium hover:bg-glass-border transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isPending}
                            className="flex-1 bg-neon-gradient text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
