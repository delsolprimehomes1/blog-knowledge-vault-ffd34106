import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';

export function DashboardLayout() {
    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar className="w-64 hidden md:flex" />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <Outlet />
            </main>
        </div>
    );
}
