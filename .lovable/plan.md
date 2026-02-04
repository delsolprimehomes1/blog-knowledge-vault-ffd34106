
# Update Initial Lead Notification Email to Match Escalating Alarm Format

## Overview

The initial lead notification email (sent at T+0) needs to use a consistent subject format that matches the escalating alarm system. This enables agents to set up a single Gmail filter that catches all alarm levels (0-4) for any language.

---

## Current State

### Subject Line (line 364)
```typescript
emailSubject = `${flag} New ${normalizedLead.language?.toUpperCase()} Lead: ${lead.first_name} ${lead.last_name}`;
```
**Example**: `🇬🇧 New EN Lead: John Smith`

### Email Body (line 98)
Already mentions: `⏱️ You have ${claimWindowMinutes} minutes to claim this lead`
**Missing**: Information about escalating reminders at 1, 2, 3, 4 minutes

---

## Changes Required

### 1. Update Subject Line Format (line 364)

**Before**:
```typescript
emailSubject = `${flag} New ${normalizedLead.language?.toUpperCase()} Lead: ${lead.first_name} ${lead.last_name}`;
```

**After**:
```typescript
const langCode = (normalizedLead.language || "EN").toUpperCase();
emailSubject = `🔔 NEW LEAD ${langCode} #${lead.id.slice(0, 8)}`;
```

This matches the escalating alarm format:
- T+0: `🔔 NEW LEAD EN #12345678`
- T+1: `⏰ 1 MIN PASSED - NEW LEAD EN #12345678`
- T+2: `⚠️ 2 MIN PASSED - NEW LEAD EN #12345678`
- etc.

### 2. Update Email Body - Add Escalation Warning (line 98)

Insert after the existing claim window banner a new escalation info section:

```html
<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0;">
  <p style="margin: 0; color: #92400e; font-weight: bold;">📧 Escalating Reminders</p>
  <p style="margin: 5px 0 0 0; color: #92400e; font-size: 14px;">
    You will receive reminder emails at 1, 2, 3, and 4 minutes if this lead remains unclaimed.
  </p>
</div>
```

### 3. Add Logging for Alarm Level 0 (around line 402)

Add console.log to indicate this is the initial alarm:
```typescript
console.log(`[send-lead-notification] Sending initial alarm (level 0) for lead ${lead.id}`);
console.log(`[send-lead-notification] Subject: ${emailSubject}`);
```

---

## Subject Format Summary (for Gmail Filter Setup)

| Time | Emoji | Subject Pattern |
|------|-------|-----------------|
| T+0 | 🔔 | `NEW LEAD EN #12345678` |
| T+1 | ⏰ | `1 MIN PASSED - NEW LEAD EN #12345678` |
| T+2 | ⚠️ | `2 MIN PASSED - NEW LEAD EN #12345678` |
| T+3 | 🚨 | `3 MIN PASSED - NEW LEAD EN #12345678` |
| T+4 | 🔥 | `4 MIN PASSED - FINAL WARNING - NEW LEAD EN #12345678` |

**Gmail Filter Example**: Subject contains `NEW LEAD EN` catches all 5 alarm levels for English leads.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/send-lead-notification/index.ts` | Update subject line format, add escalation warning to email body, add logging |

---

## Verification

After implementation:
1. Create a new test lead
2. Check email inbox
3. Subject should be: `🔔 NEW LEAD [LANG] #[ID]`
4. Body should mention escalating reminders at 1, 2, 3, 4 minutes
5. Logs should show "Sending initial alarm (level 0)"
