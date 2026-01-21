# Del Sol Prime Homes CRM - Launch Day Runbook

## Overview

Step-by-step guide for CRM launch day with detailed timeline and responsibilities.

---

## T-1 Day (Day Before Launch)

### 4:00 PM - Final Staging Test

| Task | Owner | Status |
|------|-------|--------|
| Complete end-to-end test | QA | ☐ |
| Test all notification channels | Dev | ☐ |
| Verify all agents can log in | Admin | ☐ |
| Create database backup | Dev | ☐ |
| Prepare rollback plan | Dev | ☐ |

### 6:00 PM - Team Briefing

| Task | Owner | Status |
|------|-------|--------|
| Brief agents on launch schedule | Admin | ☐ |
| Share support channels | Admin | ☐ |
| Confirm login credentials sent | Admin | ☐ |
| Set expectations for go-live | Lead | ☐ |

---

## Launch Day

### 8:00 AM - Pre-Flight Checks

**Run Pre-Flight Checklist** (see CRM_PREFLIGHT_CHECK.md)

| Check | Status | Notes |
|-------|--------|-------|
| All environment variables set | ☐ | |
| Database connection healthy | ☐ | |
| Edge functions responding | ☐ | |
| Email service working | ☐ | |
| All team members ready | ☐ | |

---

### 9:00 AM - Database Final Prep

| Task | Owner | Status |
|------|-------|--------|
| Create production backup | Dev | ☐ |
| Verify all agent accounts exist | Admin | ☐ |
| Check agent language settings | Admin | ☐ |
| Confirm max lead capacities set | Admin | ☐ |

---

### 10:00 AM - Agent Onboarding

| Task | Owner | Status |
|------|-------|--------|
| Send welcome email with login info | Admin | ☐ |
| Share user guide link | Admin | ☐ |
| Agents test login (one at a time) | Agents | ☐ |
| Verify each agent's dashboard loads | Admin | ☐ |
| Test notification receipt | Agents | ☐ |

**Agent Login Checklist:**

| Agent Name | Logged In | Dashboard OK | Notifications OK |
|------------|-----------|--------------|------------------|
| | ☐ | ☐ | ☐ |
| | ☐ | ☐ | ☐ |
| | ☐ | ☐ | ☐ |
| | ☐ | ☐ | ☐ |
| | ☐ | ☐ | ☐ |

---

### 10:30 AM - System Warm-Up

**Create test leads for each language:**

| Language | Test Lead Created | Notification Sent | Agent Claimed |
|----------|-------------------|-------------------|---------------|
| French (fr) | ☐ | ☐ | ☐ |
| Dutch (nl) | ☐ | ☐ | ☐ |
| Finnish (fi) | ☐ | ☐ | ☐ |
| Polish (pl) | ☐ | ☐ | ☐ |
| English (en) | ☐ | ☐ | ☐ |

**Verify:**
- [ ] Test leads appear in correct agents' dashboards
- [ ] 15-minute claim window displays
- [ ] Claim button works
- [ ] Activity logging works
- [ ] Reminder creation works

---

### 11:00 AM - GO LIVE 🚀

| Task | Owner | Status | Time |
|------|-------|--------|------|
| Enable Emma Chatbot webhook | Dev | ☐ | 11:00 |
| Enable landing form webhooks | Dev | ☐ | 11:02 |
| Enable brochure form webhooks | Dev | ☐ | 11:05 |
| Announce go-live to team | Lead | ☐ | 11:10 |
| Begin active monitoring | All | ☐ | 11:10 |

**Webhook Endpoints to Enable:**

```
POST https://[project-id].supabase.co/functions/v1/register-crm-lead

Headers:
  Authorization: Bearer [anon-key]
  Content-Type: application/json
```

---

### 11:00 AM - 1:00 PM - Active Monitoring

**Check every 15 minutes:**

| Time | Leads In | Claims | Errors | Notes |
|------|----------|--------|--------|-------|
| 11:15 | | | | |
| 11:30 | | | | |
| 11:45 | | | | |
| 12:00 | | | | |
| 12:15 | | | | |
| 12:30 | | | | |
| 12:45 | | | | |

**What to Monitor:**
- Lead intake (new leads appearing)
- Notification delivery (emails sent)
- Claim success rate
- Edge function logs (any errors?)
- Agent questions in support channel

---

### 1:00 PM - 5:00 PM - Continued Monitoring

**Check every 30 minutes:**

| Time | Leads | Claims | Unclaimed | Issues |
|------|-------|--------|-----------|--------|
| 1:30 | | | | |
| 2:00 | | | | |
| 2:30 | | | | |
| 3:00 | | | | |
| 3:30 | | | | |
| 4:00 | | | | |
| 4:30 | | | | |

---

### 5:00 PM - End of Day Review

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Total leads received | >10 | | |
| Leads claimed | >90% | | |
| Avg claim time | <5 min | | |
| SLA breaches | 0 | | |
| System errors | 0 | | |

**Issues Encountered:**

| Issue | Severity | Status | Resolution |
|-------|----------|--------|------------|
| | | | |
| | | | |

---

### 6:00 PM - Team Debrief

**Agenda:**
1. Share day's metrics
2. Celebrate successes
3. Discuss any issues
4. Collect agent feedback
5. Plan for tomorrow

**Action Items for Tomorrow:**

| Item | Owner | Due |
|------|-------|-----|
| | | |
| | | |

---

## Post-Launch Monitoring

### Week 1 - Daily Checks

| Day | Task | Owner | Status |
|-----|------|-------|--------|
| Day 1 | Full day monitoring | All | ☐ |
| Day 2 | Morning check + fixes | Dev | ☐ |
| Day 3 | Performance review | Lead | ☐ |
| Day 4 | Agent feedback session | Admin | ☐ |
| Day 5 | Week 1 report | Lead | ☐ |

### Week 1 Success Criteria

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Leads claimed within 15 min | >90% | | ☐ |
| SLA compliance | >95% | | ☐ |
| Email delivery rate | 100% | | ☐ |
| Critical bugs | 0 | | ☐ |
| Agent satisfaction | >4/5 | | ☐ |

---

## Rollback Procedures

### Rollback Triggers

Execute rollback if any of these occur:

- [ ] System down >30 minutes
- [ ] Data loss detected
- [ ] Security breach discovered
- [ ] >50% of leads not flowing correctly
- [ ] Critical authentication failure

### Rollback Steps

1. **Disable Webhooks**
   - Remove webhook URLs from Emma/Forms
   - This stops new leads coming in

2. **Notify Team**
   - Post in team Slack/channel
   - Email all agents about temporary pause

3. **Assess Issue**
   - Check edge function logs
   - Review database for issues
   - Identify root cause

4. **Fix and Test**
   - Apply fix
   - Test in isolation
   - Verify with test lead

5. **Re-Enable**
   - Re-add webhook URLs
   - Monitor closely for 1 hour
   - Communicate resolution to team

### Rollback Commands

**Revert Lovable Deployment:**
1. Go to project Settings
2. Click "Deployments"
3. Find last working deployment
4. Click "Restore"

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Technical Lead | | |
| Admin Lead | | |
| Product Owner | | |
| Lovable Support | | support@lovable.dev |

---

## Success Metrics

### Month 1 Goals

| Metric | Target |
|--------|--------|
| Total leads processed | 500+ |
| Contact rate within 24h | >80% |
| Qualified rate | >50% |
| Conversion rate | >10% |
| Agent satisfaction | >4/5 |

---

*Last Updated: January 2026*
