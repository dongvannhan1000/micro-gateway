import { DashboardSidebar } from '@/components/DashboardSidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <DashboardSidebar />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 custom-scrollbar lg:ml-0 h-screen">
                <div className="max-w-6xl mx-auto animate-fade-in pt-14 lg:pt-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
