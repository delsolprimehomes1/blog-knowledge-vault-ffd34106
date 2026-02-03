

# Create Contact Window Expiry Monitoring Cron Job

## Overview

Create a new edge function `check-contact-window-expiry` that monitors Stage 2 SLA (contact timer) and sends admin notifications when agents claim leads but fail to make contact within 5 minutes. This completes the dual-stage SLA monitoring system.

---

## Architecture Context

The CRM has a dual-stage SLA system:

```text
Stage 1: CLAIM WINDOW (5 min)      Stage 2: CONTACT WINDOW (5 min)
┌──────────────────────────┐       ┌──────────────────────────┐
│ claim_timer_expires_at   │  -->  │ contact_timer_expires_at │
│ claim_sla_breached       │       │ contact_sla_breached     │
└──────────────────────────┘       └──────────────────────────┘
         │                                   │
         ▼                                   ▼
  check-claim-window-expiry           check-contact-window-expiry
       (deployed)                           (NEW)
```

---

## Deliverables

### 1. New Edge Function

**File**: `supabase/functions/check-contact-window-expiry/index.ts`

The function will:
- Query leads where `contact_timer_expires_at < NOW()` and `contact_sla_breached = false` and `lead_claimed = true` and `first_action_completed = false`
- Mark each lead as `contact_sla_breached = true`
- Get the assigned agent's details
- Look up the language-specific fallback admin from `crm_round_robin_config`
- Send email notification via Resend with lead and agent details
- Create in-app notification for the admin
- Log activity for audit trail

Key query:
```typescript
const { data: expiredLeads } = await supabase
  .from("crm_leads")
  .select("*")
  .lt("contact_timer_expires_at", new Date().toISOString())
  .eq("lead_claimed", true)
  .eq("first_action_completed", false)
  .eq("contact_sla_breached", false)
  .eq("archived", false);
```

### 2. Config.toml Update

Add new function configuration:
```toml
[functions.check-contact-window-expiry]
verify_jwt = false
```

### 3. Cron Job SQL

Add to `supabase/cron_jobs.sql`:
```sql
SELECT cron.schedule(
  'check-contact-window-expiry',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kazggnufaoicopvmwhdl.supabase.co/functions/v1/check-contact-window-expiry',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Function Flow

```text
check-contact-window-expiry (runs every 1 minute)
         │
         ▼
    Query: contact_timer_expires_at < NOW()
           AND lead_claimed = true
           AND first_action_completed = false
           AND contact_sla_breached = false
         │
         ▼
    For each expired lead:
         │
    ┌────┴────────────────────────────────────┐
    │                                          │
    ▼                                          ▼
  Update lead:                          Get agent + admin details
  contact_sla_breached = true           from crm_agents + round_robin_config
                                               │
                                               ▼
                                        Send email via Resend
                                        Create notification
                                        Log activity
```

---

## Difference from Stage 1 (Claim Window)

| Aspect | Stage 1 (Claim) | Stage 2 (Contact) |
|--------|-----------------|-------------------|
| Timer Field | `claim_timer_expires_at` | `contact_timer_expires_at` |
| Breach Field | `claim_sla_breached` | `contact_sla_breached` |
| Condition | `lead_claimed = false` | `lead_claimed = true` + `first_action_completed = false` |
| Issue | No agent claimed | Agent claimed but didn't call |
| Email Subject | "Lead Unclaimed" | "Agent Claimed But No Contact" |
| Agent Info | N/A | Included in email |

---

## Email Template

The admin email will include:

- Lead details (name, phone, email, language)
- Agent details (name, email, when claimed)
- Elapsed time since claim
- Clear situation summary
- Direct link to admin leads page for reassignment

---

## Technical Details

### Pattern Match

Following the same robust pattern as `check-claim-window-expiry`:
- CORS headers for manual triggering
- Separate queries for round-robin config and agent details
- Error handling per lead (continue on individual failures)
- Comprehensive logging

### Dependencies

- `RESEND_API_KEY` - already configured
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - auto-provided
- `APP_URL` - for email links (fallback: production URL)

---

## Files to Create/Modify

1. **Create**: `supabase/functions/check-contact-window-expiry/index.ts`
2. **Modify**: `supabase/config.toml` - add function config
3. **Modify**: `supabase/cron_jobs.sql` - add cron schedule

---

## Verification Steps

After deployment:

1. Deploy the edge function
2. Run the cron SQL in Cloud View > Run SQL
3. Claim a test lead but don't make any calls
4. Wait 5+ minutes
5. Verify:
   - `contact_sla_breached` becomes `true`
   - Admin receives email notification with agent details
   - In-app notification created in `crm_notifications`
   - Activity logged in `crm_activities`

