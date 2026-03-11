'use client';

import React, { useState } from 'react';
import { Settings, Save, Shield, CreditCard, Bell, User } from 'lucide-react';

export default function SettingsPage() {
    const [monthlyLimit, setMonthlyLimit] = useState(100);
    const [isSaving, setIsSaving] = useState(false);

    return (
        <div className="max-w-4xl space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold font-heading tracking-tight">Account <span className="text-gradient">Settings</span></h1>
                <p className="text-muted mt-1">Manage your global preferences, billing, and security settings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Sidebar links for settings subsets */}
                <div className="space-y-1">
                    {[
                        { name: 'Profile', icon: User, active: true },
                        { name: 'Billing & Usage', icon: CreditCard },
                        { name: 'Security', icon: Shield },
                        { name: 'Notifications', icon: Bell },
                    ].map((item) => (
                        <button 
                            key={item.name}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                item.active ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20' : 'text-muted hover:text-white hover:bg-glass-bg'
                            }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.name}
                        </button>
                    ))}
                </div>

                {/* Main settings panel */}
                <div className="md:col-span-3 space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-accent-blue" /> Usage & Billing
                        </h3>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold block">Global Spending Threshold (USD)</label>
                                <p className="text-xs text-muted mb-3">Total monthly limit across all your gateway projects. Reaching this will halt all active gateways.</p>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="number" 
                                        className="bg-glass-bg border border-glass-border rounded-xl px-4 py-2 text-sm w-32 font-bold"
                                        value={monthlyLimit}
                                        onChange={e => setMonthlyLimit(parseFloat(e.target.value))}
                                    />
                                    <div className="flex-1 h-2 bg-glass-bg rounded-full overflow-hidden border border-glass-border">
                                        <div className="h-full bg-accent-blue shadow-[0_0_8px_rgba(77,159,255,0.5)] w-1/3"></div>
                                    </div>
                                    <span className="text-xs font-bold">$33.42 used</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-glass-border flex justify-end">
                                <button 
                                    className="bg-accent-blue text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] transition-all shadow-lg shadow-accent-blue/20 disabled:opacity-50"
                                    onClick={() => {
                                        setIsSaving(true);
                                        setTimeout(() => setIsSaving(false), 800);
                                    }}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 border-red-500/20 bg-red-500/5">
                        <h3 className="text-lg font-bold text-red-500 mb-4">Danger Zone</h3>
                        <p className="text-xs text-muted mb-6">Once you delete your account or any projects, there is no going back. Please be certain.</p>
                        <button className="px-4 py-2 border border-red-500/30 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/10 transition-all">
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
