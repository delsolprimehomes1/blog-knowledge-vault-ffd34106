

# Update Salestrail Webhook to Clear Contact Timer

## Overview

Extend the salestrail-webhook edge function to clear the contact timer when a call is successfully logged, completing the dual-stage SLA tracking integration.

---

## Current State

The SLA update section (lines 179-196) currently:
- Sets `first_contact_at` when lead has no prior contact
- Sets `first_action_completed: true`
- Sets `last_contact_at`

**Missing**: Clearing the Stage 2 contact timer fields from the new dual-stage SLA system.

---

## Changes Required

### File: `supabase/functions/salestrail-webhook/index.ts`

### Change 1: Extend SLA Update (lines 182-188)

Add contact timer clearing to the existing update:

```typescript
const { error: slaError } = await supabase
  .from("crm_leads")
  .update({
    // Existing SLA fields
    first_contact_at: contactTime,
    first_action_completed: true,
    last_contact_at: contactTime,
    
    // NEW: Clear contact timer (contact made successfully)
    contact_timer_expires_at: null,
    contact_sla_breached: false,
  })
  .eq("id", lead.id);
```

Update success log message to include timer clearing confirmation.

### Change 2: Handle Leads with Active Timer but Existing First Contact (after line 196)

Add new block to handle edge case where lead already had first contact but contact timer is still active:

```typescript
// If lead already had first contact but contact timer was active, clear it
if (lead && lead.first_contact_at && lead.contact_timer_expires_at) {
  await supabase
    .from("crm_leads")
    .update({
      contact_timer_expires_at: null,
      contact_sla_breached: false,
      last_contact_at: startTime || new Date().toISOString(),
    })
    .eq("id", lead.id);
  
  console.log(`[salestrail-webhook] Cleared active contact timer for lead ${lead.id}`);
}
```

---

## Logic Flow

```text
SALESTRAIL CALL RECEIVED
         │
         ▼
    Lead Matched?
         │
    ┌────┴────┐
   NO        YES
    │         │
    │    ┌────┴────────────────┐
    │    │                     │
    │  First Contact?    Already Contacted?
    │    │                     │
    │   YES                   YES
    │    │                     │
    │    ▼                     ▼
    │  Update SLA:         Timer Active?
    │  • first_contact_at       │
    │  • first_action_completed ├───NO──► Done
    │  • contact_timer = null   │
    │  • contact_sla_breached   YES
    │    = false                │
    │                          ▼
    │                    Clear Timer:
    │                    • contact_timer = null
    │                    • contact_sla_breached = false
    │                    • last_contact_at = now
    │                          │
    └──────────────────────────┴──► Continue to Notification
```

---

## Technical Details

### Fields Updated

| Condition | Fields Updated |
|-----------|----------------|
| No prior first contact | `first_contact_at`, `first_action_completed`, `last_contact_at`, `contact_timer_expires_at = null`, `contact_sla_breached = false` |
| Already contacted but timer active | `contact_timer_expires_at = null`, `contact_sla_breached = false`, `last_contact_at` |

### Edge Cases Handled

1. **First call to lead**: Full SLA completion + timer clearing
2. **Follow-up call with active timer**: Timer clearing only
3. **Follow-up call with no active timer**: No timer updates needed (skipped)
4. **Unmatched lead**: No timer updates (no lead to update)

---

## Verification Steps

1. Make a test call through Salestrail app to a lead with active contact timer
2. Query database to verify:
   ```sql
   SELECT id, 
          first_contact_at,
          first_action_completed,
          contact_timer_started_at, 
          contact_timer_expires_at,
          contact_sla_breached
   FROM crm_leads 
   WHERE id = '<lead-id>';
   ```
3. Confirm:
   - `contact_timer_expires_at` is `NULL`
   - `contact_sla_breached` is `false`
   - `first_action_completed` is `true`

