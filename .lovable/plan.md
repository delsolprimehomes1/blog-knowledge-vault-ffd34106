

# Add Country Prefix Visibility to Lead Dashboards

## Current State

Emma chatbot **already captures** the country prefix when asking users for their phone number. This data is stored in the `crm_leads` table in these columns:
- `country_prefix` (e.g., "+31", "+44", "+34")
- `country_name` (e.g., "Netherlands", "United Kingdom")
- `country_flag` (e.g., "🇳🇱", "🇬🇧")

**The problem**: These fields are not being displayed on the lead dashboards for admins and agents.

---

## What Needs to Change

### Visual Overview

| View | Current Display | After Fix |
|------|-----------------|-----------|
| Admin Leads Table | `7027776546` | `+1 7027776546` or `🇺🇸 +1 7027776546` |
| Agent Leads Table | `7027776546` | `+1 7027776546` |
| Mobile Lead Card | No prefix shown | `🇺🇸 +1 7027776546` |

---

## Implementation Plan

### 1. Update Admin Leads Hook (`src/hooks/useAdminLeads.ts`)

Add country fields to the `AdminLead` interface so they're available in the admin table:

```typescript
export interface AdminLead {
  // ... existing fields ...
  country_prefix: string | null;
  country_name: string | null;
  country_flag: string | null;
}
```

### 2. Update Admin Leads Overview (`src/pages/crm/admin/LeadsOverview.tsx`)

Modify the Contact column (lines 332-351) to show the prefix with the phone number:

```text
Current:
  📞 7027776546

After:
  🇺🇸 +1 7027776546
  ✉️ email@example.com
```

The country flag + prefix will be prepended to the phone number for immediate visibility.

### 3. Update Agent Leads Table (`src/components/crm/LeadsTable.tsx`)

Modify the Contact column (lines 319-340) to include the country prefix:

```text
Current:
  📞 7027776546

After:
  📞 +1 7027776546  (or 🇺🇸 +1 7027776546)
```

### 4. Update Mobile Lead Card (`src/components/crm/MobileLeadCard.tsx`)

The mobile card already shows country flag + name in the header. We'll also update the call/WhatsApp functionality description to show the full international number.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useAdminLeads.ts` | Add `country_prefix`, `country_name`, `country_flag` to AdminLead interface |
| `src/pages/crm/admin/LeadsOverview.tsx` | Show prefix + flag in Contact column |
| `src/components/crm/LeadsTable.tsx` | Show prefix in Contact column phone display |
| `src/components/crm/MobileLeadCard.tsx` | Show prefix with phone number display |

---

## Expected Result

After this update:
- **Admins** will see the full international phone number with country prefix in the leads table
- **Agents** will see the same in their leads table
- **Mobile view** will show the country prefix for easy identification
- All views will clearly indicate the lead's country of origin for proper follow-up

This helps agents and admins immediately know which country code to use when calling or messaging leads.

