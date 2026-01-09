-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. FACILITIES TABLE
create table facilities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  created_at timestamptz default now()
);

-- 2. PROFILES TABLE (Extends auth.users)
create type user_role as enum ('resident', 'provider', 'admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'resident',
  full_name text,
  facility_id uuid references facilities(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. APPOINTMENTS TABLE
create type appointment_status as enum ('scheduled', 'completed', 'cancelled');

create table appointments (
  id uuid primary key default uuid_generate_v4(),
  resident_id uuid references profiles(id) not null,
  provider_id uuid references profiles(id),
  facility_id uuid references facilities(id) not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status appointment_status default 'scheduled',
  notes text,
  created_at timestamptz default now()
);

-- SECURITY & RLS

alter table facilities enable row level security;
alter table profiles enable row level security;
alter table appointments enable row level security;

-- POLICIES

-- Facilities: Readable by all authenticated users (simplification for listing)
create policy "Facilities visible to all users" on facilities
  for select using (auth.role() = 'authenticated');

-- Profiles: 
-- ADMINS can do everything
-- PROVIDERS can view profiles in their facility
-- RESIDENTS can view their own profile
create policy "Admins have full access to profiles" on profiles
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Providers view facility patients" on profiles
  for select using (
    exists (
        select 1 from profiles provider 
        where provider.id = auth.uid() 
        and provider.role = 'provider' 
        and provider.facility_id = profiles.facility_id
    )
  );

create policy "Users view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users update own profile" on profiles
  for update using (auth.uid() = id);


-- Appointments:
-- ADMINS can view all
-- PROVIDERS can view appointments in their facility
-- RESIDENTS can view their own appointments
create policy "Admins view all appointments" on appointments
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Providers view facility appointments" on appointments
  for select using (
    exists (
        select 1 from profiles provider 
        where provider.id = auth.uid() 
        and provider.role = 'provider' 
        and provider.facility_id = appointments.facility_id
    )
  );

create policy "Residents view own appointments" on appointments
  for select using (resident_id = auth.uid());
