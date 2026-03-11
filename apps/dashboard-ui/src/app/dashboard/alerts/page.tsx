'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Plus, Trash2, ShieldAlert, DollarSign, Activity, AlertCircle } from 'lucide-react';
import { getAlertRules, createAlertRule, deleteAlertRule } from '../actions';
import { clsx } from 'clsx';

export default function AlertsPage() {
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState<string>(''); // Placeholder
    const [isAdding, setIsAdding] = useState(false);
    const [newRule, setNewRule] = useState({
        name: '',
        type: 'total_cost_threshold',
        threshold: 0,
        email: ''
    });

    useEffect(() => {
        // loadRules('dummy-id');
    }, []);

    const loadRules = async (projectId: string) => {
        setLoading(true);
        try {
            const data = await getAlertRules(projectId);
            setRules(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!selectedProjectId) return;
        try {
            await createAlertRule(selectedProjectId, newRule);
            setIsAdding(false);
            loadRules(selectedProjectId);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!selectedProjectId) return;
        try {
            await deleteAlertRule(selectedProjectId, id);
            loadRules(selectedProjectId);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-heading tracking-tight">Alert <span className="text-accent-violet">Center</span></h1>
                    <p className="text-muted mt-1">Configure automated notifications for cost and security events.</p>
                </div>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="bg-accent-violet/10 hover:bg-accent-violet/20 text-accent-violet px-4 py-2 rounded-xl border border-accent-violet/30 font-bold transition-all flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Create Rule
                </button>
            </div>

            {isAdding && (
                <div className="glass-card p-6 border-accent-violet/30 bg-accent-violet/5 animate-in slide-in-from-top duration-300">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-accent-violet" /> New Alert Rule
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted px-1">Rule Name</label>
                            <input 
                                type="text" 
                                placeholder="Monthly Spending Alert" 
                                className="bg-glass-bg border border-glass-border rounded-xl px-3 py-2 text-sm w-full"
                                value={newRule.name}
                                onChange={e => setNewRule({...newRule, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted px-1">Trigger Type</label>
                            <select 
                                className="bg-glass-bg border border-glass-border rounded-xl px-3 py-2 text-sm w-full"
                                value={newRule.type}
                                onChange={e => setNewRule({...newRule, type: e.target.value as any})}
                            >
                                <option value="total_cost_threshold">Cost Threshold ($)</option>
                                <option value="prompt_injection_detected">Prompt Injection</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted px-1">Threshold / Email</label>
                            <input 
                                type="text" 
                                placeholder={newRule.type === 'total_cost_threshold' ? "e.g. 50" : "Notification Email"} 
                                className="bg-glass-bg border border-glass-border rounded-xl px-3 py-2 text-sm w-full"
                                onChange={e => {
                                    if(newRule.type === 'total_cost_threshold') setNewRule({...newRule, threshold: parseFloat(e.target.value)});
                                    else setNewRule({...newRule, email: e.target.value});
                                }}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleCreate}
                                className="flex-1 bg-accent-violet text-white py-2 rounded-xl font-bold shadow-lg shadow-accent-violet/20 hover:scale-[1.02] transition-all"
                            >
                                Save Rule
                            </button>
                            <button 
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 border border-glass-border rounded-xl text-muted hover:text-white transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rules.length > 0 ? rules.map((rule) => (
                    <div key={rule.id} className="glass-card group hover:border-accent-violet/50 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className={clsx(
                                "p-3 rounded-xl border shadow-lg",
                                rule.type === 'total_cost_threshold' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                            )}>
                                {rule.type === 'total_cost_threshold' ? <DollarSign className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                            </div>
                            <button 
                                onClick={() => handleDelete(rule.id)}
                                className="text-muted hover:text-red-500 p-2 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <h3 className="font-bold text-lg">{rule.name}</h3>
                        <p className="text-xs text-muted mt-2">
                            {rule.type === 'total_cost_threshold' 
                                ? `Triggers when project cost exceeds $${rule.threshold}`
                                : `Triggers when prompt injection is detected`
                            }
                        </p>
                        <div className="mt-4 pt-4 border-t border-glass-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                <span className="text-[10px] font-bold uppercase tracking-widest">Active</span>
                            </div>
                            <span className="text-[10px] text-muted font-medium italic">Checked real-time</span>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center glass-card border-dashed flex flex-col items-center gap-4">
                        <Bell className="w-12 h-12 text-muted opacity-20" />
                        <div>
                            <h3 className="text-xl font-bold">No alert rules configured</h3>
                            <p className="text-muted text-sm max-w-xs mx-auto mt-1">Get notified via email when your gateway reaches spending limits or detects security threats.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
