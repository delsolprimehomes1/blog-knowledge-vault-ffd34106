

# Fix Fallback Admin for All Languages

## Problem
6 out of 10 languages have Steven Roberts as the fallback admin instead of Hans. This caused the French lead failure -- Hans never received the T+5 notification because Steven was configured as the fallback.

**Current state in database:**
- Hans (correct): da, de, fi, pl
- Steven (wrong): en, fr, hu, nl, no, sv

## Fix

### Step 1: Update all 6 configs to Hans
Run a single UPDATE to set `fallback_admin_id` to Hans's UUID (`95808453-dde1-421c-85ba-52fe534ef288`) on all rows where it's currently Steven's UUID (`288f9795-c3c5-47c2-8aae-e2cd408e862a`).

```sql
UPDATE crm_round_robin_config 
SET fallback_admin_id = '95808453-dde1-421c-85ba-52fe534ef288'
WHERE fallback_admin_id = '288f9795-c3c5-47c2-8aae-e2cd408e862a';
```

### Step 2: Verify
Query all configs to confirm every language now shows Hans as fallback.

### Step 3: Investigate UI save bug
Review the `RoundRobinConfig.tsx` save logic to check if there's a condition that could revert the `fallback_admin_id` back to Steven when saving (e.g., the `is_admin_fallback` conditional on line 152 that nulls out `fallback_admin_id` when the toggle is off).

## Result
After this fix, Hans will receive ALL T+5 admin escalation emails for every language, including French.
