-- Email tracking table for bidirectional email sync
CREATE TABLE email_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES crm_agents(id) NOT NULL,
  agent_email TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  cc_emails TEXT[],
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_email_tracking_lead_id ON email_tracking(lead_id);
CREATE INDEX idx_email_tracking_agent_id ON email_tracking(agent_id);
CREATE INDEX idx_email_tracking_direction ON email_tracking(direction);
CREATE INDEX idx_email_tracking_received_at ON email_tracking(received_at DESC);

-- RLS
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;

-- Agent policies
CREATE POLICY "Agents view own emails"
  ON email_tracking FOR SELECT
  USING (agent_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Agents update own emails"
  ON email_tracking FOR UPDATE
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "System can insert emails"
  ON email_tracking FOR INSERT
  WITH CHECK (true);

-- Webhook logs table for debugging
CREATE TABLE email_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_payload JSONB,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins view logs"
  ON email_webhook_logs FOR SELECT
  USING (public.is_admin(auth.uid()));