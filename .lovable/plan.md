
# Update Admin Notification for Claimed Leads with No Contact

## Change

One single-line edit in `supabase/functions/check-contact-window-expiry/index.ts` at line 136.

**Old (line 136):**
```
subject: `⚠️ No Contact Made - ${agentName} claimed ${lead.first_name} ${lead.last_name}`
```

**New (line 136):**
```
subject: `CRM_ADMIN_CLAIMED_NOT_CALLED_${lead.language.toUpperCase()} | Lead claimed but not called (SLA breach)`
```

## What Does NOT Change

- Recipient: still sends to `adminEmail` resolved from `fallback_admin_id` (line 135)
- `contact_sla_breached` flag update (line 108)
- Email body HTML (lines 137-230)
- In-app notification creation (lines 237-247)
- Activity log entry (lines 250-258)

## Context (lines 133-137 after change)

```typescript
            body: JSON.stringify({
              from: "CRM Alerts <crm@notifications.delsolprimehomes.com>",
              to: [adminEmail],
              subject: `CRM_ADMIN_CLAIMED_NOT_CALLED_${lead.language.toUpperCase()} | Lead claimed but not called (SLA breach)`,
              html: `
```

## Complete Subject Line Sequence

| Timer | Function | Subject Format |
|-------|----------|---------------|
| T+0 | send-lead-notification | `CRM_NEW_LEAD_EN \| New English lead -- call immediately` |
| T+1 | send-escalating-alarms | `CRM_NEW_LEAD_EN_T1 \| Reminder 1 -- lead not claimed (1 min)` |
| T+2 | send-escalating-alarms | `CRM_NEW_LEAD_EN_T2 \| Reminder 2 -- SLA running (2 min)` |
| T+3 | send-escalating-alarms | `CRM_NEW_LEAD_EN_T3 \| Reminder 3 -- URGENT (3 min)` |
| T+4 | send-escalating-alarms | `CRM_NEW_LEAD_EN_T4 \| FINAL reminder -- fallback in 1 minute` |
| T+5 (unclaimed) | check-claim-window-expiry | `CRM_ADMIN_NO_CLAIM_EN \| No agent claimed lead within 5 minutes` |
| T+5 (claimed, no call) | check-contact-window-expiry | `CRM_ADMIN_CLAIMED_NOT_CALLED_EN \| Lead claimed but not called (SLA breach)` |
