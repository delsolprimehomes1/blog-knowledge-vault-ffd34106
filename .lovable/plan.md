

# Phase 1: Remove Night Hold Email Notifications

## What Changes

**File:** `supabase/functions/register-crm-lead/index.ts`

**Lines 627-657:** Replace the entire admin alert email block with a single log line.

### Before (lines 627-657)
```typescript
// Send admin alert email for after-hours lead
try {
  const { data: adminAgents } = await supabase
    .from("crm_agents")
    .select("id, email, first_name, last_name")
    .eq("role", "admin")
    .eq("is_active", true);

  if (adminAgents?.length) {
    console.log(`...`);
    await fetch(`${supabaseUrl}/functions/v1/send-lead-notification`, { ... });
    console.log("[register-crm-lead] Night hold admin alert sent");
  }
} catch (alertError) {
  console.error("[register-crm-lead] Error sending night hold alert:", alertError);
}
```

### After
```typescript
// Night hold - no email notifications sent
// Leads are silently held until business hours, then released with T+0 broadcast
console.log(`[register-crm-lead] Lead ${lead.id} held until business hours (${scheduledRelease}). No notification sent.`);
```

## What Stays the Same

- Lead is still created in the database
- `is_night_held` is still set to `true`
- `scheduled_release_at` is still set to 09:00 next business day
- The response still returns the night hold info
- All other email types (form submissions, broadcasts, escalations, breach alerts) are unaffected

## Verification

After deploying, any after-hours lead should:
- Appear in the database with `is_night_held = true`
- Show zero new rows in `crm_email_logs` with `template_type = 'night_hold_alert'`
- Log the message: `Lead [id] held until business hours (...). No notification sent.`

