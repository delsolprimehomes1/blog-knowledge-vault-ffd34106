

# Add Missing Language Configurations to crm_round_robin_config

## Current Blocker

The database is returning connection timeout errors. This plan will be executed once the database recovers.

## Step 1: Get Steven Roberts' Agent ID

```text
SELECT id, email, name 
FROM crm_agents 
WHERE email = 'steven@delsolprimehomes.com';
```

## Step 2: Check Existing Languages

```text
SELECT language 
FROM crm_round_robin_config 
ORDER BY language;
```

This confirms which of ES, SV, DA, HU, NO are truly missing (to avoid duplicate key errors).

## Step 3: Insert Missing Language Rows

Using Steven's UUID from Step 1:

```text
INSERT INTO crm_round_robin_config 
  (language, agent_ids, fallback_admin_id, claim_window_minutes, is_active)
VALUES
  ('es', ARRAY['<steven_id>']::uuid[], '<steven_id>', 5, true),
  ('sv', ARRAY['<steven_id>']::uuid[], '<steven_id>', 5, true),
  ('da', ARRAY['<steven_id>']::uuid[], '<steven_id>', 5, true),
  ('hu', ARRAY['<steven_id>']::uuid[], '<steven_id>', 5, true),
  ('no', ARRAY['<steven_id>']::uuid[], '<steven_id>', 5, true);
```

If any of these languages already exist, they will be skipped or handled individually.

## Step 4: Verify Complete Table

```text
SELECT rr.language, rr.agent_ids, rr.fallback_admin_id, rr.claim_window_minutes, rr.is_active,
  (SELECT email FROM crm_agents WHERE id = rr.fallback_admin_id) as admin_email
FROM crm_round_robin_config rr
ORDER BY rr.language;
```

## What This Enables

- Leads arriving in ES, SV, DA, HU, NO will now match a `crm_round_robin_config` row
- The `send-escalating-alarms` cron (every 1 min) will find these leads and send T+0 through T+4 notifications to Steven
- The `check-claim-window-expiry` cron will send T+5 admin escalation to Steven (as fallback_admin_id)
- `claim_window_minutes: 5` matches the existing standard across all languages

## What Does NOT Change

- No code changes to any edge functions
- No schema changes
- Existing language configurations (EN, DE, NL, FR, FI, PL) are untouched
- Steven's agent record remains unchanged

## Note

The UUIDs must be looked up live from `crm_agents` before inserting. This plan executes as soon as the database connection is stable.

