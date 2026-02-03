
# Salestrail Call Tracking Database Integration

## Overview

This migration adds 6 new columns to `crm_activities` and creates supporting indexes and an RLS policy to enable automatic call logging from Salestrail webhooks.

---

## Current State Analysis

### Existing `crm_activities` Table (18 columns)
| Column | Type | Required |
|--------|------|----------|
| id | UUID | Yes (PK) |
| lead_id | UUID | Yes (FK) |
| agent_id | UUID | Yes (FK) |
| activity_type | TEXT | Yes |
| outcome | TEXT | No |
| call_duration | INTEGER | No |
| subject | TEXT | No |
| notes | TEXT | Yes |
| callback_requested | BOOLEAN | No |
| callback_datetime | TIMESTAMPTZ | No |
| callback_notes | TEXT | No |
| callback_completed | BOOLEAN | No |
| created_at | TIMESTAMPTZ | No |
| scheduled_for | TIMESTAMPTZ | No |
| interest_level | TEXT | No |
| sentiment_score | NUMERIC | No |
| whatsapp_template_used | TEXT | No |
| auto_status_update | TEXT | No |

### Existing RLS Policies
1. **Agents can insert own activities** - `agent_id = auth.uid()`
2. **Agents can update own activities** - `agent_id = auth.uid() OR is_admin()`
3. **Agents see activities for accessible leads** - Own activities OR admin OR can_access_lead

### Existing Indexes
- `crm_activities_pkey` (id)
- `idx_crm_activities_lead` (lead_id, created_at DESC)
- `idx_crm_activities_agent` (agent_id, created_at DESC)
- `idx_crm_activities_interest_level` (interest_level)
- `idx_crm_activities_sentiment_score` (sentiment_score)

### Existing Notification Types
- `admin_fallback`, `lead_claimed`, `new_lead_available`, `rule_assigned`, `sla_reminder`, `sla_warning`

---

## Database Changes

### 1. New Columns for `crm_activities`

| Column | Type | Nullable | Constraint | Purpose |
|--------|------|----------|------------|---------|
| salestrail_call_id | TEXT | Yes | UNIQUE | Salestrail's unique call identifier |
| salestrail_recording_url | TEXT | Yes | - | URL to call recording |
| salestrail_transcription | TEXT | Yes | - | Call transcription if available |
| call_direction | TEXT | Yes | CHECK ('inbound', 'outbound') | Inbound or outbound call |
| call_answered | BOOLEAN | Yes | - | Whether call was answered |
| salestrail_metadata | JSONB | Yes | - | Full webhook payload for audit |

### 2. New Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| idx_crm_activities_salestrail_call_id | salestrail_call_id | Fast webhook duplicate detection |
| idx_crm_activities_call_direction | call_direction | Filter by call direction |

### 3. New RLS Policy

| Policy Name | Operation | Condition |
|-------------|-----------|-----------|
| Service role can insert webhook activities | INSERT | Allows service role (edge functions) to insert activities regardless of agent_id |

**Note**: The existing INSERT policy requires `agent_id = auth.uid()`, which would block webhook inserts. The service role policy bypasses RLS entirely, so no additional policy is needed for webhook inserts.

### 4. New Notification Type

The `call_logged` notification type will be used when Salestrail webhooks log calls automatically. No schema change needed - the `notification_type` column is TEXT without constraints.

---

## Migration SQL

```sql
-- ================================================
-- SALESTRAIL CALL TRACKING INTEGRATION
-- Purely additive changes - no existing data affected
-- ================================================

-- 1. Add Salestrail columns to crm_activities
ALTER TABLE public.crm_activities
ADD COLUMN IF NOT EXISTS salestrail_call_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS salestrail_recording_url TEXT,
ADD COLUMN IF NOT EXISTS salestrail_transcription TEXT,
ADD COLUMN IF NOT EXISTS call_direction TEXT,
ADD COLUMN IF NOT EXISTS call_answered BOOLEAN,
ADD COLUMN IF NOT EXISTS salestrail_metadata JSONB;

-- 2. Add CHECK constraint for call_direction
ALTER TABLE public.crm_activities
ADD CONSTRAINT crm_activities_call_direction_check 
CHECK (call_direction IS NULL OR call_direction IN ('inbound', 'outbound'));

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_activities_salestrail_call_id 
ON public.crm_activities (salestrail_call_id) 
WHERE salestrail_call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_activities_call_direction 
ON public.crm_activities (call_direction) 
WHERE call_direction IS NOT NULL;

-- 4. Add comment for documentation
COMMENT ON COLUMN public.crm_activities.salestrail_call_id IS 
'Unique call ID from Salestrail - used for webhook deduplication';

COMMENT ON COLUMN public.crm_activities.salestrail_recording_url IS 
'URL to call recording from Salestrail';

COMMENT ON COLUMN public.crm_activities.salestrail_transcription IS 
'Call transcription from Salestrail (if available)';

COMMENT ON COLUMN public.crm_activities.call_direction IS 
'Call direction: inbound or outbound';

COMMENT ON COLUMN public.crm_activities.call_answered IS 
'Whether the call was answered';

COMMENT ON COLUMN public.crm_activities.salestrail_metadata IS 
'Full Salestrail webhook payload for audit purposes';
```

---

## RLS Considerations

### Current RLS (No Changes Needed)

The existing RLS policies are designed for **authenticated users**. When the Salestrail webhook calls our edge function, the edge function uses the **service role key**, which bypasses RLS entirely. This means:

- Webhook inserts will work without any RLS policy changes
- Agents will still only see activities for their accessible leads
- Admins can see all activities

### Security Model

```text
┌─────────────────────────────────────────────────────────────────┐
│                     ACTIVITY ACCESS FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Salestrail Webhook                                             │
│       │                                                         │
│       ▼                                                         │
│  Edge Function (service role) ──► INSERT (bypasses RLS)         │
│                                                                 │
│  Agent Dashboard                                                │
│       │                                                         │
│       ▼                                                         │
│  Supabase Client (anon key) ──► SELECT (RLS enforced)           │
│       │                                                         │
│       └──► Only sees activities for:                            │
│            • Their own activities (agent_id = auth.uid())       │
│            • Leads they can access (can_access_lead())          │
│            • All if admin (is_admin())                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Compatibility Verification

### Existing Code Impact: None

| File | Uses | Impact |
|------|------|--------|
| `useLeadActivities.ts` | `select("*")` | Will include new columns automatically |
| `useTeamActivity.ts` | `select("*")` | Will include new columns automatically |
| `ActivityTimeline.tsx` | Displays activities | Uses existing fields, ignores unknowns |
| `useAdminLeads.ts` | Inserts activities | Only uses existing fields |

All existing inserts only specify the fields they need, so they'll continue to work with the new nullable columns defaulting to NULL.

### TypeScript Types

After migration, the Supabase types file will auto-regenerate to include:

```typescript
crm_activities: {
  Row: {
    // ... existing fields ...
    salestrail_call_id: string | null
    salestrail_recording_url: string | null
    salestrail_transcription: string | null
    call_direction: string | null
    call_answered: boolean | null
    salestrail_metadata: Json | null
  }
}
```

---

## Files to Modify

| File | Action |
|------|--------|
| Database Migration | Create new migration with ALTER TABLE statements |

---

## Expected Outcome

After this migration:

1. `crm_activities` table has 24 columns (18 existing + 6 new)
2. Webhooks can insert call data using salestrail_call_id as idempotency key
3. Partial indexes enable fast lookups without bloating index size
4. All existing CRM functionality remains unchanged
5. Notification type `call_logged` is ready for use

---

## Next Steps (After Approval)

1. Run the database migration
2. Verify columns appear in Supabase schema
3. Create the Salestrail webhook edge function (separate task)
4. Test webhook payload processing
