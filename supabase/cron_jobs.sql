-- ==============================================
-- CRM AUTOMATION CRON JOBS
-- Project: kazggnufaoicopvmwhdl
-- 
-- IMPORTANT: Run this SQL manually in Lovable Cloud View > Run SQL
-- or in Supabase Dashboard > SQL Editor
-- ==============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant cron access to postgres
GRANT USAGE ON SCHEMA cron TO postgres;

-- ==============================================
-- 1. CHECK SLA BREACHES - Every 1 minute
-- Detects leads without first action within timeout, escalates to admin
-- ==============================================
SELECT cron.schedule(
  'check-sla-breaches',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kazggnufaoicopvmwhdl.supabase.co/functions/v1/check-sla-breaches',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthemdnbnVmYW9pY29wdm13aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzM0ODEsImV4cCI6MjA3NjEwOTQ4MX0.acQwC_xPXFXvOwwn7IATeg6OwQ2HWlu52x76iqUdhB4"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- ==============================================
-- 2. CHECK UNCLAIMED LEADS - Every 1 minute
-- Escalates leads whose claim window expired to next round or admin
-- ==============================================
SELECT cron.schedule(
  'check-unclaimed-leads',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kazggnufaoicopvmwhdl.supabase.co/functions/v1/check-unclaimed-leads',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthemdnbnVmYW9pY29wdm13aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzM0ODEsImV4cCI6MjA3NjEwOTQ4MX0.acQwC_xPXFXvOwwn7IATeg6OwQ2HWlu52x76iqUdhB4"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- ==============================================
-- 3. RELEASE NIGHT-HELD LEADS - Daily at 09:00 Madrid time
-- 07:00 UTC = 09:00 Europe/Madrid (winter), 08:00 Europe/Madrid (summer)
-- Adjust as needed for DST
-- ==============================================
SELECT cron.schedule(
  'release-night-held-leads',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kazggnufaoicopvmwhdl.supabase.co/functions/v1/release-night-held-leads',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthemdnbnVmYW9pY29wdm13aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzM0ODEsImV4cCI6MjA3NjEwOTQ4MX0.acQwC_xPXFXvOwwn7IATeg6OwQ2HWlu52x76iqUdhB4"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- ==============================================
-- 4. SEND REMINDER EMAILS - Every hour at :00
-- Sends email reminders to agents for upcoming callbacks/meetings
-- ==============================================
SELECT cron.schedule(
  'send-reminder-emails',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kazggnufaoicopvmwhdl.supabase.co/functions/v1/send-reminder-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthemdnbnVmYW9pY29wdm13aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzM0ODEsImV4cCI6MjA3NjEwOTQ4MX0.acQwC_xPXFXvOwwn7IATeg6OwQ2HWlu52x76iqUdhB4"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- ==============================================
-- UTILITY COMMANDS (for reference)
-- ==============================================

-- View all scheduled jobs:
-- SELECT * FROM cron.job;

-- View job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Unschedule a specific job:
-- SELECT cron.unschedule('job-name-here');

-- Unschedule all CRM jobs (if needed):
-- SELECT cron.unschedule('check-sla-breaches');
-- SELECT cron.unschedule('check-unclaimed-leads');
-- SELECT cron.unschedule('release-night-held-leads');
-- SELECT cron.unschedule('send-reminder-emails');
