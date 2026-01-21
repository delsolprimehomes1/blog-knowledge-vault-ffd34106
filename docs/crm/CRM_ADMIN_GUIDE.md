# Del Sol Prime Homes CRM - Admin User Guide

## Overview

This guide covers admin-specific features for managing leads, agents, and overall CRM operations.

---

## Accessing Admin Features

### Admin Dashboard

Navigate to `/crm/admin/dashboard` to access the admin control center.

**You must have:**
- `role = "admin"` in your agent record, OR
- `can_override_assignment = true`

Non-admins will be redirected to the agent dashboard.

---

## Admin Dashboard Overview

### Stats Cards

| Card | Description |
|------|-------------|
| **Total Leads** | All non-archived leads in system |
| **Unclaimed Leads** | Leads not yet claimed by any agent |
| **Active Agents** | Agents currently accepting new leads |
| **SLA Breaches** | Leads with >24h since assignment without contact |

### Quick Actions

- **View Unclaimed Leads** - Jump to unclaimed lead queue
- **View SLA Breaches** - See leads needing attention
- **Add New Agent** - Create a new agent account

### Team Activity Feed

Real-time feed showing recent activities across all agents:
- Agent name and avatar
- Activity type (call, email, WhatsApp, note)
- Lead name
- Outcome/notes preview
- Timestamp

### Agent Capacity Overview

See all agents with:
- Current lead count
- Maximum capacity
- Capacity percentage (visual bar)
- Languages spoken
- Active/inactive status

---

## Managing Unclaimed Leads

### Leads Overview Page

Navigate to `/crm/admin/leads` for full lead management.

### Filtering Leads

| Filter | Options |
|--------|---------|
| **Search** | Name, email, phone |
| **Status** | Unclaimed, Claimed, SLA Breach, Expired Claim |
| **Language** | All languages supported |
| **Segment** | Hot, Warm, Cool, Cold |
| **Priority** | Urgent, High, Medium, Low |

### Lead Table Indicators

| Indicator | Meaning |
|-----------|---------|
| 🔴 SLA Breach | >24h since assigned, no contact |
| 🟠 Expired Claim | Claim window passed without claim |
| 💡 Suggested: [Name] | Recommended agent (least loaded) |
| ⚡ Hot | High-priority, high-score lead |

---

## Manual Lead Assignment

### Individual Assignment

1. Find the lead in the leads table
2. Click the **Actions** menu (⋮)
3. Select **"Assign Lead"**
4. In the dialog:
   - Review lead details (segment, priority, budget)
   - Select an agent from the dropdown
   - Agents show: capacity bar, language compatibility
   - **"Suggested"** badge shows optimal agent
5. Optionally add an **assignment reason**
6. Click **"Assign Lead"**

### Quick Assignment

For unclaimed leads with a suggested agent:
1. Click **"Quick Assign to [Agent Name]"** in the actions menu
2. Lead is immediately assigned with reason: "Auto-suggested (least loaded)"

### What Happens on Assignment

- Lead's `assigned_agent_id` is set
- Lead's `assignment_method` = "admin_assigned"
- Lead's `lead_claimed` = true
- Agent's `current_lead_count` incremented
- Agent receives notification
- Activity logged: "Lead manually assigned by admin"

---

## Bulk Assignment

### Selecting Multiple Leads

1. Use checkboxes in the lead table
2. Click individual checkboxes, OR
3. Click the header checkbox to select all visible

### Bulk Assignment Bar

When leads are selected, a bar appears showing:
- Number of leads selected
- Clear selection button
- Agent dropdown
- Bulk Assign button

### Performing Bulk Assignment

1. Select leads (checkboxes)
2. Choose an agent from the dropdown
3. System checks:
   - Agent has capacity for all selected leads
   - Language compatibility (warning if mismatch)
4. Click **"Bulk Assign"**
5. All leads assigned with activity logging

**Capacity Warning:** If selected count exceeds agent's available capacity, you'll see a warning before proceeding.

---

## Reassigning Leads

### When to Reassign

- Agent is overloaded
- Agent is going on leave
- Lead language mismatch discovered
- Performance issues

### How to Reassign

1. Find the assigned lead
2. Click **Actions → Reassign Lead**
3. Select the new agent
4. Add a reassignment reason
5. Click **"Reassign"**

### What Happens

- Old agent's `current_lead_count` decremented
- New agent's `current_lead_count` incremented
- Both agents notified
- Activity logged: "Lead reassigned by admin from [Old] to [New]. Reason: [reason]"

---

## Restart Round Robin

### When to Use

- Claim window expired with no claims
- Need to re-broadcast a lead
- Assignment error needs reset

### How to Restart

1. Find the lead
2. Click **Actions → Restart Round Robin**
3. Confirm the action

### What Happens

- `assigned_agent_id` = null
- `lead_claimed` = false
- `claim_window_expires_at` = +15 minutes from now
- New notifications sent to all eligible agents
- Activity logged: "Round robin restarted by admin"

---

## Agent Management

### Viewing All Agents

Navigate to `/crm/admin/agents` to see:
- All agent accounts
- Active/inactive status
- Current capacity
- Languages
- Performance stats

### Creating a New Agent

1. Click **"Add New Agent"**
2. Fill in required fields:
   - First name, Last name
   - Email (becomes login)
   - Password
   - Phone (optional)
   - Role: Agent or Admin
   - Languages (select multiple)
   - Max active leads (default: 50)
   - Timezone
   - Email notifications (on/off)
3. Click **"Create Agent"**

### What Happens

- Auth user created (can log in)
- Agent record created
- Agent receives welcome email with credentials

### Editing an Agent

1. Find agent in list
2. Click **Edit**
3. Modify fields
4. Click **Save**

**Note:** Email cannot be changed (tied to auth account)

### Deactivating an Agent

1. Find agent
2. Click **Deactivate**
3. Confirm

**What Happens:**
- Agent cannot log in
- Agent's leads are archived
- Agent hidden from assignment dropdowns

---

## SLA Monitoring

### What is SLA?

Service Level Agreement - leads should receive first contact within target time:

| Priority | SLA Target |
|----------|------------|
| Urgent | 2 hours |
| High | 4 hours |
| Medium | 8 hours |
| Low | 24 hours |

### SLA Breach = 24 hours with no logged activity

### Viewing SLA Breaches

1. Dashboard shows breach count
2. Filter leads by "SLA Breach" status
3. See red badges on affected leads

### Handling Breaches

Options:
1. Contact the agent directly
2. Reassign the lead
3. Follow up with lead yourself

---

## Performance Monitoring

### Agent Performance Metrics

| Metric | What It Shows |
|--------|---------------|
| Claim Time | Average time to claim new leads |
| Response Time | Average time to first contact |
| Activities/Lead | Average activities per lead |
| Conversion Rate | % of leads to closed deals |
| Capacity Utilization | Current leads vs max capacity |

### Identifying Issues

Watch for:
- High claim times (agents not responding)
- Low activities per lead
- SLA breaches
- Capacity imbalances

---

## Viewing All Activities

### Team Activity Feed

The admin dashboard shows a real-time feed of all activities.

### Filtering Activities

- By agent
- By activity type
- By date range

### Activity Details

Each activity shows:
- Timestamp
- Agent name
- Lead name (clickable)
- Activity type and outcome
- Notes preview

---

## Reports & Export

### Exporting Lead Data

1. Go to Leads Overview
2. Apply desired filters
3. Click **"Export"**
4. Choose format (CSV)
5. Download file

### Key Metrics to Track

**Weekly:**
- New leads received
- Claims by agent
- Average claim time
- SLA compliance %
- Conversion rate

**Monthly:**
- Lead sources breakdown
- Agent performance comparison
- Pipeline velocity
- Revenue attribution

---

## System Health

### Health Check

The system runs automatic health checks:
- Database connectivity
- Storage access
- Edge function availability

### Viewing Health Status

Click the health indicator in admin header to see:
- Overall status (healthy/degraded/unhealthy)
- Individual service status
- Last check timestamp

### Common Issues

| Issue | Possible Cause | Action |
|-------|----------------|--------|
| Database degraded | High load | Monitor, may resolve |
| Function errors | Bug or timeout | Check logs, report |
| Email failures | API key issue | Verify RESEND_API_KEY |

---

## Troubleshooting

### "Agent can't claim leads"

Check:
- Agent is active
- Agent accepts new leads
- Agent speaks lead's language
- Agent not at max capacity

### "Lead stuck as unclaimed"

Options:
- Manual assignment
- Restart round robin
- Check if any agents are eligible

### "Notifications not sending"

Check:
- RESEND_API_KEY configured
- Agent email is valid
- Check Resend dashboard for errors

### "Performance is slow"

Check:
- Database health
- Large data queries
- Browser cache/refresh

---

## Best Practices

### Lead Distribution

- Balance load across agents
- Match languages accurately
- Don't exceed agent capacity

### Agent Management

- Regular performance reviews
- Address SLA issues promptly
- Keep capacity limits realistic

### System Monitoring

- Check dashboard daily
- Address breaches immediately
- Review weekly metrics

---

## Keyboard Shortcuts (Admin)

| Key | Action |
|-----|--------|
| `Ctrl+Shift+A` | Go to Admin Dashboard |
| `Ctrl+Shift+L` | Go to Leads Overview |
| `Ctrl+Shift+G` | Go to Agent Management |

---

## Getting Help

### Internal Support
- Team lead
- Technical support team

### Platform Issues
- Lovable support: support@lovable.dev

---

## Admin Responsibilities Schedule

### Daily Tasks

| Time | Task | Priority |
|------|------|----------|
| 9:00 AM | Check unclaimed leads >30 minutes | High |
| 9:30 AM | Review overnight SLA breaches | High |
| 10:00 AM | Check error logs in Cloud View | Medium |
| Throughout | Respond to agent questions | High |
| 5:00 PM | End of day unclaimed lead check | High |

### Weekly Tasks (Every Friday)

| Task | Description |
|------|-------------|
| **Performance Report** | Generate metrics: claim times, SLA compliance, conversion rates |
| **Agent Feedback** | Collect and review agent feedback |
| **Improvement Planning** | Identify bottlenecks and plan fixes |
| **Documentation Updates** | Update guides based on feedback |

### Monthly Tasks (First Monday)

| Task | Description |
|------|-------------|
| **Trend Analysis** | Review month-over-month metrics |
| **Feature Planning** | Plan new features based on needs |
| **Support Ticket Review** | Analyze common issues |
| **Training Materials** | Update training docs and videos |

---

*Last Updated: January 2026*
