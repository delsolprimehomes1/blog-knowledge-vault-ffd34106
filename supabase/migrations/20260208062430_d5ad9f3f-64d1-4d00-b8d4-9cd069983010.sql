-- Add column to track 10-minute email notifications separately
ALTER TABLE crm_reminders 
ADD COLUMN IF NOT EXISTS email_10min_sent boolean DEFAULT false;