

# Create Escalating Alarms Edge Function

## Overview

Create a new edge function `send-escalating-alarms` that runs every minute via cron job and sends escalating email notifications (levels 1-4) during the claim window. This complements the existing alarm system:

- **Level 0**: Initial "New Lead" email (already sent by `register-crm-lead`)
- **Levels 1-4**: Escalating alarms sent by this new function (1, 2, 3, 4 minutes after creation)
- **Level 5+**: Admin escalation (handled by existing `check-claim-window-expiry`)

---

## Alarm Timeline

```text
T+0: Lead Created → Initial broadcast email (alarm level 0) ✓ [existing]
T+1: 1 minute passed → "⏰ 1 MIN PASSED" email (alarm level 1) [NEW]
T+2: 2 minutes passed → "⚠️ 2 MIN PASSED" email (alarm level 2) [NEW]
T+3: 3 minutes passed → "🚨 3 MIN PASSED" email (alarm level 3) [NEW]
T+4: 4 minutes passed → "🔥 4 MIN PASSED - FINAL WARNING" email (alarm level 4) [NEW]
T+5: 5 minutes passed → Admin escalation [existing check-claim-window-expiry]
```

---

## Implementation

### 1. Create Edge Function

**File**: `supabase/functions/send-escalating-alarms/index.ts`

The function will:
1. Query leads where `last_alarm_level` < target level AND enough time has passed
2. For each lead needing an alarm:
   - Get all agents for the lead's language from `crm_round_robin_config`
   - Send escalating email with level-specific styling (⏰/⚠️/🚨/🔥)
   - Update `last_alarm_level` to the new level
   - Log activity for audit trail

Key features:
- Uses level-specific emojis for Gmail filter support
- Final warning (level 4) includes prominent admin escalation warning
- Matches existing email template patterns from `send-lead-notification`
- Queries agents via `crm_round_robin_config.agent_ids` array

### 2. Register in Config

**File**: `supabase/config.toml`

Add configuration for the new function:
```toml
[functions.send-escalating-alarms]
verify_jwt = false
```

### 3. Schedule Cron Job

**File**: `supabase/cron_jobs.sql` (updated for documentation)

SQL to run manually:
```sql
SELECT cron.schedule(
  'send-escalating-alarms',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kazggnufaoicopvmwhdl.supabase.co/functions/v1/send-escalating-alarms',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthemdnbnVmYW9pY29wdm13aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzM0ODEsImV4cCI6MjA3NjEwOTQ4MX0.acQwC_xPXFXvOwwn7IATeg6OwQ2HWlu52x76iqUdhB4"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Email Template Design

Each level has unique styling for easy identification:

| Level | Emoji | Subject Pattern | Header Color |
|-------|-------|-----------------|--------------|
| 1 | ⏰ | 1 MIN PASSED | Yellow (#EAB308) |
| 2 | ⚠️ | 2 MIN PASSED | Orange (#F97316) |
| 3 | 🚨 | 3 MIN PASSED | Red-Orange (#EA580C) |
| 4 | 🔥 | 4 MIN PASSED - FINAL WARNING | Red (#DC2626) |

Example subject: `⚠️ 2 MIN PASSED - NEW LEAD EN #abc12345`

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/send-escalating-alarms/index.ts` | New edge function |
| `supabase/config.toml` | Add function configuration |
| `supabase/cron_jobs.sql` | Document new cron job |

---

## Technical Details

### Query Logic

For each alarm level (1-4), the function queries:
```sql
SELECT * FROM crm_leads
WHERE lead_claimed = FALSE
  AND claim_sla_breached = FALSE
  AND archived = FALSE
  AND last_alarm_level = [level - 1]
  AND claim_timer_started_at <= NOW() - INTERVAL '[level] minutes'
```

### Agent Resolution

The function resolves agents by:
1. Finding `crm_round_robin_config` for the lead's language
2. Querying `crm_agents` using the `agent_ids` array
3. Filtering to only active agents with valid emails

### Email Content

- Includes lead details: name, phone, email, language, source
- Shows elapsed time since creation
- Prominent "CLAIM THIS LEAD NOW" CTA button
- Level 4 includes explicit admin escalation warning

### Duplicate Prevention

- Each lead only receives each alarm level once (tracked by `last_alarm_level`)
- Alarm level is updated immediately after successful email send
- Index on `(last_alarm_level, claim_timer_started_at)` optimizes queries

---

## Testing Plan

After deployment:
1. Create a test lead via Emma chatbot
2. Monitor edge function logs for alarm processing
3. Check `crm_leads.last_alarm_level` increments correctly
4. Verify emails are received at T+1, T+2, T+3, T+4
5. Confirm admin escalation triggers at T+5 (existing flow)

