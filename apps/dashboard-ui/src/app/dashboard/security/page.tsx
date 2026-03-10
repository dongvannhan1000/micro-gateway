import { ShieldCheck } from 'lucide-react';

export default function SecurityPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="p-4 rounded-2xl bg-red-400/10 border border-red-400/20">
                <ShieldCheck className="w-12 h-12 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold">Security & Protection</h1>
            <p className="text-muted text-center max-w-md">
                Configure prompt injection detection and PII scrubbing.
                <br />
                <span className="text-accent-violet font-semibold">Coming in Sprint 2!</span>
            </p>
        </div>
    );
}
