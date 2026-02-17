

## Add Working Hours Columns to CRM Agents

### 1. Database Migration

Add two new columns and a composite index to `crm_agents`. Per project guidelines, validation triggers will be used instead of CHECK constraints (CHECK constraints can cause issues with database restoration).

**SQL Migration:**
```sql
-- Add columns
ALTER TABLE crm_agents
  ADD COLUMN IF NOT EXISTS working_hours_start INTEGER DEFAULT 8,
  ADD COLUMN IF NOT EXISTS working_hours_end INTEGER DEFAULT 20;

-- Validation trigger (replaces CHECK constraints)
CREATE OR REPLACE FUNCTION public.validate_agent_working_hours()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.working_hours_start < 0 OR NEW.working_hours_start > 23 THEN
    RAISE EXCEPTION 'working_hours_start must be between 0 and 23';
  END IF;
  IF NEW.working_hours_end < 0 OR NEW.working_hours_end > 23 THEN
    RAISE EXCEPTION 'working_hours_end must be between 0 and 23';
  END IF;
  IF NEW.working_hours_end = NEW.working_hours_start THEN
    RAISE EXCEPTION 'working_hours_end must differ from working_hours_start';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_agent_working_hours
  BEFORE INSERT OR UPDATE ON crm_agents
  FOR EACH ROW EXECUTE FUNCTION validate_agent_working_hours();

-- Performance index
CREATE INDEX IF NOT EXISTS idx_crm_agents_working_hours
  ON crm_agents(timezone, working_hours_start, working_hours_end);
```

### 2. Update TypeScript Type

Add `working_hours_start` and `working_hours_end` to the `CrmAgent` interface in `src/hooks/useCrmAgents.ts`.

### 3. Update Agent Management UI

**AddAgentModal** (`src/components/crm/AddAgentModal.tsx`):
- Add two number inputs for "Working Hours Start" and "Working Hours End" (default 8 and 20).
- Add Zod validation for 0-23 range and inequality.

**EditAgentModal** (`src/components/crm/EditAgentModal.tsx`):
- Add matching fields, pre-populated from agent data.

### 4. Files Changed

| Action | File | Detail |
|--------|------|--------|
| Migration | Database | New columns, trigger, index |
| Edit | `src/hooks/useCrmAgents.ts` | Add fields to `CrmAgent` interface |
| Edit | `src/components/crm/AddAgentModal.tsx` | Add working hours inputs |
| Edit | `src/components/crm/EditAgentModal.tsx` | Add working hours inputs |

