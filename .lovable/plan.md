
# Plan: Give Admins Access to Their Agent Dashboard

## Current Situation

| Route | Who Can Access |
|-------|----------------|
| `/crm/agent/*` | Any active user in `crm_agents` table |
| `/crm/admin/*` | Only users where `role = 'admin'` |

The good news: The `CrmAgentRoute` component already allows admins to access agent routes because it only checks if the user exists in `crm_agents` and is active - it doesn't check their role.

The problem: There's no navigation link for admins to reach their agent dashboard.

---

## Solution

Add a prominent "My Agent Dashboard" link in the admin layout sidebar that navigates to `/crm/agent/dashboard`. This gives admins quick access to:
- Their personally assigned leads
- Their calendar and reminders
- The same agent experience their team uses

---

## Implementation

### File: `src/components/crm/CrmAdminLayout.tsx`

Add a new navigation section that links to the agent dashboard:

| Change | Details |
|--------|---------|
| Add new nav item | "My Leads" with a link to `/crm/agent/dashboard` |
| Visual separator | Add a divider between admin tools and personal agent view |
| Icon | Use `Briefcase` or `UserCircle` to differentiate from admin items |

---

## Updated Sidebar Structure

```text
┌─────────────────────────────┐
│ Del Sol Prime - Agent CRM   │
├─────────────────────────────┤
│ ADMIN TOOLS                 │
│ ├─ Dashboard                │
│ ├─ Analytics                │
│ ├─ Agents                   │
│ ├─ Leads Overview           │
│ ├─ Call Logs                │
│ ├─ Routing Rules            │
│ ├─ Round Robin              │
│ ├─ Email Logs               │
│ ├─ Verification             │
│ └─ Settings                 │
├─────────────────────────────┤
│ MY AGENT VIEW (NEW)         │
│ ├─ My Dashboard             │
│ ├─ My Leads                 │
│ └─ My Calendar              │
├─────────────────────────────┤
│ Signed in as [Admin Name]   │
│ [Sign Out]                  │
└─────────────────────────────┘
```

---

## Technical Details

### Modified File

**`src/components/crm/CrmAdminLayout.tsx`**:
1. Add a new `agentNavigation` array with links to:
   - `/crm/agent/dashboard` (My Dashboard)
   - `/crm/agent/leads` (My Leads)
   - `/crm/agent/calendar` (My Calendar)

2. Update the `NavLinks` component to render:
   - A "Admin Tools" label
   - Existing admin navigation items
   - A separator
   - A "My Agent View" label
   - New agent navigation items

3. Apply appropriate icons:
   - `LayoutDashboard` for My Dashboard
   - `Users` for My Leads  
   - `Calendar` for My Calendar

---

## Summary

After implementation:
- Admins will see a new "My Agent View" section in their sidebar
- Clicking any link takes them to the agent dashboard with their personal leads
- Each admin's agent dashboard shows only leads assigned to them (filtered by `assigned_agent_id`)
- No changes needed to route guards - admins are already valid agents
