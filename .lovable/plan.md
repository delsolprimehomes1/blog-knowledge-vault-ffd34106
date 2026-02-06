

# Fix: Phone Number Display Showing "XX XX+" on Lead Dashboards

## Problem Identified

The display shows `XX XX+17027678743` because of **corrupted data in the database**:

| Field | Expected Value | Actual Value |
|-------|----------------|--------------|
| `phone_number` | `+17027678743` | `XX+17027678743` |
| `country_prefix` | `+1` | `XX` |
| `country_flag` | `🇺🇸` | `null` |
| `country_name` | `United States` | `null` |

The "4 X's" come from:
1. `country_prefix` = "XX" (first two X's)
2. `phone_number` starts with "XX" (second two X's)

---

## Root Cause

The Emma chatbot's `extractCountryFromPrefix()` function only works when the phone starts with `+`. If someone enters `XX+17027678743` or any non-standard format, the country extraction fails and defaults to "XX".

---

## Two-Part Solution

### Part 1: Clean Existing Bad Data (Database Fix)

Update leads that have malformed phone numbers with "XX" prefix:

```sql
-- Fix leads where phone_number starts with "XX+"
UPDATE crm_leads
SET 
  phone_number = REGEXP_REPLACE(phone_number, '^XX\+', '+'),
  country_prefix = REGEXP_REPLACE(phone_number, '^XX(\+\d{1,4}).*', '\1'),
  country_code = CASE 
    WHEN phone_number LIKE 'XX+1%' THEN 'US'
    WHEN phone_number LIKE 'XX+34%' THEN 'ES'
    WHEN phone_number LIKE 'XX+31%' THEN 'NL'
    -- etc.
  END,
  country_flag = CASE 
    WHEN phone_number LIKE 'XX+1%' THEN '🇺🇸'
    WHEN phone_number LIKE 'XX+34%' THEN '🇪🇸'
    WHEN phone_number LIKE 'XX+31%' THEN '🇳🇱'
    -- etc.
  END,
  country_name = CASE 
    WHEN phone_number LIKE 'XX+1%' THEN 'United States'
    WHEN phone_number LIKE 'XX+34%' THEN 'Spain'
    WHEN phone_number LIKE 'XX+31%' THEN 'Netherlands'
    -- etc.
  END
WHERE phone_number LIKE 'XX+%';
```

### Part 2: Defensive UI Display

Update the UI to:
1. Not display "XX" as a country prefix (it's not valid)
2. Strip "XX" from phone number display if present
3. Only show country flag/prefix when they're actually valid

```typescript
// In LeadsOverview.tsx - only show prefix if it starts with "+"
{(lead as any).country_prefix && (lead as any).country_prefix.startsWith('+') && (
  <span className="font-medium">{(lead as any).country_prefix}</span>
)}

// Strip any leading "XX" from phone display
{lead.phone_number?.replace(/^XX\+?/, '+')}
```

---

## Files to Modify

| File | Change |
|------|--------|
| Database migration | Clean up existing bad data |
| `src/pages/crm/admin/LeadsOverview.tsx` | Defensive display - hide invalid "XX" prefix, clean phone display |
| `src/components/crm/LeadsTable.tsx` | Same defensive display logic |
| `src/components/crm/MobileLeadCard.tsx` | Same defensive display logic |
| `supabase/functions/emma-chat/index.ts` | (Optional) Add validation to strip "XX" from phone input before processing |

---

## Expected Result

| Before | After |
|--------|-------|
| `XX XX+17027678743` | `+1 7027678743` or just `+17027678743` |
| No flag visible | 🇺🇸 (after data cleanup) |

The fix ensures both existing bad data is corrected AND future displays gracefully handle any edge cases.

