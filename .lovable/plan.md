

# Add Database Logging for T+1-T+4 Escalating Alarm Emails

## What This Does

Currently, T+1 through T+4 escalating alarm emails are sent via Resend and logged to the console, but not recorded in the `crm_email_logs` table. This means the database audit trail has a gap -- T+0 and T+5 emails are logged, but the 4 intermediate reminders are invisible in the database.

This change adds a `crm_email_logs` insert after each successful Resend API call, giving you a complete 6-row audit trail per unclaimed lead.

## Technical Details

**File:** `supabase/functions/send-escalating-alarms/index.ts`

**Change location:** After line 275 (where Resend ID is logged), insert email log entries for each agent recipient.

**Table schema alignment:** The `crm_email_logs` table requires these NOT NULL columns:
- `recipient_email` (text)
- `subject` (text)
- `template_type` (text) -- will use `escalating_alarm_t{level}`
- `triggered_by` (text) -- will use `system`
- `status` (text) -- will use `sent`
- `sent_at` (timestamptz)

Plus optional columns: `lead_id`, `agent_id`, `resend_message_id`, `trigger_reason`.

**Code to add** (after line 275, before the catch block):

```typescript
// Log to crm_email_logs for audit trail
const emailLogEntries = agents.map(agent => ({
  lead_id: lead.id,
  agent_id: agent.id,
  recipient_email: agent.email,
  recipient_name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || null,
  subject: subject,
  template_type: `escalating_alarm_t${targetLevel}`,
  triggered_by: 'system',
  trigger_reason: `Escalating alarm level ${targetLevel} - ${config.text}`,
  status: 'sent',
  resend_message_id: emailResult.id,
  sent_at: now.toISOString(),
}));

const { error: logError } = await supabase
  .from("crm_email_logs")
  .insert(emailLogEntries);

if (logError) {
  console.error(`[send-escalating-alarms] Email log insert failed for lead ${lead.id} level ${targetLevel}:`, logError);
}
```

No other files or database changes are needed.

