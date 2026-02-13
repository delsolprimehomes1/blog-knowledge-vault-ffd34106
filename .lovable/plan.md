

# Fix Reassignment Email Subjects to CRM_ Format

## Changes

### 1. Update `supabase/functions/reassign-lead/index.ts` -- Email subject fix

Change the email subject from:
```
🔄 Lead Reassigned: {FirstName} {LastName}
```
To the deterministic CRM_ format:
```
CRM_LEAD_REASSIGNED_{LANG} | Lead reassigned to you
```

Where `{LANG}` is the lead's language uppercased (e.g., `EN`, `FI`, `NL`). No emojis, no dynamic lead names in the subject -- matching the standard established for all other CRM emails.

### 2. Update `src/components/crm/admin/AdminLeadActions.tsx` -- Add email via edge function

The Force Transfer action currently does a direct DB update with no email. Change it to call the existing `reassign-lead` edge function instead (with `reason: 'manual'`), which handles:
- Lead update
- Agent count management
- Activity logging
- Notification creation
- Email sending (now with correct CRM_ subject)

This eliminates duplicated logic in the frontend and ensures Force Transfer also sends a properly formatted email.

## Technical Details

### File: `supabase/functions/reassign-lead/index.ts`
- Line 246: Replace subject `\`🔄 Lead Reassigned: ${lead.first_name} ${lead.last_name}\`` with `\`CRM_LEAD_REASSIGNED_${(lead.language || 'EN').toUpperCase()} | Lead reassigned to you\``

### File: `src/components/crm/admin/AdminLeadActions.tsx`
- Replace the `forceTransfer` mutation body (lines 106-152) to call `supabase.functions.invoke("reassign-lead", { body: { lead_id, to_agent_id, reason: "manual", notes: "Force transfer by admin", reassigned_by_id } })` instead of doing raw DB updates
- This removes ~45 lines of duplicated assignment logic and ensures email parity

