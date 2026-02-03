

# Create Claim Window Expiry Monitoring Cron Job

## Overview

Create a new edge function `check-claim-window-expiry` that monitors the Stage 1 SLA (claim timer) and sends admin notifications when leads go unclaimed past the 5-minute claim window. This function uses the new dual-stage SLA fields (`claim_timer_expires_at`, `claim_sla_breached`) introduced in our migration.

---

## Architecture Context

The CRM now has a dual-stage SLA system:

```text
Stage 1: CLAIM WINDOW (5 min)      Stage 2: CONTACT WINDOW (5 min)
┌──────────────────────────┐       ┌──────────────────────────┐
│ claim_timer_expires_at   │  -->  │ contact_timer_expires_at │
│ claim_sla_breached       │       │ contact_sla_breached     │
└──────────────────────────┘       └──────────────────────────┘
         │                                   │
         ▼                                   ▼
  check-claim-window-expiry           check-sla-breaches
       (NEW)                           (existing, repurpose)
```

---

## Deliverables

### 1. New Edge Function

**File**: `supabase/functions/check-claim-window-expiry/index.ts`

The function will:
- Query leads where `claim_timer_expires_at < NOW()` and `claim_sla_breached = false` and `lead_claimed = false`
- Mark each lead as `claim_sla_breached = true`
- Look up the language-specific fallback admin from `crm_round_robin_config`
- Send email notification via Resend with lead details and admin action link
- Create in-app notification for the admin
- Log activity for audit trail

Key query:
```typescript
const { data: expiredLeads } = await supabase
  .from("crm_leads")
  .select("*, crm_round_robin_config!inner(...)")
  .lt("claim_timer_expires_at", new Date().toISOString())
  .eq("lead_claimed", false)
  .eq("claim_sla_breached", false)
  .eq("archived", false);
```

### 2. Config.toml Update

Add new function configuration:
```toml
[functions.check-claim-window-expiry]
verify_jwt = false
```

### 3. Cron Job SQL

Add to `supabase/cron_jobs.sql`:
```sql
SELECT cron.schedule(
  'check-claim-window-expiry',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kazggnufaoicopvmwhdl.supabase.co/functions/v1/check-claim-window-expiry',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Function Flow

```text
check-claim-window-expiry (runs every 1 minute)
         │
         ▼
    Query: claim_timer_expires_at < NOW()
           AND lead_claimed = false
           AND claim_sla_breached = false
         │
         ▼
    For each expired lead:
         │
    ┌────┴────────────────────────────────────┐
    │                                          │
    ▼                                          ▼
  Update lead:                          Get fallback admin
  claim_sla_breached = true             from round_robin_config
                                               │
                                               ▼
                                        Send email via Resend
                                        Create notification
                                        Log activity
```

---

## Email Template

The admin email will include:

- Lead name, phone, email
- Language and source
- Time since creation (elapsed minutes)
- Direct link to admin leads page for reassignment
- Clear call-to-action button

---

## Technical Details

### Relation to Existing Functions

| Function | Purpose | Timer Field |
|----------|---------|-------------|
| `check-claim-window-expiry` (NEW) | Stage 1 SLA - notify admin of unclaimed leads | `claim_timer_expires_at` |
| `check-unclaimed-leads` | Escalation/round-robin logic | `claim_window_expires_at` |
| `check-sla-breaches` | Stage 2 SLA - notify admin of uncontacted leads | Uses `assigned_at` calculation |

### Dependencies

- `RESEND_API_KEY` - already configured
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - auto-provided
- `APP_URL` - for email links (fallback: production URL)

### Admin Lookup

```text
1. Query crm_round_robin_config for lead.language
2. Get fallback_admin_id
3. Join to crm_agents to get email
4. Send notification to that admin
```

---

## Verification Steps

After deployment:

1. Deploy the edge function
2. Run the cron SQL in Cloud View > Run SQL
3. Create a test lead and wait 5+ minutes without claiming
4. Verify:
   - `claim_sla_breached` becomes `true`
   - Admin receives email notification
   - In-app notification created in `crm_notifications`
   - Activity logged in `crm_activities`

---

## SQL to Manually Run

The cron job SQL needs to be executed manually in Cloud View after the edge function is deployed. This is documented in the updated `cron_jobs.sql` file.

