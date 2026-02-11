
-- Step 1: Add apartments_editor to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'apartments_editor';
