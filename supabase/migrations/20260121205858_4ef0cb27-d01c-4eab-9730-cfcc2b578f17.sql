-- PROMPT 1: Logic Enforcement (Night Hold & SLA)

-- 1. Add new columns to crm_leads for night hold and SLA tracking
ALTER TABLE public.crm_leads
ADD COLUMN IF NOT EXISTS is_night_held BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS scheduled_release_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS breach_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_action_completed BOOLEAN DEFAULT false;

-- 2. Create crm_system_settings table for business hours and SLA config
CREATE TABLE IF NOT EXISTS public.crm_system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_system_settings
CREATE POLICY "Admins can manage system settings"
ON public.crm_system_settings
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Agents can view system settings"
ON public.crm_system_settings
FOR SELECT
TO authenticated
USING (public.is_crm_agent(auth.uid()));

-- 3. Insert default business hours (Europe/Madrid 9:00-21:00)
INSERT INTO public.crm_system_settings (key, value, description)
VALUES (
  'business_hours',
  '{"start": 9, "end": 21, "timezone": "Europe/Madrid"}',
  'Business hours for lead routing. Leads outside these hours are held until next business day opening.'
)
ON CONFLICT (key) DO NOTHING;

-- 4. Insert SLA settings (10 minute first action timeout)
INSERT INTO public.crm_system_settings (key, value, description)
VALUES (
  'sla_settings',
  '{"first_action_minutes": 10, "escalate_to_admin": true, "admin_id": "95808453-dde1-421c-85ba-52fe534ef288"}',
  'SLA timeout settings. Leads without first action after X minutes get escalated to admin.'
)
ON CONFLICT (key) DO NOTHING;

-- 5. Create function to decrement agent lead count safely
CREATE OR REPLACE FUNCTION public.decrement_agent_lead_count(p_agent_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE crm_agents
  SET current_lead_count = GREATEST(0, current_lead_count - 1)
  WHERE id = p_agent_id;
END;
$$;

-- 6. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_crm_leads_night_held ON public.crm_leads(is_night_held) WHERE is_night_held = true;
CREATE INDEX IF NOT EXISTS idx_crm_leads_sla_check ON public.crm_leads(lead_claimed, first_action_completed, sla_breached, assigned_at) 
  WHERE lead_claimed = true AND first_action_completed = false AND sla_breached = false;
CREATE INDEX IF NOT EXISTS idx_crm_leads_scheduled_release ON public.crm_leads(scheduled_release_at) WHERE is_night_held = true;

-- 7. Update timestamp trigger for crm_system_settings
CREATE OR REPLACE FUNCTION public.update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path TO 'public';

CREATE TRIGGER update_crm_system_settings_updated_at
BEFORE UPDATE ON public.crm_system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_system_settings_timestamp();