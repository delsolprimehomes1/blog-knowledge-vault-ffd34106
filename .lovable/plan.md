

# Database Schema Update: Add Country Columns

## Overview

Add three new columns to both `emma_leads` and `crm_leads` tables to store country information that Emma now extracts from phone numbers with international prefixes.

---

## New Columns

| Column | Type | Purpose | Example |
|--------|------|---------|---------|
| `country_name` | TEXT | Full country name | "Belgium" |
| `country_code` | TEXT | ISO 2-letter code | "BE" |
| `country_flag` | TEXT | Flag emoji | "🇧🇪" |

---

## SQL Migration

```sql
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
```

---

## Data Flow

After this migration, the Emma chatbot flow will work as follows:

1. User provides phone number with country code (e.g., `+32 471 234 567`)
2. Emma extracts the prefix (`+32`) and looks up the country
3. Emma stores:
   - `phone_number`: `+32471234567`
   - `country_prefix`: `+32`
   - `country_name`: `Belgium`
   - `country_code`: `BE`
   - `country_flag`: `🇧🇪`

---

## Impact

- **No breaking changes** - All new columns are nullable
- **Existing data unaffected** - Old leads will have NULL country fields
- **Ready for notification updates** - Agent emails can now display country/origin info

