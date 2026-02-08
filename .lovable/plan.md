
# Fix: Reminder Creation Error + Enhanced Email Notification System

## Problem Analysis

You're experiencing two distinct issues with the reminder system:

1. **"Failed to create reminder" error** - Reminders cannot be saved from the Calendar
2. **Missing dual-timing email notifications** - You want emails at 1 hour AND 10 minutes before each meeting

---

## Root Cause 1: Column Name Mismatch

The `useCreateReminder` hook in `src/hooks/useReminders.ts` is trying to insert a column called `send_slack` which doesn't exist in the database. The actual column is `slack_sent`.

| Intended | Actual Database Column |
|----------|------------------------|
| `send_slack` | `slack_sent` |

This causes every reminder insert to fail silently.

---

## Root Cause 2: Single Email Timing

Currently the system only sends ONE email notification:
- Cron job runs hourly at :00
- Checks for reminders due within the next 60 minutes
- Marks them as `email_sent: true` after sending

You want TWO emails per reminder:
- **1 hour before** the meeting
- **10 minutes before** the meeting

---

## Implementation Plan

### Part 1: Fix Reminder Creation

| File | Change |
|------|--------|
| `src/hooks/useReminders.ts` | Remove the invalid `send_slack` column from insert |

The database doesn't have a `send_slack` column for controlling Slack notifications on insert - it only has `slack_sent` to track if Slack was already sent. Since the feature description confirms Slack infrastructure has been removed, we'll simply remove this field.

### Part 2: Dual Email Notification System

**Database Changes:**
- Add a new column `email_10min_sent` to track the 10-minute reminder separately

**Edge Function Changes:**
- Modify `send-reminder-emails` to send TWO types of emails:
  - 60-minute reminder (mark `email_sent: true`)
  - 10-minute reminder (mark `email_10min_sent: true`)

**Cron Job Changes:**
- Increase frequency from hourly to every 5 minutes (to catch the 10-minute window)

---

## Files to Modify

| File | Action |
|------|--------|
| `src/hooks/useReminders.ts` | Remove `send_slack` column from insert |
| `supabase/functions/send-reminder-emails/index.ts` | Add 10-minute reminder logic with separate email template |
| `supabase/cron_jobs.sql` | Update cron schedule from `'0 * * * *'` to `'*/5 * * * *'` |
| Database migration | Add `email_10min_sent` boolean column to `crm_reminders` |

---

## Email Timing Logic

The updated edge function will:

1. **60-minute check**: Find reminders due in 55-65 minutes where `email_sent = false`
   - Send "1 hour reminder" email
   - Set `email_sent = true`

2. **10-minute check**: Find reminders due in 5-15 minutes where `email_10min_sent = false`
   - Send "10 minute reminder" email (more urgent styling)
   - Set `email_10min_sent = true`

---

## UI Component Updates

The CreateReminderSheet already shows "Email Reminder - 1 hour before" but we'll update it to show:
- "Email Reminders: 1 hour and 10 minutes before" to reflect the new dual notification system

---

## Technical Details

### Database Migration
```sql
ALTER TABLE crm_reminders 
ADD COLUMN email_10min_sent boolean DEFAULT false;
```

### Cron Schedule Update
```text
Old: '0 * * * *'   -- Every hour at :00
New: '*/5 * * * *' -- Every 5 minutes
```

### Email Templates
- **1-hour email**: Current styling (yellow/amber urgency bar)
- **10-minute email**: Red urgency bar with "STARTING SOON" alert

---

## Summary

After implementation:
- Reminders will save successfully from the Calendar
- Each reminder will trigger TWO email notifications
- Each agent receives their own individual reminders
- Reminders appear on each agent's dashboard based on their `agent_id`
