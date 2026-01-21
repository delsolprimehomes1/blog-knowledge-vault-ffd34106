# Del Sol Prime Homes CRM - Pre-Launch Verification Checklist

## Overview

Complete this checklist before launching the CRM to production. All items must pass before go-live.

---

## 1. Environment Configuration

### Lovable Cloud Secrets
| Secret | Status | Verification |
|--------|--------|--------------|
| `RESEND_API_KEY` | ☐ | Test email sends successfully |
| `SLACK_BOT_TOKEN` | ☐ | (If using Slack notifications) |
| `SLACK_ADMIN_CHANNEL` | ☐ | (If using Slack notifications) |

### Frontend Environment
| Variable | Status | Value |
|----------|--------|-------|
| `VITE_SUPABASE_URL` | ☐ | Should be set automatically |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ☐ | Should be set automatically |
| `VITE_SUPABASE_PROJECT_ID` | ☐ | Should be set automatically |

---

## 2. Build Verification

### Build Status
- [ ] Project builds without errors
- [ ] No TypeScript compilation errors
- [ ] No console errors in browser
- [ ] All routes load correctly

### Test Build Command
1. Click "Publish" in Lovable
2. Verify deployment succeeds
3. Test published URL loads

---

## 3. Database Verification

### Tables Exist with RLS
| Table | Exists | RLS Enabled |
|-------|--------|-------------|
| `crm_agents` | ☐ | ☐ |
| `crm_leads` | ☐ | ☐ |
| `crm_activities` | ☐ | ☐ |
| `crm_reminders` | ☐ | ☐ |
| `crm_lead_notes` | ☐ | ☐ |
| `crm_notifications` | ☐ | ☐ |

### Verification Steps
1. Go to Cloud View in Lovable
2. Check each table exists
3. Verify RLS is enabled (check policies exist)

### Database Functions
| Function | Status | Test |
|----------|--------|------|
| `claim_lead(p_lead_id, p_agent_id)` | ☐ | Manual test via edge function |
| `is_crm_agent(_user_id)` | ☐ | Used in RLS policies |
| `can_access_lead(_user_id, _lead_id)` | ☐ | Used in RLS policies |

---

## 4. Edge Functions Verification

### Deployed Functions
| Function | Status | Test Method |
|----------|--------|-------------|
| `register-crm-lead` | ☐ | POST test payload |
| `claim-lead` | ☐ | Claim button in UI |
| `send-lead-notification` | ☐ | Create test lead |
| `create-crm-agent` | ☐ | Admin creates agent |
| `delete-crm-agent` | ☐ | Admin deletes agent |
| `health-check` | ☐ | GET request |

### Test Procedure
1. View edge function logs in Cloud View
2. Trigger each function
3. Verify no errors in logs

---

## 5. Email Notifications

### Resend Configuration
- [ ] RESEND_API_KEY is valid
- [ ] From email is verified in Resend
- [ ] Test email sends successfully

### Test Email Flow
1. Create test lead via webhook
2. Verify email sent to eligible agents
3. Check Resend dashboard for delivery status

---

## 6. Real-Time Subscriptions

### Subscriptions Working
| Subscription | Status | Test |
|--------------|--------|------|
| `crm_leads` changes | ☐ | Create lead, verify UI updates |
| `crm_activities` changes | ☐ | Log activity, verify timeline updates |
| `crm_reminders` changes | ☐ | Create reminder, verify calendar updates |
| `crm_notifications` changes | ☐ | Create notification, verify bell updates |

---

## 7. User Accounts

### Admin Account
- [ ] At least one admin agent exists
- [ ] Admin can access `/crm/admin/dashboard`
- [ ] Admin can view all leads

### Agent Accounts
| Agent | Email | Languages | Status |
|-------|-------|-----------|--------|
| | | | ☐ Active |
| | | | ☐ Active |
| | | | ☐ Active |

### Test Agent Login
1. Log in as each agent
2. Verify dashboard loads
3. Verify correct language filter

---

## 8. Feature Testing

### Lead Flow
- [ ] Webhook creates lead successfully
- [ ] Lead appears in eligible agents' dashboards
- [ ] 15-minute claim window works
- [ ] Claim button assigns lead
- [ ] Race condition handled (only first claim succeeds)

### Activity Logging
- [ ] Log Call works with all outcomes
- [ ] Log Email saves correctly
- [ ] Log WhatsApp logs activity
- [ ] Add Note creates note
- [ ] Set Reminder creates reminder

### Calendar
- [ ] Day view displays correctly
- [ ] Week view displays correctly
- [ ] Month view displays correctly
- [ ] Countdown timers update in real-time
- [ ] Complete/Snooze/Reschedule work

### Admin Features
- [ ] Dashboard stats are accurate
- [ ] Leads Overview shows all leads
- [ ] Manual assignment works
- [ ] Bulk assignment works
- [ ] Restart Round Robin works

---

## 9. Mobile Responsiveness

- [ ] Dashboard loads on mobile
- [ ] Lead detail page scrolls correctly
- [ ] Drawers open and close properly
- [ ] Calendar view works on tablet

---

## 10. Performance

### Page Load Times
| Page | Target | Actual | Status |
|------|--------|--------|--------|
| Agent Dashboard | <2s | | ☐ |
| Lead Detail | <2s | | ☐ |
| Calendar | <3s | | ☐ |
| Admin Dashboard | <3s | | ☐ |
| Leads Overview | <3s | | ☐ |

---

## Final Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | | | |
| Admin Lead | | | |
| Product Owner | | | |

---

## Go/No-Go Decision

- [ ] **GO** - All checks passed, ready to launch
- [ ] **NO-GO** - Issues found, resolve before launch

**Issues to resolve:**
1. 
2. 
3. 

---

*Last Updated: January 2026*
