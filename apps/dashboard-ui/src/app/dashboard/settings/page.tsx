'use client';

import React, { useState } from 'react';
import { Settings, Save, Shield, CreditCard, Bell, User, AlertTriangle } from 'lucide-react';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { BillingSection } from '@/components/settings/BillingSection';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';

type TabType = 'profile' | 'billing' | 'security' | 'notifications';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('profile');

    const tabs = [
        { id: 'profile' as TabType, name: 'Profile', icon: User },
        { id: 'billing' as TabType, name: 'Billing & Usage', icon: CreditCard },
        { id: 'security' as TabType, name: 'Security', icon: Shield },
        { id: 'notifications' as TabType, name: 'Notifications', icon: Bell },
    ];

    return (
        <div className="max-w-6xl space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold font-heading tracking-tight">Account <span className="text-gradient">Settings</span></h1>
                <p className="text-muted mt-1">Manage your global preferences, billing, and security settings.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar navigation */}
                <div className="lg:col-span-1">
                    <div className="sticky top-8 space-y-1">
                        <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted mb-4">
                            <Settings className="w-4 h-4" />
                            Settings
                        </div>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20 shadow-lg shadow-accent-blue/10'
                                        : 'text-muted hover:text-white hover:bg-glass-bg'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main content area */}
                <div className="lg:col-span-3">
                    {activeTab === 'profile' && <ProfileSection />}
                    {activeTab === 'billing' && <BillingSection />}
                    {activeTab === 'security' && <SecuritySection />}
                    {activeTab === 'notifications' && <NotificationsSection />}

                    {/* Danger Zone - shown on all tabs */}
                    <div className="glass-card p-6 border-red-500/20 bg-red-500/5 mt-8">
                        <h3 className="text-lg font-bold text-red-500 mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Danger Zone
                        </h3>
                        <p className="text-sm text-muted mb-6">
                            Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <button className="px-4 py-2 border border-red-500/30 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/10 transition-all">
                                Delete Account
                            </button>
                            <button className="px-4 py-2 border border-glass-border text-muted rounded-xl text-sm font-bold hover:bg-glass-bg transition-all">
                                Export Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
