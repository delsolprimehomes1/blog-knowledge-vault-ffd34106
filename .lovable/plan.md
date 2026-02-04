

# Initialize Alarm System in Lead Registration

## Overview

Update the `register-crm-lead` edge function to initialize the new `last_alarm_level` column when creating leads. This ensures every new lead starts at alarm level 0, ready for the escalating notification system.

---

## Current State

The lead insertion code (lines 458-510) already sets up the claim timer fields:

```typescript
claim_timer_started_at: contactComplete ? claimTimerStart.toISOString() : null,
claim_timer_expires_at: contactComplete ? claimTimerExpiry.toISOString() : null,
claim_sla_breached: false,
```

After lead creation, there's logging at lines 517-523.

---

## Changes Required

### 1. Add Alarm Level to Insert Statement

Add `last_alarm_level: 0` to the insert object at line 507, right after `claim_sla_breached`:

```typescript
claim_timer_started_at: contactComplete ? claimTimerStart.toISOString() : null,
claim_timer_expires_at: contactComplete ? claimTimerExpiry.toISOString() : null,
claim_sla_breached: false,
// NEW: Initialize alarm system at level 0
last_alarm_level: 0,
```

### 2. Add Alarm System Logging

After the existing claim timer logging (around line 523), add alarm system confirmation:

```typescript
// Log claim timer for complete leads
if (contactComplete) {
  console.log(`[register-crm-lead] Claim timer started for lead ${lead.id}`);
  console.log(`[register-crm-lead] Claim window expires at: ${claimTimerExpiry.toISOString()}`);
  console.log(`[register-crm-lead] Alarm system initialized at level 0 - escalating alerts at T+1, T+2, T+3, T+4`);
}
```

---

## File Changes

| File | Change |
|------|--------|
| `supabase/functions/register-crm-lead/index.ts` | Add `last_alarm_level: 0` to insert + add logging |

---

## Alarm Escalation Flow

```text
T+0: Lead created → last_alarm_level = 0 (initial notification sent)
T+1: Cron checks → if unclaimed && level 0 → send alarm 1, set level = 1
T+2: Cron checks → if unclaimed && level 1 → send alarm 2, set level = 2
T+3: Cron checks → if unclaimed && level 2 → send alarm 3, set level = 3
T+4: Cron checks → if unclaimed && level 3 → send alarm 4, set level = 4
T+5: Cron checks → if unclaimed && level 4 → admin escalation
```

---

## Testing

After deployment:
1. Create a new lead via Emma chatbot or form submission
2. Query the database: `SELECT id, first_name, last_alarm_level FROM crm_leads ORDER BY created_at DESC LIMIT 1`
3. Verify `last_alarm_level = 0`
4. Check edge function logs for alarm initialization message

