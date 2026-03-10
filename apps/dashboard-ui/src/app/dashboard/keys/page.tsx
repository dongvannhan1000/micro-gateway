import { Key } from 'lucide-react';

export default function ApiKeysPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="p-4 rounded-2xl bg-accent-blue/10 border border-accent-blue/20">
                <Key className="w-12 h-12 text-accent-blue" />
            </div>
            <h1 className="text-2xl font-bold">Global API Keys</h1>
            <p className="text-muted text-center max-w-md">
                View and manage all API keys across your projects. This page is currently under development.
            </p>
        </div>
    );
}
