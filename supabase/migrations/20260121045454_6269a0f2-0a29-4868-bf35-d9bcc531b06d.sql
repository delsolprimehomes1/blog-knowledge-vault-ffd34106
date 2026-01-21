-- =====================================================
-- DEL SOL PRIME HOMES AGENT CRM - COMPLETE SCHEMA
-- =====================================================

-- =====================================================
-- 1. AGENTS TABLE (linked to auth.users)
-- =====================================================
CREATE TABLE public.crm_agents (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  
  -- Language assignments (for lead routing)
  languages TEXT[] NOT NULL DEFAULT '{"en"}',
  
  -- Notification settings
  email_notifications BOOLEAN DEFAULT true,
  slack_channel_id TEXT,
  slack_user_id TEXT,
  
  -- Capacity management
  max_active_leads INTEGER DEFAULT 50,
  accepts_new_leads BOOLEAN DEFAULT true,
  current_lead_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  timezone TEXT DEFAULT 'Europe/Madrid',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. LEADS TABLE (complete lead tracking)
-- =====================================================
CREATE TABLE public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT NOT NULL,
  country_prefix TEXT,
  full_phone TEXT,
  
  -- Source Tracking (CRITICAL FOR MAPPING)
  lead_source TEXT NOT NULL,
  lead_source_detail TEXT NOT NULL,
  page_type TEXT,
  page_url TEXT NOT NULL,
  page_title TEXT,
  page_slug TEXT,
  referrer TEXT,
  language TEXT NOT NULL,
  
  -- Emma Chatbot Specific Data
  questions_answered INTEGER DEFAULT 0,
  qa_pairs JSONB,
  conversation_duration TEXT,
  intake_complete BOOLEAN DEFAULT false,
  exit_point TEXT,
  
  -- Form Data
  property_ref TEXT,
  property_price TEXT,
  city_name TEXT,
  city_slug TEXT,
  interest TEXT,
  message TEXT,
  
  -- Property Criteria
  location_preference TEXT[],
  sea_view_importance TEXT,
  budget_range TEXT,
  bedrooms_desired TEXT,
  property_type TEXT[],
  property_purpose TEXT,
  timeframe TEXT,
  
  -- Lead Qualification
  lead_segment TEXT,
  initial_lead_score INTEGER,
  current_lead_score INTEGER,
  lead_status TEXT DEFAULT 'new',
  lead_priority TEXT DEFAULT 'medium',
  
  -- Assignment
  assigned_agent_id UUID REFERENCES public.crm_agents(id),
  assigned_at TIMESTAMPTZ,
  assignment_method TEXT,
  
  -- Claim System
  lead_claimed BOOLEAN DEFAULT false,
  claimed_by TEXT,
  claim_window_expires_at TIMESTAMPTZ,
  claim_broadcast_sent BOOLEAN DEFAULT false,
  
  -- Engagement Tracking
  first_contact_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  days_since_last_contact INTEGER,
  total_contacts INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  archived_reason TEXT
);

-- Lead indexes for performance
CREATE INDEX idx_crm_leads_assigned_agent ON public.crm_leads(assigned_agent_id, lead_status) WHERE archived = false;
CREATE INDEX idx_crm_leads_language ON public.crm_leads(language) WHERE archived = false;
CREATE INDEX idx_crm_leads_status ON public.crm_leads(lead_status, lead_priority) WHERE archived = false;
CREATE INDEX idx_crm_leads_created ON public.crm_leads(created_at DESC) WHERE archived = false;
CREATE INDEX idx_crm_leads_unclaimed ON public.crm_leads(lead_claimed, claim_window_expires_at) WHERE lead_claimed = false AND archived = false;

-- =====================================================
-- 3. ACTIVITIES TABLE (call/email/meeting logging)
-- =====================================================
CREATE TABLE public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.crm_agents(id) NOT NULL,
  
  activity_type TEXT NOT NULL,
  outcome TEXT,
  call_duration INTEGER,
  
  subject TEXT,
  notes TEXT NOT NULL,
  
  -- Follow-up tracking
  callback_requested BOOLEAN DEFAULT false,
  callback_datetime TIMESTAMPTZ,
  callback_notes TEXT,
  callback_completed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ
);

CREATE INDEX idx_crm_activities_lead ON public.crm_activities(lead_id, created_at DESC);
CREATE INDEX idx_crm_activities_agent ON public.crm_activities(agent_id, created_at DESC);

-- =====================================================
-- 4. REMINDERS TABLE
-- =====================================================
CREATE TABLE public.crm_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.crm_agents(id) NOT NULL,
  activity_id UUID REFERENCES public.crm_activities(id),
  
  reminder_type TEXT DEFAULT 'callback',
  reminder_datetime TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Notification status
  send_email BOOLEAN DEFAULT true,
  send_slack BOOLEAN DEFAULT true,
  email_sent BOOLEAN DEFAULT false,
  slack_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  
  -- Completion
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_reminders_datetime ON public.crm_reminders(reminder_datetime, is_completed) WHERE is_completed = false;
CREATE INDEX idx_crm_reminders_agent ON public.crm_reminders(agent_id, is_completed, reminder_datetime);

-- =====================================================
-- 5. LEAD NOTES TABLE
-- =====================================================
CREATE TABLE public.crm_lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.crm_agents(id) NOT NULL,
  
  note_type TEXT DEFAULT 'private',
  note_text TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_notes_lead ON public.crm_lead_notes(lead_id, created_at DESC);
CREATE INDEX idx_crm_notes_agent ON public.crm_lead_notes(agent_id, created_at DESC);

-- =====================================================
-- 6. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE public.crm_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.crm_agents(id) NOT NULL,
  lead_id UUID REFERENCES public.crm_leads(id),
  
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_notifications_agent ON public.crm_notifications(agent_id, read, created_at DESC);

-- =====================================================
-- SECURITY DEFINER FUNCTIONS (for RLS without recursion)
-- =====================================================

-- Check if user is a CRM agent
CREATE OR REPLACE FUNCTION public.is_crm_agent(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_agents
    WHERE id = _user_id AND is_active = true
  )
$$;

-- Check if agent can access lead (assigned or matching language for unclaimed)
CREATE OR REPLACE FUNCTION public.can_access_lead(_user_id UUID, _lead_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_leads l
    LEFT JOIN public.crm_agents a ON a.id = _user_id
    WHERE l.id = _lead_id
    AND (
      l.assigned_agent_id = _user_id
      OR public.is_admin(_user_id)
      OR (l.lead_claimed = false AND a.languages @> ARRAY[l.language])
    )
  )
$$;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- CRM Agents table
ALTER TABLE public.crm_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own profile"
ON public.crm_agents FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Agents can update own profile"
ON public.crm_agents FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can manage all agents"
ON public.crm_agents FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- CRM Leads table
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see assigned or claimable leads"
ON public.crm_leads FOR SELECT
TO authenticated
USING (
  assigned_agent_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR (lead_claimed = false AND EXISTS (
    SELECT 1 FROM public.crm_agents a
    WHERE a.id = auth.uid() AND a.languages @> ARRAY[language]
  ))
);

CREATE POLICY "Agents can update assigned leads"
ON public.crm_leads FOR UPDATE
TO authenticated
USING (
  assigned_agent_id = auth.uid()
  OR public.is_admin(auth.uid())
);

CREATE POLICY "System can insert leads"
ON public.crm_leads FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can delete leads"
ON public.crm_leads FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- CRM Activities table
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see activities for accessible leads"
ON public.crm_activities FOR SELECT
TO authenticated
USING (
  agent_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.can_access_lead(auth.uid(), lead_id)
);

CREATE POLICY "Agents can insert own activities"
ON public.crm_activities FOR INSERT
TO authenticated
WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own activities"
ON public.crm_activities FOR UPDATE
TO authenticated
USING (agent_id = auth.uid() OR public.is_admin(auth.uid()));

-- CRM Reminders table
ALTER TABLE public.crm_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see own reminders"
ON public.crm_reminders FOR SELECT
TO authenticated
USING (agent_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Agents can manage own reminders"
ON public.crm_reminders FOR ALL
TO authenticated
USING (agent_id = auth.uid());

-- CRM Lead Notes table
ALTER TABLE public.crm_lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see own notes or shared"
ON public.crm_lead_notes FOR SELECT
TO authenticated
USING (
  agent_id = auth.uid()
  OR note_type = 'shared'
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Agents can manage own notes"
ON public.crm_lead_notes FOR ALL
TO authenticated
USING (agent_id = auth.uid());

-- CRM Notifications table
ALTER TABLE public.crm_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see own notifications"
ON public.crm_notifications FOR SELECT
TO authenticated
USING (agent_id = auth.uid());

CREATE POLICY "Agents can update own notifications"
ON public.crm_notifications FOR UPDATE
TO authenticated
USING (agent_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON public.crm_notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- TRIGGERS FOR AUTOMATION
-- =====================================================

-- Update agent updated_at
CREATE TRIGGER update_crm_agents_updated_at
BEFORE UPDATE ON public.crm_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update lead updated_at
CREATE TRIGGER update_crm_leads_updated_at
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update note updated_at
CREATE TRIGGER update_crm_notes_updated_at
BEFORE UPDATE ON public.crm_lead_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update days_since_last_contact and contact counts
CREATE OR REPLACE FUNCTION public.update_lead_contact_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.crm_leads
  SET 
    last_contact_at = NOW(),
    days_since_last_contact = 0,
    total_contacts = total_contacts + 1,
    first_contact_at = COALESCE(first_contact_at, NOW())
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_activity_created
AFTER INSERT ON public.crm_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_lead_contact_stats();

-- Function to update agent lead count when lead assigned
CREATE OR REPLACE FUNCTION public.update_agent_lead_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Decrement old agent count if changed
  IF OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id THEN
    IF OLD.assigned_agent_id IS NOT NULL THEN
      UPDATE public.crm_agents
      SET current_lead_count = GREATEST(0, current_lead_count - 1)
      WHERE id = OLD.assigned_agent_id;
    END IF;
    
    -- Increment new agent count
    IF NEW.assigned_agent_id IS NOT NULL THEN
      UPDATE public.crm_agents
      SET current_lead_count = current_lead_count + 1
      WHERE id = NEW.assigned_agent_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_assignment_change
AFTER UPDATE OF assigned_agent_id ON public.crm_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_agent_lead_count();

-- Also handle on insert
CREATE OR REPLACE FUNCTION public.update_agent_lead_count_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_agent_id IS NOT NULL THEN
    UPDATE public.crm_agents
    SET current_lead_count = current_lead_count + 1
    WHERE id = NEW.assigned_agent_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_created_with_agent
AFTER INSERT ON public.crm_leads
FOR EACH ROW
WHEN (NEW.assigned_agent_id IS NOT NULL)
EXECUTE FUNCTION public.update_agent_lead_count_on_insert();