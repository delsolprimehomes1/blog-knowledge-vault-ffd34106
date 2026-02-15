
# Fix All 6 Language Configuration Bugs

## Summary

French, English, Finnish, and Dutch are working correctly. Six languages (DA, DE, HU, NO, SV, PL) have configuration bugs preventing proper lead routing.

## Fixes (All Database Updates -- No Code Changes Needed)

### Fix 1: Update round_number from 0 to 1 for DA, HU, SV, NO

The `register-crm-lead` function queries for `round_number = 1`. These 4 languages have `round_number = 0` and will never match.

```text
UPDATE crm_round_robin_config 
SET round_number = 1 
WHERE language IN ('da', 'hu', 'sv', 'no') AND round_number = 0;
```

### Fix 2: Set is_admin_fallback = true for NO

Norwegian is the only language where `is_admin_fallback` is `false`, preventing T+5 admin notifications.

```text
UPDATE crm_round_robin_config 
SET is_admin_fallback = true 
WHERE language = 'no';
```

### Fix 3: Update Steven Roberts' languages array

Steven is listed in the DA, DE, HU, SV, NO round-robin configs but his agent profile only has `[en]`. The `claim_lead` function will reject his claims for non-English leads.

```text
UPDATE crm_agents 
SET languages = ARRAY['en', 'da', 'de', 'hu', 'sv', 'no'] 
WHERE id = '288f9795-c3c5-47c2-8aae-e2cd408e862a';
```

### Fix 4: Add 'no' to Hans's languages array

Hans is the fallback admin for Norwegian but his agent profile is missing `no`.

```text
UPDATE crm_agents 
SET languages = ARRAY['en', 'fr', 'nl', 'es', 'de', 'fi', 'pl', 'sv', 'hu', 'da', 'no'] 
WHERE id = '95808453-dde1-421c-85ba-52fe534ef288';
```

### Fix 5: Add Artur to PL round-robin config

Artur (active PL agent) is not in the PL config. Currently only Hans is listed, meaning PL leads skip the agent pool entirely.

```text
UPDATE crm_round_robin_config 
SET agent_ids = ARRAY[
  '00286f6c-725f-45e3-8d4a-51e06123357b',
  '95808453-dde1-421c-85ba-52fe534ef288'
]::uuid[] 
WHERE language = 'pl';
```

### Fix 6: Add Mary Seal to EN round-robin config

Mary Seal is an active English agent with 10 leads but is not in the EN round-robin config.

```text
UPDATE crm_round_robin_config 
SET agent_ids = ARRAY[
  '288f9795-c3c5-47c2-8aae-e2cd408e862a',
  '45898ffd-3405-4a15-9537-d4ae3954e57e',
  '95808453-dde1-421c-85ba-52fe534ef288'
]::uuid[] 
WHERE language = 'en';
```

## Post-Fix State

After all fixes, every language will have:
- `round_number = 1` (matches register-crm-lead query)
- `is_admin_fallback = true` (enables T+5 admin notifications)  
- `fallback_admin_id = Hans` (consistent admin coverage)
- At least 1 non-admin agent in the pool
- All agents' `languages` arrays matching their round-robin assignments

## No Code Changes Required

All fixes are data corrections. The edge functions are language-agnostic and will work correctly once the configuration data is fixed.
