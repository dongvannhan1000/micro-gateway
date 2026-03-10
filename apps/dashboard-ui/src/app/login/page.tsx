'use client';

import { useState } from 'react';
import Link from 'next/link';
import { login, signup } from './actions';
import { Shield, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        setError(null);
        try {
            // Small delay for UX feel
            await new Promise(resolve => setTimeout(resolve, 500));
            const result = await login(formData);
            if (result?.error) {
                setError(result.error);
            }
        } catch (e) {
            setError('An unexpected error occurred');
        } finally {
            setIsPending(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top_right,rgba(77,159,255,0.08),transparent),radial-gradient(circle_at_bottom_left,rgba(179,139,255,0.08),transparent)]">
            <div className="w-full max-w-md animate-fade-in">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-glass-bg border border-glass-border mb-4 animate-glow">
                        <Shield className="w-8 h-8 text-accent-blue" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                        Welcome to <span className="text-gradient">Micro Gateway</span>
                    </h1>
                    <p className="text-muted text-sm">Sign in to manage your AI security and costs</p>
                </div>

                <div className="glass-card">
                    <form action={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted uppercase tracking-wider" htmlFor="email">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    required
                                    className="w-full bg-background border border-glass-border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-accent-blue transition-colors"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted uppercase tracking-wider" htmlFor="password">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-background border border-glass-border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-accent-blue transition-colors"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-400 text-xs py-1 px-2 bg-red-400/10 border border-red-400/20 rounded">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full bg-neon-gradient hover:opacity-90 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    Sign In <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-muted">Don't have an account? </span>
                        <Link href="/register" className="text-accent-blue hover:underline font-medium">
                            Create an account
                        </Link>
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-muted">
                    &copy; 2026 Micro-Security Gateway. All rights reserved.
                </div>
            </div>
        </div>
    );
}
