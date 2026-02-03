-- Stage 1: Claim Window columns
ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS claim_timer_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS claim_timer_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS claim_sla_breached BOOLEAN DEFAULT FALSE;

-- Stage 2: Contact Window columns  
ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS contact_timer_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS contact_timer_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS contact_sla_breached BOOLEAN DEFAULT FALSE;

-- Reassignment tracking columns
ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS reassignment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS previous_agent_id UUID REFERENCES crm_agents(id),
ADD COLUMN IF NOT EXISTS reassignment_reason TEXT,
ADD COLUMN IF NOT EXISTS reassigned_at TIMESTAMPTZ;

-- Partial indexes for timer queries
CREATE INDEX IF NOT EXISTS idx_crm_leads_claim_timer_expires 
ON crm_leads(claim_timer_expires_at) 
WHERE claim_timer_expires_at IS NOT NULL AND lead_claimed = FALSE;

CREATE INDEX IF NOT EXISTS idx_crm_leads_contact_timer_expires 
ON crm_leads(contact_timer_expires_at) 
WHERE contact_timer_expires_at IS NOT NULL AND first_action_completed = FALSE;

-- Reassignment history table
CREATE TABLE IF NOT EXISTS crm_lead_reassignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES crm_agents(id),
  to_agent_id UUID NOT NULL REFERENCES crm_agents(id),
  reassigned_by UUID NOT NULL REFERENCES crm_agents(id),
  reason TEXT NOT NULL CHECK (reason IN ('unclaimed', 'no_contact', 'manual')),
  stage TEXT NOT NULL CHECK (stage IN ('claim_window', 'contact_window', 'manual')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reassignment queries
CREATE INDEX IF NOT EXISTS idx_reassignments_lead 
ON crm_lead_reassignments(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reassignments_from_agent 
ON crm_lead_reassignments(from_agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reassignments_to_agent 
ON crm_lead_reassignments(to_agent_id, created_at DESC);

-- Enable RLS
ALTER TABLE crm_lead_reassignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using existing is_admin pattern)
CREATE POLICY "Admins can view all reassignments"
  ON crm_lead_reassignments FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Agents can view own reassignments"
  ON crm_lead_reassignments FOR SELECT
  USING (from_agent_id = auth.uid() OR to_agent_id = auth.uid());

CREATE POLICY "Service role can insert reassignments"
  ON crm_lead_reassignments FOR INSERT
  WITH CHECK (true);

-- Column documentation
COMMENT ON COLUMN crm_leads.claim_timer_started_at IS 
'When the lead was created and claim window started';

COMMENT ON COLUMN crm_leads.claim_timer_expires_at IS 
'When the 5-minute claim window expires (5 min after creation)';

COMMENT ON COLUMN crm_leads.contact_timer_started_at IS 
'When the lead was claimed and contact window started';

COMMENT ON COLUMN crm_leads.contact_timer_expires_at IS 
'When the 5-minute contact window expires (5 min after claim)';