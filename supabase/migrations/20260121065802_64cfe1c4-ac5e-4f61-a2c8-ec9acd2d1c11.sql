-- Create routing rules table for lead auto-assignment
CREATE TABLE IF NOT EXISTS public.crm_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Matching Criteria (ALL must match for rule to apply)
  match_language TEXT[] DEFAULT '{}',
  match_page_type TEXT[] DEFAULT '{}',
  match_page_slug TEXT[] DEFAULT '{}',
  match_lead_source TEXT[] DEFAULT '{}',
  match_lead_segment TEXT[] DEFAULT '{}',
  match_budget_range TEXT[] DEFAULT '{}',
  match_property_type TEXT[] DEFAULT '{}',
  match_timeframe TEXT[] DEFAULT '{}',
  
  -- Assignment Target
  assign_to_agent_id UUID NOT NULL REFERENCES public.crm_agents(id) ON DELETE CASCADE,
  fallback_to_broadcast BOOLEAN DEFAULT true,
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_matched_at TIMESTAMPTZ,
  total_matches INTEGER DEFAULT 0
);

-- Add routing_rule_id to crm_leads for tracking
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS routing_rule_id UUID REFERENCES public.crm_routing_rules(id) ON DELETE SET NULL;

-- Index for fast rule lookup (active rules sorted by priority)
CREATE INDEX IF NOT EXISTS idx_crm_routing_rules_active_priority 
ON public.crm_routing_rules(is_active, priority DESC) 
WHERE is_active = true;

-- Index for lead lookups by routing rule
CREATE INDEX IF NOT EXISTS idx_crm_leads_routing_rule 
ON public.crm_leads(routing_rule_id) 
WHERE routing_rule_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.crm_routing_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can manage routing rules
CREATE POLICY "Admins can view all routing rules"
ON public.crm_routing_rules FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create routing rules"
ON public.crm_routing_rules FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update routing rules"
ON public.crm_routing_rules FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete routing rules"
ON public.crm_routing_rules FOR DELETE
USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_crm_routing_rules_updated_at
BEFORE UPDATE ON public.crm_routing_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for routing rules
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_routing_rules;