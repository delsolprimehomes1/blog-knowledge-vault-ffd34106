-- Create admin email whitelist table
CREATE TABLE public.admin_email_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_email_whitelist ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage the whitelist
CREATE POLICY "Admins can view whitelist"
ON public.admin_email_whitelist
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage whitelist"
ON public.admin_email_whitelist
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Add the initial admin email
INSERT INTO public.admin_email_whitelist (email) VALUES ('info@delsolprimehomes.com');

-- Create trigger function to auto-assign admin role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user's email is in the admin whitelist
  IF EXISTS (SELECT 1 FROM admin_email_whitelist WHERE LOWER(email) = LOWER(NEW.email)) THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (fires after user creation)
CREATE TRIGGER on_auth_user_created_admin_check
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_admin_role();