'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signup } from '../login/actions';
import { Shield, Lock, Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        setError(null);
        try {
            const result = await signup(formData);
            if (result?.error) {
                setError(result.error);
            } else {
                setIsSuccess(true);
            }
        } catch (e) {
            setError('An unexpected error occurred');
        } finally {
            setIsPending(false);
        }
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card max-w-md w-full text-center space-y-6 py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mb-2">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Check your email</h2>
                        <p className="text-muted text-sm px-6">
                            We've sent a confirmation link to your email address. Please verify your account to continue.
                        </p>
                    </div>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-accent-blue hover:underline font-medium pt-4"
                    >
                        Return to login <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top_right,rgba(77,159,255,0.08),transparent),radial-gradient(circle_at_bottom_left,rgba(179,139,255,0.08),transparent)]">
            <div className="w-full max-w-md animate-fade-in">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-glass-bg border border-glass-border mb-4 animate-glow">
                        <Shield className="w-8 h-8 text-accent-blue" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                        Create <span className="text-gradient">Account</span>
                    </h1>
                    <p className="text-muted text-sm">Join the next generation of AI security</p>
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
                                    Create Account <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-muted">Already have an account? </span>
                        <Link href="/login" className="text-accent-blue hover:underline font-medium">
                            Sign in instead
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
