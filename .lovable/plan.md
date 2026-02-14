

# Fix All Reassignment Paths to Use Edge Function

## Summary

Three changes to ensure 100% of lead reassignments go through the `reassign-lead` edge function, which handles emails, timers, audit records, and monitoring.

## Changes

### 1. Fix edge function: Remove manual timer exception
**File:** `supabase/functions/reassign-lead/index.ts` (lines 118-122)

Replace the `else` block (manual reason) so it also sets the 5-minute contact timer, matching the behavior of `unclaimed` and `no_contact` reasons.

**Before:**
```text
} else {
  // Manual reassignment - no timer changes
  leadUpdate.assigned_at = now.toISOString();
  leadUpdate.assignment_method = 'admin_reassignment';
  console.log("[reassign-lead] Manual reason: No timer changes");
}
```

**After:**
```text
} else {
  // Manual reassignment - still monitor with contact timer
  leadUpdate.contact_timer_started_at = now.toISOString();
  leadUpdate.contact_timer_expires_at = contactWindowExpiry.toISOString();
  leadUpdate.contact_sla_breached = false;
  leadUpdate.first_action_completed = false;
  leadUpdate.assigned_at = now.toISOString();
  leadUpdate.assignment_method = 'admin_reassignment';
  console.log("[reassign-lead] Manual reason: Starting contact timer for monitoring");
}
```

### 2. Replace `useAssignLead` hook with edge function call
**File:** `src/hooks/useAdminLeads.ts` (lines 225-292)

Replace the direct DB update logic with a call to `supabase.functions.invoke("reassign-lead")`. The hook already receives `leadId`, `agentId`, `reason`, `adminId`, and `previousAgentId` -- we map these to the edge function's expected parameters (`lead_id`, `to_agent_id`, `reason`, `notes`, `reassigned_by_id`).

The `reason` parameter will be set to `'manual'` for reassignments (when `previousAgentId` exists) and `'unclaimed'` for first-time assignments.

The `updateAgentLeadCount` helper function will be kept since `useBulkAssignLeads` capacity check still needs it for the pre-validation step (checking agent capacity before starting the loop).

### 3. Replace `useBulkAssignLeads` hook with edge function loop
**File:** `src/hooks/useAdminLeads.ts` (lines 295-395)

Replace the bulk direct DB updates with a loop that calls `reassign-lead` for each lead individually. Keep the capacity pre-check (fetch agent, verify `leadIds.length <= availableCapacity`) but remove all direct DB updates and manual count management. Each iteration calls the edge function which handles everything.

### 4. Remove `updateAgentLeadCount` helper
**File:** `src/hooks/useAdminLeads.ts` (lines 204-222)

This helper is no longer needed since both hooks now delegate count management to the edge function. Remove it.

## What This Fixes

| Path | Before | After |
|------|--------|-------|
| AssignLeadDialog | Direct DB update, no email, no timer | Edge function: email + timer + audit |
| Quick Assign | Same (uses `useAssignLead`) | Same fix, automatic |
| Bulk Assign | Direct DB update, no email, no timer | Edge function per lead: email + timer + audit |
| Force Transfer | Edge function, but no timer for manual | Edge function with timer |

## Deployment

The `reassign-lead` edge function will be redeployed after the timer fix.

