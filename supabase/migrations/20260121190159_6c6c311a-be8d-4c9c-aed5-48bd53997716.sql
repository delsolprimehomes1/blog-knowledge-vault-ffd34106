-- Create slack_channels cache table
CREATE TABLE public.slack_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  member_count INTEGER,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agent_slack_channels junction table for many-to-many
CREATE TABLE public.agent_slack_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.crm_agents(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, channel_id)
);

-- Add slack_notifications toggle to crm_agents
ALTER TABLE public.crm_agents 
ADD COLUMN IF NOT EXISTS slack_notifications BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.slack_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_slack_channels ENABLE ROW LEVEL SECURITY;

-- RLS policies for slack_channels (readable by all CRM agents, writable by admins)
CREATE POLICY "CRM agents can view slack channels"
ON public.slack_channels FOR SELECT
USING (public.is_crm_agent(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage slack channels"
ON public.slack_channels FOR ALL
USING (public.is_admin(auth.uid()));

-- RLS policies for agent_slack_channels
CREATE POLICY "Agents can view their own slack channels"
ON public.agent_slack_channels FOR SELECT
USING (agent_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage agent slack channels"
ON public.agent_slack_channels FOR ALL
USING (public.is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_agent_slack_channels_agent ON public.agent_slack_channels(agent_id);
CREATE INDEX idx_agent_slack_channels_channel ON public.agent_slack_channels(channel_id);