

# CRM Routing Database Configuration

## Status
The database is now awake and responsive. We can proceed with the 5-task plan to complete the CRM routing configuration.

## Execution Sequence

### Task 1: Query Agent IDs
Run the agent lookup query to map emails to UUIDs for all 10 agents.

### Task 2: Update 6 Existing Language Configs
Using the retrieved UUIDs, update `crm_round_robin_config` for EN, DE, NL, FR, FI, PL with correct `agent_ids` and `fallback_admin_id` values.

### Task 3: Add 5 Missing Languages
Insert ES, SV, DA, HU, NO into `crm_round_robin_config` with Steven as both agent and fallback admin (using `ON CONFLICT` for safety).

### Task 4: Verification Query
Run the full join query to confirm all 11 languages are correctly configured with proper agent assignments and fallback admins.

### Task 5: Summary Report
Output the complete agent ID mapping and configuration status.

## Key Validations
- Hans appears ONLY as `fallback_admin_id` for FI and PL
- Hans is NOT in any `agent_ids` arrays
- All 11 languages have active configurations with `claim_window_minutes = 5`
- Steven is fallback admin for all languages except FI and PL

## Technical Notes
- All changes are data updates (UPDATE/INSERT), not schema changes
- The `ON CONFLICT (language)` clause on inserts prevents duplicates
- No edge function or application code changes needed

