

# Fix: False "Agent Failed to Make Contact" Emails

## Problem

The `check-contact-window-expiry` cron (runs every 1 minute) fires false emails even when agents call within 5 minutes. Hans confirmed this happened today with agent Nathalie Tascione calling lead Mntnant Oui within 5 minutes, yet the email still fired.

## Root Cause

The `check-contact-window-expiry` function does NOT verify whether a call actually happened. It only checks the `crm_leads` table for these flags:

```
contact_timer_expires_at < NOW()
AND lead_claimed = true
AND first_action_completed = false
AND contact_sla_breached = false
```

The problem is a **race condition between two systems**:

1. **Salestrail webhook** sets `first_action_completed = true` and clears `contact_timer_expires_at` -- but ONLY if the phone number matches (last 9 digits). If Salestrail sends the webhook even 10-20 seconds after the cron fires, the email is already sent.

2. **Manual activity logging** (useLeadActivities hook) -- was fixed in a previous update to also clear these fields, but agents typically don't manually log calls since Salestrail auto-logs them.

The cron runs every 1 minute. So the sequence is:
- T+0:00 -- Lead claimed, `contact_timer_expires_at` set to T+5:00
- T+3:00 -- Agent calls lead via phone
- T+5:01 -- Cron fires, sees `contact_timer_expires_at < NOW()` and `first_action_completed = false`
- T+5:05 -- Salestrail webhook arrives, sets `first_action_completed = true` (too late)
- Result: False email sent

## Fix: Add Safety Check Before Sending Email

The function should perform a **secondary verification** by checking `crm_activities` for any logged contact activity before sending the email. This catches cases where the Salestrail webhook arrived but the `first_action_completed` flag update failed or was delayed.

### Changes to `supabase/functions/check-contact-window-expiry/index.ts`

**Change 1: Add activity verification before processing each lead**

After the existing query finds "expired" leads (line 48), add a verification step inside the loop that checks `crm_activities` for any call/email/whatsapp/meeting logged against that lead since it was claimed. If activity exists, silently fix the lead flags and skip the email.

```typescript
// NEW: Before sending email, verify no activities exist (safety net for race conditions)
const { data: recentActivities } = await supabase
  .from("crm_activities")
  .select("id, activity_type, created_at")
  .eq("lead_id", lead.id)
  .in("activity_type", ["call", "email", "whatsapp", "meeting"])
  .gte("created_at", lead.assigned_at || lead.created_at)
  .limit(1);

if (recentActivities && recentActivities.length > 0) {
  // Activity exists! This is a false positive. Fix the lead flags silently.
  console.log(`[check-contact-window-expiry] FALSE POSITIVE: Lead ${lead.id} has ${recentActivities.length} activities. Fixing flags.`);
  
  await supabase.from("crm_leads").update({
    first_action_completed: true,
    contact_timer_expires_at: null,
    contact_sla_breached: false,
  }).eq("id", lead.id);
  
  continue; // Skip email -- agent did their job
}
```

**Change 2: Re-check `first_action_completed` immediately before sending email**

After the activity check, do one more fresh read of the lead to catch last-second Salestrail updates:

```typescript
// Re-check lead status (Salestrail may have updated it in the last few seconds)
const { data: freshLead } = await supabase
  .from("crm_leads")
  .select("first_action_completed, contact_timer_expires_at")
  .eq("id", lead.id)
  .single();

if (freshLead?.first_action_completed || !freshLead?.contact_timer_expires_at) {
  console.log(`[check-contact-window-expiry] Lead ${lead.id} was updated since query. Skipping.`);
  continue;
}
```

**Change 3: Add diagnostic logging**

Log details about each lead being evaluated so future issues are easier to debug:

```typescript
console.log(`[check-contact-window-expiry] Evaluating lead ${lead.id}:`, {
  name: `${lead.first_name} ${lead.last_name}`,
  phone: lead.phone_number,
  assigned_at: lead.assigned_at,
  contact_timer_expires_at: lead.contact_timer_expires_at,
  first_action_completed: lead.first_action_completed,
  activities_found: recentActivities?.length || 0,
});
```

### Summary of Execution Order

For each lead found by the initial query:

1. Log diagnostic info about the lead
2. Check `crm_activities` for any contact activity since claim -- if found, fix flags and skip
3. Re-read the lead from DB to catch last-second Salestrail updates -- if fixed, skip
4. Only THEN proceed with sending the breach email

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/check-contact-window-expiry/index.ts` | Add activity verification, fresh-read safety check, and diagnostic logging |

### Edge Functions to Deploy
- `check-contact-window-expiry`

