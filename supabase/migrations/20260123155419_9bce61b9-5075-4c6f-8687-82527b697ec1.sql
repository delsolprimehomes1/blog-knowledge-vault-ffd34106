-- Drop Slack-related tables
DROP TABLE IF EXISTS public.agent_slack_channels;
DROP TABLE IF EXISTS public.slack_channels;

-- Remove Slack columns from crm_agents
ALTER TABLE public.crm_agents 
  DROP COLUMN IF EXISTS slack_channel_id,
  DROP COLUMN IF EXISTS slack_user_id;

-- Remove send_slack column from crm_reminders if it exists
ALTER TABLE public.crm_reminders 
  DROP COLUMN IF EXISTS send_slack;