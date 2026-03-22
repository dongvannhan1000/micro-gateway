'use client';

import React, { useState } from 'react';
import { Settings, TrendingUp, User } from 'lucide-react';
import { clsx } from 'clsx';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { UsageSection } from '@/components/settings/UsageSection';
// Keep these files but don't import - for future use
// import { SecuritySection } from '@/components/settings/SecuritySection';
// import { NotificationsSection } from '@/components/settings/NotificationsSection';

type TabType = 'profile' | 'usage';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('profile');

    const tabs = [
        { id: 'profile' as TabType, name: 'Profile', icon: User },
        { id: 'usage' as TabType, name: 'Usage', icon: TrendingUp },
    ];

    return (
        <div className="max-w-6xl space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold font-heading tracking-tight">Account <span className="text-gradient">Settings</span></h1>
                <p className="text-muted mt-1">Manage your profile, usage analytics, and security settings.</p>
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
                  <div className="relative min-h-[500px]">
                    <div className={clsx(
                      "absolute inset-0 transition-opacity duration-250",
                      activeTab === 'profile' ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
                    )}>
                      <ProfileSection />
                    </div>
                    <div className={clsx(
                      "absolute inset-0 transition-opacity duration-250",
                      activeTab === 'usage' ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
                    )}>
                      <UsageSection />
                    </div>
                  </div>
                </div>
            </div>
        </div>
    );
}
