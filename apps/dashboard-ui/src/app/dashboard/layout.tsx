import { DashboardSidebar } from '@/components/DashboardSidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
            <DashboardSidebar />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 custom-scrollbar">
                <div className="max-w-6xl mx-auto animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
}
