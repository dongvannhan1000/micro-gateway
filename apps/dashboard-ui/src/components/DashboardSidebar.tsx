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
    Plus,
    Bell,
    Menu,
    X
} from 'lucide-react';
import { logout } from '@/app/login/actions';
import { useState, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Gateway Keys', href: '/dashboard/keys', icon: Key },
    { name: 'Security', href: '/dashboard/security', icon: ShieldCheck },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Alerts', href: '/dashboard/alerts', icon: Bell },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardSidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth >= 1024) {
                setIsMobileOpen(false);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close mobile menu when route changes
    useEffect(() => {
        if (isMobile) {
            setIsMobileOpen(false);
        }
    }, [pathname, isMobile]);

    return (
        <>
            {/* Mobile overlay */}
            {isMobile && isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Mobile menu button */}
            {isMobile && (
                <button
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    className="lg:hidden fixed top-4 left-4 z-50 p-2 glass rounded-lg hover:bg-glass-bg transition-colors"
                    aria-label="Toggle menu"
                >
                    {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            )}

            <aside
                onClick={() => !isMobile && setIsCollapsed(!isCollapsed)}
                className={cn(
                    "h-screen glass-card rounded-none border-y-0 border-l-0 transition-all duration-300 ease-in-out flex flex-col z-50 relative cursor-pointer group/sidebar select-none sticky top-0",
                    isMobile ? (
                        isMobileOpen
                            ? "fixed w-64 translate-x-0"
                            : "fixed w-64 -translate-x-full"
                    ) : (
                        isCollapsed ? "w-20" : "w-64"
                    ),
                    "lg:translate-x-0 lg:sticky lg:top-0"
                )}
            >
            <div className={cn(
                "h-20 flex items-center transition-all duration-300",
                isCollapsed ? "justify-center px-0" : "px-6 gap-3"
            )}>
                <div className={cn(
                    "flex-shrink-0 w-8 h-8 bg-neon-gradient rounded-lg flex items-center justify-center shadow-lg transition-all duration-300",
                    isCollapsed ? "ring-2 ring-accent-blue/20" : ""
                )}>
                    <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                {!isCollapsed && (
                    <span className="font-bold text-lg tracking-tight whitespace-nowrap animate-fade-in">
                        MS<span className="text-accent-blue">Gateway</span>
                    </span>
                )}
            </div>

            <nav className={cn(
                "flex-1 mt-4 transition-all duration-300",
                isCollapsed ? "flex flex-col items-center space-y-3 px-0" : "space-y-1 px-4"
            )}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className={cn(
                                "flex items-center rounded-xl transition-all duration-200 group relative",
                                isCollapsed
                                    ? "justify-center w-11 h-11"
                                    : "gap-3 px-3 py-2.5",
                                isActive
                                    ? "bg-accent-blue/10 text-accent-blue"
                                    : "text-muted hover:text-white hover:bg-glass-bg"
                            )}
                            title={isCollapsed ? item.name : undefined}
                        >
                            {/* Active indicator bar */}
                            {isActive && (
                                <span className={cn(
                                    "absolute left-0 bg-accent-blue rounded-r-full shadow-[0_0_8px_rgba(77,159,255,0.6)] transition-all duration-300",
                                    isCollapsed
                                        ? "w-[3px] h-5 -left-[6px] top-1/2 -translate-y-1/2"
                                        : "w-[3px] h-5 top-1/2 -translate-y-1/2"
                                )} />
                            )}
                            <item.icon className={cn(
                                "w-5 h-5 flex-shrink-0 transition-colors",
                                isActive ? "text-accent-blue" : "text-muted group-hover:text-white"
                            )} />
                            {!isCollapsed && (
                                <span className="font-medium whitespace-nowrap animate-fade-in">{item.name}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className={cn(
                "border-t border-glass-border mb-4 transition-all duration-300",
                isCollapsed ? "p-3 flex justify-center" : "p-4"
            )}>
                <button
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        logout();
                    }}
                    className={cn(
                        "flex items-center rounded-xl text-muted hover:text-red-400 hover:bg-red-400/10 transition-all duration-300 group",
                        isCollapsed ? "justify-center w-10 h-10" : "w-full gap-3 px-3 py-2.5"
                    )}
                    title={isCollapsed ? "Logout" : undefined}
                >
                    <LogOut className="w-5 h-5 group-hover:text-red-400 flex-shrink-0 transition-colors" />
                    {!isCollapsed && <span className="font-medium whitespace-nowrap animate-fade-in">Logout</span>}
                </button>
            </div>

            {/* Collapse toggle - hide on mobile */}
            {!isMobile && (
                <button
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setIsCollapsed(!isCollapsed);
                    }}
                    className="absolute -right-3 top-20 w-6 h-6 bg-glass-bg border border-glass-border rounded-full flex items-center justify-center text-muted hover:text-white z-50 shadow-xl backdrop-blur-md opacity-0 group-hover/sidebar:opacity-100 transition-opacity"
                >
                    {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                </button>
            )}
        </aside>
        </>
    );
}
