

# Dual-Stage SLA Tracking Schema Migration

## Overview

Extend the CRM database to support dual-stage SLA tracking with separate timers for claim window (5 min) and contact window (5 min after claim), plus comprehensive reassignment history tracking.

---

## Database Changes

### 1. New Columns on `crm_leads` Table

| Column | Type | Purpose |
|--------|------|---------|
| `claim_timer_started_at` | TIMESTAMPTZ | When lead was created and claim window started |
| `claim_timer_expires_at` | TIMESTAMPTZ | When 5-minute claim window expires |
| `claim_sla_breached` | BOOLEAN | Flag if claim window was missed |
| `contact_timer_started_at` | TIMESTAMPTZ | When lead was claimed and contact window started |
| `contact_timer_expires_at` | TIMESTAMPTZ | When 5-minute contact window expires |
| `contact_sla_breached` | BOOLEAN | Flag if contact window was missed |
| `reassignment_count` | INTEGER | Number of times lead has been reassigned |
| `previous_agent_id` | UUID | Agent who had the lead before reassignment |
| `reassignment_reason` | TEXT | Why the lead was reassigned |
| `reassigned_at` | TIMESTAMPTZ | When last reassignment occurred |

**Note**: The table already has `claim_window_expires_at`, `first_action_completed`, and `sla_breached` columns which will remain for backward compatibility.

### 2. New Indexes for Timer Queries

Two partial indexes optimized for active timer lookups:

```text
idx_crm_leads_claim_timer_expires
├── Columns: claim_timer_expires_at
└── Condition: claim_timer_expires_at IS NOT NULL AND lead_claimed = FALSE

idx_crm_leads_contact_timer_expires  
├── Columns: contact_timer_expires_at
└── Condition: contact_timer_expires_at IS NOT NULL AND first_action_completed = FALSE
```

### 3. New Table: `crm_lead_reassignments`

Full audit trail of all lead reassignments:

```text
crm_lead_reassignments
├── id (UUID, PK)
├── lead_id (UUID, FK → crm_leads)
├── from_agent_id (UUID, FK → crm_agents, nullable)
├── to_agent_id (UUID, FK → crm_agents)
├── reassigned_by (UUID, FK → crm_agents)
├── reason (TEXT: 'unclaimed' | 'no_contact' | 'manual')
├── stage (TEXT: 'claim_window' | 'contact_window' | 'manual')
├── notes (TEXT, optional)
└── created_at (TIMESTAMPTZ)
```

### 4. RLS Policies on `crm_lead_reassignments`

| Policy | Access | Condition |
|--------|--------|-----------|
| Admins can view all | SELECT | `is_admin(auth.uid())` |
| Agents can view own | SELECT | `from_agent_id = auth.uid() OR to_agent_id = auth.uid()` |
| System can insert | INSERT | `true` (for automated workflows) |

---

## Technical Details

### Migration SQL

```sql
-- Stage 1: Claim Window columns
ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS claim_timer_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS claim_timer_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS claim_sla_breached BOOLEAN DEFAULT FALSE;

-- Stage 2: Contact Window columns  
ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS contact_timer_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS contact_timer_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS contact_sla_breached BOOLEAN DEFAULT FALSE;

-- Reassignment tracking columns
ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS reassignment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS previous_agent_id UUID REFERENCES crm_agents(id),
ADD COLUMN IF NOT EXISTS reassignment_reason TEXT,
ADD COLUMN IF NOT EXISTS reassigned_at TIMESTAMPTZ;

-- Partial indexes for timer queries
CREATE INDEX IF NOT EXISTS idx_crm_leads_claim_timer_expires 
ON crm_leads(claim_timer_expires_at) 
WHERE claim_timer_expires_at IS NOT NULL AND lead_claimed = FALSE;

CREATE INDEX IF NOT EXISTS idx_crm_leads_contact_timer_expires 
ON crm_leads(contact_timer_expires_at) 
WHERE contact_timer_expires_at IS NOT NULL AND first_action_completed = FALSE;

-- Reassignment history table
CREATE TABLE IF NOT EXISTS crm_lead_reassignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES crm_agents(id),
  to_agent_id UUID NOT NULL REFERENCES crm_agents(id),
  reassigned_by UUID NOT NULL REFERENCES crm_agents(id),
  reason TEXT NOT NULL CHECK (reason IN ('unclaimed', 'no_contact', 'manual')),
  stage TEXT NOT NULL CHECK (stage IN ('claim_window', 'contact_window', 'manual')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reassignment queries
CREATE INDEX IF NOT EXISTS idx_reassignments_lead 
ON crm_lead_reassignments(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reassignments_from_agent 
ON crm_lead_reassignments(from_agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reassignments_to_agent 
ON crm_lead_reassignments(to_agent_id, created_at DESC);

-- Enable RLS
ALTER TABLE crm_lead_reassignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using existing is_admin pattern)
CREATE POLICY "Admins can view all reassignments"
  ON crm_lead_reassignments FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Agents can view own reassignments"
  ON crm_lead_reassignments FOR SELECT
  USING (from_agent_id = auth.uid() OR to_agent_id = auth.uid());

CREATE POLICY "Service role can insert reassignments"
  ON crm_lead_reassignments FOR INSERT
  WITH CHECK (true);

-- Column documentation
COMMENT ON COLUMN crm_leads.claim_timer_started_at IS 
'When the lead was created and claim window started';

COMMENT ON COLUMN crm_leads.claim_timer_expires_at IS 
'When the 5-minute claim window expires (5 min after creation)';

COMMENT ON COLUMN crm_leads.contact_timer_started_at IS 
'When the lead was claimed and contact window started';

COMMENT ON COLUMN crm_leads.contact_timer_expires_at IS 
'When the 5-minute contact window expires (5 min after claim)';
```

---

## Backward Compatibility

- All new columns are nullable - existing leads unaffected
- Existing `claim_window_expires_at` and `sla_breached` columns preserved
- No changes to existing RLS policies on `crm_leads`
- New indexes use partial WHERE clauses for minimal storage overhead

---

## Next Steps After Migration

1. Update lead intake edge function to set `claim_timer_started_at` and `claim_timer_expires_at` on new leads
2. Update claim function to set `contact_timer_started_at` and `contact_timer_expires_at` when lead is claimed
3. Create SLA monitoring edge function to check expired timers and trigger reassignments
4. Add UI components to display dual timers on lead cards

