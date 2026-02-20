

# Fix: False "Lead Not Claimed/Called" Admin Notifications

## Problem

When an agent claims a lead and calls it, Hans (admin) still receives false notifications saying the lead was "not claimed" or "not called." The lead shows correctly in the agent's view but the automated monitoring system doesn't detect the activity.

## Root Cause

The field `first_action_completed` on the `crm_leads` table stays `false` even after agents claim and call leads. This causes three cron jobs to fire false alerts:

- **check-contact-window-expiry** (every 1 min): "Agent Failed to Make Contact"
- **check-sla-breaches** (every 1 min): "SLA Warning: Lead Not Worked"

Two code paths are supposed to set `first_action_completed = true`, but both have issues:

1. **Salestrail webhook**: Only works if the phone number matches (last 9 digits). If agents call from personal phones or the number format doesn't match, it silently fails to update the lead.

2. **Manual activity logging** (useLeadActivities hook): Does try to set the flag, but does NOT clear the `contact_timer_expires_at` field. So even if the flag gets set, the contact window expiry check can still fire. Additionally, any RLS failure on this update is silently swallowed.

## Fix Plan

### Step 1: Update `useLeadActivities.ts` - Clear Contact Timer on Activity

When an agent logs a meaningful activity (call, email, whatsapp, meeting), also clear the contact timer fields -- matching what the Salestrail webhook already does.

**File:** `src/hooks/useLeadActivities.ts`

Current code (lines 146-158):
```typescript
const meaningfulActions = ["call", "email", "whatsapp", "meeting"];
if (meaningfulActions.includes(input.activityType)) {
  await supabase
    .from("crm_leads")
    .update({ first_action_completed: true })
    .eq("id", leadId)
    .eq("first_action_completed", false);
}
```

Updated code:
```typescript
const meaningfulActions = ["call", "email", "whatsapp", "meeting"];
if (meaningfulActions.includes(input.activityType)) {
  const { error: slaError } = await supabase
    .from("crm_leads")
    .update({
      first_action_completed: true,
      contact_timer_expires_at: null,
      contact_sla_breached: false,
      first_contact_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (slaError) {
    console.error("[useLeadActivities] SLA update error:", slaError);
  }
}
```

Key changes:
- Clear `contact_timer_expires_at` (stops the contact window expiry cron from firing)
- Set `first_contact_at` (records when first contact happened)
- Remove the `eq("first_action_completed", false)` filter so it always updates
- Set `contact_sla_breached = false` in case it was already flagged

### Step 2: Update `claim-lead` Edge Function - Set `first_action_completed` Flag Earlier

Currently, the claim-lead function does NOT set `claim_window_expires_at = null` on the `crm_leads` table. While it clears `claim_timer_expires_at`, the `check-unclaimed-leads` cron checks `claim_window_expires_at`. This means even after a lead is claimed, the unclaimed leads cron can still pick it up if `claim_window_expires_at` has passed.

**File:** `supabase/functions/claim-lead/index.ts`

Add `claim_window_expires_at: null` to the update at line 70:

```typescript
.update({
  contact_timer_started_at: now.toISOString(),
  contact_timer_expires_at: contactWindowExpiry.toISOString(),
  contact_sla_breached: false,
  claim_timer_expires_at: null,
  claim_window_expires_at: null,  // NEW: Also clear this
  last_alarm_level: 99,
})
```

### Step 3: Verify RLS Policies

Check that the RLS policy on `crm_leads` allows agents to update `first_action_completed`, `contact_timer_expires_at`, and related fields on leads assigned to them. If the policy blocks this, the client-side update in the hook silently fails.

## Technical Details

### Cron Jobs Affected
- `check-contact-window-expiry`: Checks `contact_timer_expires_at < now AND first_action_completed = false`
- `check-sla-breaches`: Checks `first_action_completed = false AND assigned_at < (now - 10 min)`
- `check-unclaimed-leads`: Checks `lead_claimed = false AND claim_window_expires_at < now`

### Database Fields Updated
- `first_action_completed`: boolean -- must be `true` after any meaningful contact
- `contact_timer_expires_at`: timestamp -- must be `null` after contact made
- `claim_window_expires_at`: timestamp -- must be `null` after lead claimed
- `contact_sla_breached`: boolean -- reset to `false` if contact made after breach

### Files Changed
1. `src/hooks/useLeadActivities.ts` -- Add contact timer clearing to activity logging
2. `supabase/functions/claim-lead/index.ts` -- Clear `claim_window_expires_at` on claim

