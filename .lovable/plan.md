
# Fix Salestrail Call Logging

## Root Cause

I found two issues preventing Salestrail calls from showing up:

1. **Database constraint problem**: The `lead_id` column in `crm_activities` requires a value (NOT NULL), but the webhook tries to save `null` when it can't match a phone number to a lead
2. **Lead matching limitation**: The webhook only searches for leads assigned to the calling agent, but the lead you're viewing is assigned to a different agent

---

## Solution

### 1. Database Migration

Make `lead_id` nullable in `crm_activities` so calls can be logged even when a lead isn't matched:

```sql
ALTER TABLE crm_activities 
ALTER COLUMN lead_id DROP NOT NULL;
```

### 2. Improve Lead Matching Logic

Update the webhook to search ALL leads (not just the agent's assigned leads) for phone matching:

**File**: `supabase/functions/salestrail-webhook/index.ts`

```typescript
// Change from:
.eq("assigned_agent_id", agent.id)

// To: Search all leads, prioritize agent's leads
const { data: matchedLead } = await supabase
  .from("crm_leads")
  .select("*")
  .or(`phone_number.ilike.%${last9}%,full_phone.ilike.%${normalized}%`)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
```

### 3. Update UI Query (Optional)

The current `useSalestrailCalls` hook only shows calls with a matching `lead_id`. If we want to show all calls to a phone number (even if not linked to this lead), we could enhance the query.

---

## Changes Summary

| File | Change |
|------|--------|
| Database migration | Make `lead_id` nullable |
| `salestrail-webhook/index.ts` | Remove agent filter from lead matching |
| Optional: Update UI | Show calls by phone match, not just lead_id |

---

## Expected Behavior After Fix

1. Salestrail webhook receives call
2. Matches agent by email (`info@yenomai.com` → John Melvin)
3. Searches ALL leads for phone `7028756463`
4. Finds lead `Harry Potter` and links the activity
5. If no lead found, still logs the call (with `lead_id: null`)
6. Call appears in UI on the Lead Detail page

---

## Verification Steps

After implementation:
1. Test the webhook with a simulated Salestrail payload
2. Confirm the call is logged in `crm_activities`
3. Verify it appears in the Call History card on the lead page
