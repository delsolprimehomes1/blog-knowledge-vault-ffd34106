

# Fix Salestrail Webhook Field Mapping

## Problem

The webhook is failing because Salestrail sends camelCase field names, but our function expects snake_case:

| Salestrail Sends | Current Code Expects |
|------------------|---------------------|
| `callId` | `call_id` |
| `userEmail` | `agent_email` |
| `userPhone` | `agent_phone` |
| `formattedNumber` / `number` | `phone_number` |
| `inbound` (boolean) | `direction` (string) |
| `startTime` | `started_at` |
| `endTime` | `ended_at` |
| `recordingUrl` | `recording_url` |

## Solution

Update the field extraction to support **both formats** (Salestrail camelCase and manual test snake_case) using fallback logic.

---

## Implementation

### File: `supabase/functions/salestrail-webhook/index.ts`

**Replace lines 34-46** (field extraction) with dual-format support:

```typescript
// Support both Salestrail format (camelCase) and test format (snake_case)
const callId = payload.callId || payload.call_id;
const userEmail = payload.userEmail || payload.agent_email;
const userPhone = payload.userPhone || payload.agent_phone;
const phoneNumber = payload.formattedNumber || payload.number || payload.phone_number;
const { duration, answered } = payload;
const direction = payload.inbound !== undefined 
  ? (payload.inbound ? 'inbound' : 'outbound')
  : payload.direction;
const startTime = payload.startTime || payload.started_at;
const endTime = payload.endTime || payload.ended_at;
const recordingUrl = payload.recordingUrl || payload.recording_url;
```

**Update all references throughout the function:**

| Old Variable | New Variable |
|-------------|-------------|
| `call_id` | `callId` |
| `agent_email` | `userEmail` |
| `agent_phone` | `userPhone` |
| `phone_number` | `phoneNumber` |
| `direction` | `direction` (computed from `inbound`) |
| `started_at` | `startTime` |
| `ended_at` | `endTime` |
| `recording_url` | `recordingUrl` |

---

## Changes Summary

1. **Lines 34-46**: Replace destructuring with dual-format fallback logic
2. **Lines 51-57**: Update validation to check `callId` instead of `call_id`
3. **Lines 59-65**: Update validation to check `userEmail`/`userPhone` instead of `agent_email`/`agent_phone`
4. **Lines 72-78**: Update agent query to use `userEmail`/`userPhone`
5. **Line 87**: Update log message to use `userEmail`/`userPhone`
6. **Lines 101-125**: Update lead matching to use `phoneNumber`
7. **Lines 143-148**: Update activity data to use new variable names
8. **Line 160**: Update duplicate log to use `callId`
9. **Line 180**: Update SLA timestamp to use `startTime`
10. **Lines 203-204**: Update notification message to use `direction`

---

## Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Salestrail webhook | Fails with "Missing call_id" | Successfully logs call |
| Manual curl test (snake_case) | Works | Still works (backward compatible) |
| Agent matching | Never reached | Matches by userEmail |
| Lead matching | Never reached | Matches by formattedNumber |

---

## Verification

After deployment, existing Salestrail webhooks should:
1. Parse `callId` correctly
2. Match agent by `userEmail`
3. Derive `direction` from `inbound` boolean
4. Insert activity with correct timestamps
5. Return `{success: true, activity_id: "..."}`

