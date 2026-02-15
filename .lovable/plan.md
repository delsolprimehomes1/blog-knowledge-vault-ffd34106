

# Fix: Stop False "Claimed But Not Called" Emails for Admin-Fallback Leads

## The Problem

When no agent claims a lead within 5 minutes, the system correctly:
1. Sends Hans the "NO_CLAIM" email
2. Auto-assigns the lead to Hans as admin fallback (setting `lead_claimed: true`)

But then 10 minutes later, `check-sla-breaches` sees `lead_claimed: true` and fires a **false** "CLAIMED_NOT_CALLED" email -- making it look like an agent claimed and failed to call, when actually nobody ever claimed.

## Root Cause

`check-sla-breaches` (line 55) queries for `lead_claimed = true` without checking `assignment_method`. Admin-fallback leads match this query and get the wrong email type.

## Fix

### File: `supabase/functions/check-sla-breaches/index.ts`

Add a filter to **exclude admin-fallback assigned leads** from the SLA breach query. These leads were never voluntarily claimed by an agent, so the "claimed but not called" notification is misleading.

**Change the query (lines 49-59)** to add:
```
.neq("assignment_method", "admin_fallback")
```

This single line ensures only leads that were **genuinely claimed by an agent** (assignment_method = 'claimed') will trigger the contact SLA breach notification.

### Verification

After deployment, admin-fallback leads will:
- Still get the correct T+5 "NO_CLAIM" email (from `check-claim-window-expiry`) 
- Still get assigned to Hans as fallback (from `check-unclaimed-leads`)
- **No longer** trigger the false "CLAIMED_NOT_CALLED" email (from `check-sla-breaches`)

Leads that an agent genuinely claims but doesn't call will continue to trigger the "CLAIMED_NOT_CALLED" email as expected.

## Technical Details

| What Changes | Where | Change |
|---|---|---|
| SLA breach query | `check-sla-breaches/index.ts` line 58 | Add `.neq("assignment_method", "admin_fallback")` filter |
| Edge function | Redeploy `check-sla-breaches` | Automatic |

One-line fix. No database changes needed.

