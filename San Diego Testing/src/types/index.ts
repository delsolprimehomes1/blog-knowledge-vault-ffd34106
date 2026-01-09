export type UserRole = 'resident' | 'provider' | 'admin';

export interface Profile {
    id: string;
    role: UserRole;
    full_name: string | null;
    facility_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface Facility {
    id: string;
    name: string;
    address: string | null;
    created_at: string;
}
