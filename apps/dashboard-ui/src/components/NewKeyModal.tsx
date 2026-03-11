'use client';

import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { createGatewayKey } from '@/app/dashboard/actions';
import { Plus, Loader2, Copy, CheckCircle2 } from 'lucide-react';

export function NewKeyModal({ projectId }: { projectId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsPending(true);
        setError(null);
        const result = await createGatewayKey(projectId, formData);
        if (result?.error) {
            setError(result.error);
            setIsPending(false);
        } else if (result?.key) {
            setCreatedKey(result.key);
            setIsPending(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setCreatedKey(null);
        setError(null);
        setCopied(false);
    };

    const copyToClipboard = () => {
        if (createdKey) {
            navigator.clipboard.writeText(createdKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-neon-gradient text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg hover:opacity-90 transition-all active:scale-95 flex items-center gap-2"
            >
                <Plus className="w-4 h-4" /> New Key
            </button>

            <Modal isOpen={isOpen} onClose={handleClose} title={createdKey ? "Gateway Key Created" : "Create New Gateway Key"}>
                {createdKey ? (
                    <div className="space-y-6 py-2">
                        <div className="p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-xl space-y-4">
                            <p className="text-xs text-muted leading-relaxed">
                                <span className="text-accent-blue font-bold">Important:</span> Copy this key now. For your security, we won't show it again.
                            </p>
                            <div className="relative group">
                                <code className="block bg-background p-4 rounded-lg border border-glass-border text-accent-blue text-sm break-all pr-12">
                                    {createdKey}
                                </code>
                                <button
                                    onClick={copyToClipboard}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-glass-bg rounded-lg text-muted hover:text-white transition-all"
                                >
                                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-full bg-glass-bg border border-glass-border text-white py-2.5 rounded-lg text-sm font-medium hover:bg-glass-border transition-colors"
                        >
                            I've saved my key
                        </button>
                    </div>
                ) : (
                    <form action={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted uppercase tracking-wider">Key Name</label>
                            <input
                                name="name"
                                type="text"
                                placeholder="e.g. Production Web App"
                                required
                                className="w-full bg-background border border-glass-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-accent-blue transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted uppercase tracking-wider">Monthly Limit (USD)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                                <input
                                    name="monthly_limit_usd"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00 (Unlimited)"
                                    className="w-full bg-background border border-glass-border rounded-lg py-2.5 pl-7 pr-4 text-sm focus:outline-none focus:border-accent-blue transition-colors"
                                />
                            </div>
                            <p className="text-[10px] text-muted italic">Budget resets at the start of each month. Requests block once reached.</p>
                        </div>

                        {error && <p className="text-red-400 text-xs">{error}</p>}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 bg-glass-bg border border-glass-border text-white py-2.5 rounded-lg text-sm font-medium hover:bg-glass-border transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="flex-1 bg-neon-gradient text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Gateway Key'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </>
    );
}
