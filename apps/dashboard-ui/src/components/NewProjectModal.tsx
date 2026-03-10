'use client';

import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { createProject } from '@/app/dashboard/actions';
import { Plus, Loader2 } from 'lucide-react';

export function NewProjectModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (formData: FormData) => {
        setIsPending(true);
        setError(null);
        const result = await createProject(formData);
        if (result?.error) {
            setError(result.error);
            setIsPending(false);
        } else {
            setIsOpen(false);
            setIsPending(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-neon-gradient hover:opacity-90 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium shadow-lg transition-all active:scale-95"
            >
                <Plus className="w-4 h-4" /> New Project
            </button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create New Project">
                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted uppercase tracking-wider">Project Name</label>
                        <input
                            name="name"
                            type="text"
                            placeholder="e.g. My AI App"
                            required
                            className="w-full bg-background border border-glass-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-accent-blue transition-colors"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted uppercase tracking-wider">Description</label>
                        <textarea
                            name="description"
                            placeholder="Briefly describe your project..."
                            className="w-full bg-background border border-glass-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-accent-blue transition-colors h-24 resize-none"
                        />
                    </div>

                    {error && <p className="text-red-400 text-xs">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex-1 bg-glass-bg border border-glass-border text-white py-2.5 rounded-lg text-sm font-medium hover:bg-glass-border transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 bg-neon-gradient text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Project'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
