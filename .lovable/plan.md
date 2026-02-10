

# Fix T+1-T+4 Escalating Alarms: Silent Failures

## Findings

The investigation uncovered two bugs in `send-escalating-alarms/index.ts`:

1. **Silent activity insert failure** (line 293-299): The function sets `agent_id: null`, but `crm_activities.agent_id` is a NOT NULL column. Every activity insert for escalating alarms fails silently -- there is no error handling on this insert.

2. **No email delivery logging**: Resend returns 200 OK and `last_alarm_level` increments, but there's no record of what emails were sent, making it impossible to verify delivery.

The cron job fired correctly every minute. The function processed the lead 4 times (alarm levels 0 through 4). Resend API calls returned success. But agents report not receiving T+1 through T+4 emails -- without logging, we cannot determine if this is a Resend delivery issue, spam filtering, or something else.

## Changes

### 1. Fix `agent_id: null` bug in `send-escalating-alarms/index.ts`

**Line 293-299** -- Change the activity insert to use the first agent ID from the list instead of null:

```typescript
// Before:
await supabase.from("crm_activities").insert({
  lead_id: lead.id,
  agent_id: null,  // BUG: column is NOT NULL
  activity_type: "note",
  notes: `${config.emoji} Escalating alarm level ${targetLevel} sent...`,
  created_at: now.toISOString(),
});

// After:
const activityAgentId = agents[0]?.id;
if (activityAgentId) {
  const { error: activityError } = await supabase.from("crm_activities").insert({
    lead_id: lead.id,
    agent_id: activityAgentId,
    activity_type: "note",
    notes: `${config.emoji} Escalating alarm level ${targetLevel} sent - ${config.text} - lead still unclaimed`,
    created_at: now.toISOString(),
  });
  if (activityError) {
    console.error(`[send-escalating-alarms] Activity insert failed for lead ${lead.id}:`, activityError);
  }
}
```

### 2. Add email delivery logging to `send-escalating-alarms/index.ts`

After the Resend API call (line 267-274), log the full response details so we can trace delivery:

```typescript
if (!emailResponse.ok) {
  const errorText = await emailResponse.text();
  console.error(`[send-escalating-alarms] Resend error for lead ${lead.id} level ${targetLevel}:`, errorText);
  results.push({ lead_id: lead.id, level: targetLevel, success: false });
  continue;
}

const emailResult = await emailResponse.json();
console.log(`[send-escalating-alarms] Level ${targetLevel} alarm for lead ${lead.id}: Resend ID=${emailResult.id}, recipients=${agentEmails.join(',')}, subject="${subject}"`);
```

This ensures that on the next test, we will have a clear audit trail showing:
- The exact Resend email ID for each alarm
- Which recipients received each level
- The exact subject line sent
- Activity entries in the database as proof

### 3. No other files need changes

The cron job configuration is correct (every minute, active). The query logic is correct. The subject templates are already using the deterministic format.

## Expected Result After Fix

For the next Finnish test lead, we should see:
- 4 activity entries in `crm_activities` for alarm levels 1-4
- 4 console log entries with Resend email IDs
- T+1 through T+4 emails delivered to juho@ and eetu@

