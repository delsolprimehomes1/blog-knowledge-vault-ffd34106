

# Fix SLA Warning Email Agent Attribution

## Problem Analysis

After thorough code review, I found the root cause: The `check-sla-breaches` edge function correctly resolves the assigned agent's name via `assigned_agent_id`, but it does NOT pass the agent's **email address** to the SLA warning email template. This means Hans (the admin) sees which agent claimed the lead by name, but cannot easily contact them.

Additionally, the SLA warning email template (`generateSlaWarningEmailHtml` in `send-lead-notification`) is missing the agent's email and the exact claimed-at timestamp -- making it harder for Hans to follow up.

There are also TWO separate functions sending emails with the same subject line `CRM_ADMIN_CLAIMED_NOT_CALLED_...`, which causes confusion:
- `check-sla-breaches` sends via `send-lead-notification` (SLA warning -- lead claimed but no activity after 10 min)
- `check-contact-window-expiry` sends directly via Resend (contact window -- lead claimed but no call after 5 min)

## Changes Required

### 1. Update `check-sla-breaches/index.ts` -- Pass Agent Email

Currently (line 136-155), only `assigned_agent_name` is passed. Add `assigned_agent_email` so the email template can show it.

```typescript
body: JSON.stringify({
  lead: { ... },
  agents: [adminAgent],
  claimWindowMinutes: slaMinutes,
  notification_type: "sla_warning",
  assigned_agent_name: `${assignedAgent?.first_name || "Unknown"} ${assignedAgent?.last_name || "Agent"}`,
  assigned_agent_email: assignedAgent?.email || null,   // NEW
  assigned_at_timestamp: lead.assigned_at,               // NEW
  time_since_assignment_minutes: timeSinceAssignment,
}),
```

Also update the activity timeline note (line 188-194) to include the agent's full name and email:

```
SLA WARNING: No first action logged within ${slaMinutes}-minute SLA window.
Claimed by: ${assignedAgent?.first_name} ${assignedAgent?.last_name} (${assignedAgent?.email})
Claimed at: ${lead.assigned_at}
Elapsed: ${timeSinceAssignment} minutes
Admin (${adminAgent?.first_name}) notified.
```

### 2. Update `send-lead-notification/index.ts` -- Accept and Display Agent Email

Add `assigned_agent_email` and `assigned_at_timestamp` to the `NotificationRequest` interface.

Update `generateSlaWarningEmailHtml` function signature to accept the new fields, and add an "Agent Email" row and "Claimed At" timestamp to the email template so Hans can see exactly who claimed the lead, their email, and when.

### 3. Update `check-contact-window-expiry/index.ts` -- Add Claimed At Timestamp

Currently shows "Claimed: X minutes ago" but not the actual timestamp. Add the formatted timestamp so Hans can cross-reference.

### 4. Differentiate Email Subjects

Change the SLA warning subject to distinguish it from the contact window expiry:
- Contact window (5 min): `CRM_ADMIN_CLAIMED_NOT_CALLED_XX | Lead claimed but not called (5-min contact SLA)`
- SLA warning (10 min): `CRM_ADMIN_SLA_WARNING_XX | Lead claimed but not worked (10-min SLA breach)`

## Technical Details

### Files Modified
1. `supabase/functions/check-sla-breaches/index.ts` -- Pass agent email + timestamp, improve activity note
2. `supabase/functions/send-lead-notification/index.ts` -- Accept new fields in interface, update SLA warning template with agent email and claimed-at time, change subject line
3. `supabase/functions/check-contact-window-expiry/index.ts` -- Add formatted timestamp, change subject line

### Edge Functions to Deploy
- `check-sla-breaches`
- `send-lead-notification`
- `check-contact-window-expiry`

### No Database Changes Needed
The `crm_leads` table already has `assigned_at` (used as claimed-at timestamp) and the agent join works correctly via `assigned_agent_id`.

