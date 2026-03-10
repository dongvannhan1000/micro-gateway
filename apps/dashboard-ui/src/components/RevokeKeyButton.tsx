'use client';

import { useState } from 'react';
import { revokeApiKey } from '@/app/dashboard/actions';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

export function RevokeKeyButton({ projectId, keyId, keyName }: { projectId: string, keyId: string, keyName: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const handleRevoke = async () => {
        setIsPending(true);
        await revokeApiKey(projectId, keyId);
        setIsOpen(false);
        setIsPending(false);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 text-muted hover:text-red-400 transition-colors"
            >
                <Trash2 className="w-4 h-4" />
            </button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Revoke API Key">
                <div className="space-y-6">
                    <div className="flex items-start gap-4 p-4 bg-red-400/5 border border-red-400/20 rounded-xl">
                        <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-red-400">Are you absolutely sure?</p>
                            <p className="text-xs text-muted leading-relaxed">
                                Revoking <span className="text-foreground font-medium">"{keyName}"</span> will immediately stop all applications using this key. This action cannot be undone.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex-1 bg-glass-bg border border-glass-border text-white py-2.5 rounded-lg text-sm font-medium hover:bg-glass-border transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleRevoke}
                            disabled={isPending}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Revoke Key'}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
