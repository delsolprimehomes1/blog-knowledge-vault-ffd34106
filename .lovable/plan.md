

# Fix: Hans Missing from user_roles Table

## Problem Identified

The edge function `create-crm-agent` uses the `is_admin()` RPC function to verify admin status. This function checks the `user_roles` table, but Hans (and Steven) were set as admins in `crm_agents.role` without corresponding entries in `user_roles`.

| Admin Email | crm_agents.role | user_roles entry |
|-------------|-----------------|------------------|
| hans@delsolprimehomes.com | admin | ❌ **MISSING** |
| steven@delsolprimehomes.com | admin | ❌ **MISSING** |
| info@yenomai.com | admin | ✅ Present |
| info@delsolprimehomes.com | admin | ✅ Present |

## Solution

### 1. Add Missing user_roles Entries (Database Migration)

Insert the missing admin entries for Hans and Steven:

```sql
INSERT INTO public.user_roles (user_id, role, granted_at, notes)
VALUES 
  ('95808453-dde1-421c-85ba-52fe534ef288', 'admin', NOW(), 'Hans - CRM admin sync'),
  -- Steven's ID needs to be looked up
ON CONFLICT (user_id, role) DO NOTHING;
```

### 2. Create a Database Trigger for Future Sync (Recommended)

To prevent this from happening again, create a trigger that automatically syncs `crm_agents.role` changes to `user_roles`:

```sql
CREATE OR REPLACE FUNCTION sync_crm_agent_role_to_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is admin, ensure user_roles entry exists
  IF NEW.role = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role, granted_at, notes)
    VALUES (NEW.id, 'admin', NOW(), 'Auto-synced from CRM agent role')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- If role changed away from admin, remove the user_roles entry
    DELETE FROM public.user_roles 
    WHERE user_id = NEW.id AND role = 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_agent_role_trigger
AFTER INSERT OR UPDATE OF role ON public.crm_agents
FOR EACH ROW
EXECUTE FUNCTION sync_crm_agent_role_to_user_roles();
```

## Technical Details

### Why This Happened

The CRM was set up with two separate admin concepts:
1. `crm_agents.role = 'admin'` - Used for UI display and CRM-specific permissions
2. `user_roles.role = 'admin'` - Used by security-definer functions for RLS and edge function authorization

When Hans was made an admin in the CRM, only the `crm_agents.role` column was updated. The `user_roles` table was not populated.

### Files to Update

No code changes needed - this is a data issue. The database migration will:
1. Add missing `user_roles` entries for Hans and Steven
2. Create a sync trigger to prevent future mismatches

## Immediate Fix Steps

1. Run database migration to add Hans and Steven to `user_roles`
2. Add the sync trigger for future-proofing
3. Verify Hans can create agents after the migration

