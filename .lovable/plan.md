
# Change Active Leads Limit from 50 to 500 for All Agents

## Current State

All 16 agents currently have `max_active_leads` set to 50 (except one with 100). This limit controls how many leads an agent can have assigned at once.

## Solution

### Step 1: Update All Existing Agents in Database

Run a database migration to update all agents:

```sql
UPDATE crm_agents SET max_active_leads = 500;
```

### Step 2: Update Default for New Agents

Modify the Add Agent modal to use 500 as the default:

**File: `src/components/crm/AddAgentModal.tsx`**

| Line | Current | New |
|------|---------|-----|
| 54 | `max_active_leads: 50` | `max_active_leads: 500` |
| 210 | `defaultValue={50}` | `defaultValue={500}` |

## Files to Change

| File | Change |
|------|--------|
| **Database Migration** | `UPDATE crm_agents SET max_active_leads = 500` |
| `src/components/crm/AddAgentModal.tsx` | Change default from 50 to 500 in two places |

## Technical Details

The `max_active_leads` column already exists and stores an integer. The capacity check in `register-crm-lead` will automatically work with the new limit:

```typescript
// This logic remains unchanged - it just uses the new 500 limit
if (agent.current_lead_count >= agent.max_active_leads) {
  // Agent at capacity
}
```

## Result

After implementation:
- All existing agents will have a 500 active lead limit
- New agents created via the Add Agent modal will default to 500
- The Agent Management table will show "0 / 500" instead of "0 / 50"
- Agents can be assigned up to 500 leads before being marked as "at capacity"
