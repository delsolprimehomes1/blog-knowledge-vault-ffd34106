import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';
import LoginPage from '../pages/auth/LoginPage';
import { ResidentHome } from '../pages/resident/Home';
import { AdminHome } from '../pages/admin/Home';
import { ProviderHome } from '../pages/provider/Home';

// Placeholder Pages (Temporary inline for speed, normally separate files)
const Landing = () => (
    <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Healthcare Testing Platform
        </h1>
        <p className="mt-4 text-lg text-gray-500">
            Secure portal for Residents, Providers, and Administrators.
        </p>
    </div>
);

const Unauthorized = () => <div className="p-10 text-center text-red-600">Access Denied</div>;

export function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route element={<MainLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
            </Route>

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>

                    {/* Admin Routes */}
                    <Route element={<RoleGuard allowedRoles={['admin']} />}>
                        <Route path="/admin" element={<AdminHome />} />
                    </Route>

                    {/* Provider Routes */}
                    <Route element={<RoleGuard allowedRoles={['provider', 'admin']} />}>
                        <Route path="/provider" element={<ProviderHome />} />
                    </Route>

                    {/* Resident Routes */}
                    <Route element={<RoleGuard allowedRoles={['resident', 'admin']} />}>
                        <Route path="/portal" element={<ResidentHome />} />
                    </Route>

                </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
