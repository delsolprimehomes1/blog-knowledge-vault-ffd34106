-- Add urgent_emails_enabled column to crm_agents
ALTER TABLE crm_agents
ADD COLUMN IF NOT EXISTS urgent_emails_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN crm_agents.urgent_emails_enabled IS 
  'Whether agent receives high-priority urgent email alerts (red banner template)';