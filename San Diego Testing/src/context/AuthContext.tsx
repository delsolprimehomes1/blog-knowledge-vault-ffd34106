import { createContext, useContext, useState, type ReactNode } from "react";
import type { UserRole, Profile } from "../types";

// Mock types to satisfy the interface until we have real Supabase types
interface Session {
    user: {
        id: string;
        email?: string;
    };
}

interface User {
    id: string;
    email?: string;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    login: (role: UserRole) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading] = useState(false);

    const login = (role: UserRole) => {
        // designated mock user ID
        const mockId = "mock-user-123";

        setSession({
            user: {
                id: mockId,
                email: `mock-${role}@example.com`
            }
        });

        setProfile({
            id: mockId,
            role: role,
            full_name: `Mock ${role.charAt(0).toUpperCase() + role.slice(1)}`,
            facility_id: "facility-1",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    };

    const logout = () => {
        setSession(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
