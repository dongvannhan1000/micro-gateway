import { Settings } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="p-4 rounded-2xl bg-glass-bg border border-glass-border">
                <Settings className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Global Settings</h1>
            <p className="text-muted text-center max-w-md">
                Manage your profile, team members, and billing information.
            </p>
        </div>
    );
}
