-- ================================================
-- SALESTRAIL CALL TRACKING INTEGRATION
-- Purely additive changes - no existing data affected
-- ================================================

-- 1. Add Salestrail columns to crm_activities
ALTER TABLE public.crm_activities
ADD COLUMN IF NOT EXISTS salestrail_call_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS salestrail_recording_url TEXT,
ADD COLUMN IF NOT EXISTS salestrail_transcription TEXT,
ADD COLUMN IF NOT EXISTS call_direction TEXT,
ADD COLUMN IF NOT EXISTS call_answered BOOLEAN,
ADD COLUMN IF NOT EXISTS salestrail_metadata JSONB;

-- 2. Add CHECK constraint for call_direction
ALTER TABLE public.crm_activities
ADD CONSTRAINT crm_activities_call_direction_check 
CHECK (call_direction IS NULL OR call_direction IN ('inbound', 'outbound'));

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_activities_salestrail_call_id 
ON public.crm_activities (salestrail_call_id) 
WHERE salestrail_call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_activities_call_direction 
ON public.crm_activities (call_direction) 
WHERE call_direction IS NOT NULL;

-- 4. Add comments for documentation
COMMENT ON COLUMN public.crm_activities.salestrail_call_id IS 
'Unique call ID from Salestrail - used for webhook deduplication';

COMMENT ON COLUMN public.crm_activities.salestrail_recording_url IS 
'URL to call recording from Salestrail';

COMMENT ON COLUMN public.crm_activities.salestrail_transcription IS 
'Call transcription from Salestrail (if available)';

COMMENT ON COLUMN public.crm_activities.call_direction IS 
'Call direction: inbound or outbound';

COMMENT ON COLUMN public.crm_activities.call_answered IS 
'Whether the call was answered';

COMMENT ON COLUMN public.crm_activities.salestrail_metadata IS 
'Full Salestrail webhook payload for audit purposes';