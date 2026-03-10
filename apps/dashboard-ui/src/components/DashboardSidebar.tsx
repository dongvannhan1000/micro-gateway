'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Settings,
    Key,
    ShieldCheck,
    BarChart3,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Plus
} from 'lucide-react';
import { logout } from '@/app/login/actions';
import { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'API Keys', href: '/dashboard/keys', icon: Key },
    { name: 'Security', href: '/dashboard/security', icon: ShieldCheck },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardSidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside className={cn(
            "h-screen glass-card rounded-none border-y-0 border-l-0 transition-all duration-300 flex flex-col z-50",
            isCollapsed ? "w-20" : "w-64"
        )}>
            <div className="p-6 flex items-center justify-between">
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-neon-gradient rounded-lg flex items-center justify-center shadow-lg">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">MG<span className="text-accent-blue">Gateway</span></span>
                    </div>
                )}
                {isCollapsed && (
                    <div className="w-8 h-8 bg-neon-gradient rounded-lg flex items-center justify-center mx-auto shadow-lg">
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                )}
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                                isActive
                                    ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/20"
                                    : "text-muted hover:text-white hover:bg-glass-bg"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive ? "text-accent-blue" : "text-muted group-hover:text-white")} />
                            {!isCollapsed && <span className="font-medium">{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-glass-border">
                <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted hover:text-red-400 hover:bg-red-400/10 transition-all group"
                >
                    <LogOut className="w-5 h-5 group-hover:text-red-400" />
                    {!isCollapsed && <span className="font-medium">Logout</span>}
                </button>
            </div>

            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-20 w-6 h-6 bg-glass-bg border border-glass-border rounded-full flex items-center justify-center text-muted hover:text-white z-50 shadow-xl backdrop-blur-md"
            >
                {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
        </aside>
    );
}
