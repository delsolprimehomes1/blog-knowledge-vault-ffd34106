-- Create email logs table for tracking all automated emails
CREATE TABLE crm_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Email metadata
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL,
  
  -- Context references
  lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES crm_agents(id) ON DELETE SET NULL,
  reminder_id UUID REFERENCES crm_reminders(id) ON DELETE SET NULL,
  
  -- Trigger context
  triggered_by TEXT NOT NULL,
  trigger_reason TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  resend_message_id TEXT,
  
  -- Timestamps
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for quick lookups
CREATE INDEX idx_crm_email_logs_lead ON crm_email_logs(lead_id);
CREATE INDEX idx_crm_email_logs_agent ON crm_email_logs(agent_id);
CREATE INDEX idx_crm_email_logs_sent_at ON crm_email_logs(sent_at DESC);
CREATE INDEX idx_crm_email_logs_template ON crm_email_logs(template_type);
CREATE INDEX idx_crm_email_logs_triggered_by ON crm_email_logs(triggered_by);

-- Enable RLS
ALTER TABLE crm_email_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all email logs
CREATE POLICY "Admins can view all email logs"
  ON crm_email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crm_agents 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND is_active = true
    )
  );

-- Agents can view email logs for their leads
CREATE POLICY "Agents can view their email logs"
  ON crm_email_logs FOR SELECT
  USING (agent_id = auth.uid());

-- Service role can insert (for edge functions)
CREATE POLICY "Service can insert email logs"
  ON crm_email_logs FOR INSERT
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE crm_email_logs IS 'Tracks all automated emails sent by CRM edge functions for audit purposes';