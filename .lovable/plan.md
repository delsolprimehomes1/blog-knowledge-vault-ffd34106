

# Phase 2: Night Release Triggers T+0 Broadcast

## What Changes

**File:** `supabase/functions/release-night-held-leads/index.ts`

The function already has most of the structure (per-lead loop, round robin config lookup, agent fetching, email sending). The changes are:

### Change 1: Add claim timer fields to lead update (lines 75-82)

Add `claim_timer_started_at`, `last_alarm_level: 0`, and rename/add the correct claim expiry field. This enables the escalation state machine (T+1 through T+5) to kick in automatically via existing cron jobs.

**Before:**
```typescript
is_night_held: false,
scheduled_release_at: null,
lead_status: "new",
current_round: 1,
round_broadcast_at: new Date().toISOString(),
claim_window_expires_at: new Date(Date.now() + claimWindowMinutes * 60 * 1000).toISOString(),
```

**After:**
```typescript
is_night_held: false,
scheduled_release_at: null,
lead_status: "new",
current_round: 1,
round_broadcast_at: new Date().toISOString(),
claim_window_expires_at: new Date(Date.now() + claimWindowMinutes * 60 * 1000).toISOString(),
claim_timer_started_at: new Date().toISOString(),
last_alarm_level: 0,
```

### Change 2: Add smart admin filtering to agent selection (lines 93-118)

Apply the same smart fallback logic from Phase 1: filter out admins unless they are the only agents available. This affects both the round-robin path and the language-match fallback path.

**Round-robin path (lines 101-104):** After the capacity filter, split into non-admin vs all, use non-admins if available.

**Language-match fallback (lines 114-117):** Same pattern.

### Change 3: Update email payload to use broadcast format (lines 136-148)

The current call passes `{ lead, agents, claimWindowMinutes, isNightRelease: true }` which doesn't set `notification_type`, so it defaults to `broadcast` -- this is actually correct. However, to be explicit:

**Before:**
```typescript
body: JSON.stringify({
  lead,
  agents: availableAgents,
  claimWindowMinutes,
  isNightRelease: true,
}),
```

**After:**
```typescript
body: JSON.stringify({
  lead,
  agents: availableAgents,
  claimWindowMinutes,
  notification_type: "broadcast",
}),
```

This ensures the deterministic subject line `CRM_NEW_LEAD_FI | New Finnish lead - call immediately` is used instead of a night-release specific format.

## What Stays the Same

- The query to find held leads (lines 34-39) -- unchanged
- The round robin config lookup per lead (lines 62-68) -- unchanged
- The in-app notification creation (lines 122-132) -- unchanged
- The activity log entry (lines 158-165) -- unchanged
- The overall per-lead loop structure -- unchanged

## Summary of All Modifications

| Line Range | Change |
|---|---|
| 75-82 | Add `claim_timer_started_at` and `last_alarm_level: 0` to update |
| 101-104 | Smart admin filtering on round-robin agents |
| 114-117 | Smart admin filtering on language-match agents |
| 142-147 | Set `notification_type: "broadcast"` explicitly, remove `isNightRelease` |

## Expected Behavior

After-hours lead arrives at 22:00 and is silently held (Phase 1). At 09:00, the cron job:

1. Sets `claim_timer_started_at = 09:00`, `last_alarm_level = 0`
2. Sends T+0 broadcast email with subject `CRM_NEW_LEAD_FI | New Finnish lead - call immediately`
3. Existing `send-escalating-alarms` cron picks up leads with `last_alarm_level = 0` at 09:01 and fires T+1, then T+2, T+3, T+4 automatically
4. If unclaimed by 09:05, `check-claim-window-expiry` fires T+5 admin breach alert

Multiple held leads all release and broadcast simultaneously at 09:00.
