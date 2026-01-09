import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '../types';

interface RoleGuardProps {
    allowedRoles: UserRole[];
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
    const { profile, loading } = useAuth();

    if (loading) {
        return <div>Loading access permissions...</div>;
    }

    if (!profile || !allowedRoles.includes(profile.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
}
