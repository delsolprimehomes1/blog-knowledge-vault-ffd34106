-- Add country columns to emma_leads
ALTER TABLE emma_leads 
ADD COLUMN IF NOT EXISTS country_name TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS country_flag TEXT;

-- Add country columns to crm_leads
ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS country_name TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS country_flag TEXT;

-- Add index for efficient country-based filtering
CREATE INDEX IF NOT EXISTS idx_crm_leads_country_name 
ON crm_leads(country_name) 
WHERE country_name IS NOT NULL;