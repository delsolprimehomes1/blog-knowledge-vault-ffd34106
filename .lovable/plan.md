

# Full Lead Lifecycle Audit Report

## Overview

I traced every code path from lead entry to final disposition. Below is the complete audit across all 6 checkpoints you requested.

---

## 1. ENTRY POINTS: Do All Forms and Emma Go Through Round Robin?

**VERDICT: YES -- 10 out of 10 entry points call `registerCrmLead()`**

| # | Entry Point | File | Calls registerCrmLead? |
|---|-------------|------|----------------------|
| 1 | Landing Page Form | `src/components/landing/LandingPageForm.tsx` | Yes |
| 2 | Lead Submission (generic) | `src/utils/landing/leadSubmission.ts` | Yes |
| 3 | Property Contact Form | `src/components/property/PropertyContact.tsx` | Yes |
| 4 | Brochure Opt-In Form | `src/components/brochures/BrochureOptInForm.tsx` | Yes |
| 5 | Contact Page Form | `src/components/contact/ContactForm.tsx` | Yes |
| 6 | Team Member Contact Form | `src/components/team/TeamMemberContactForm.tsx` | Yes |
| 7 | Apartments Lead Form | `src/components/apartments/ApartmentsLeadFormModal.tsx` | Yes |
| 8 | Retargeting Form | `src/hooks/useRetargetingForm.ts` | Yes |
| 9 | Retargeting Property Modal | `src/components/retargeting/RetargetingPropertyModal.tsx` | Yes |
| 10 | Emma Chatbot | `src/components/chatbot/useChatbot.ts` | Yes |

All 10 call `registerCrmLead()` which invokes the `register-crm-lead` edge function. This function handles:
- Lead scoring and segmentation
- Business hours check (night hold if outside 09:00-21:00 Madrid)
- Round robin config lookup
- T+0 broadcast to all language-matched agents
- Admin form submission alert

**No gaps found.**

---

## 2. T+0 BROADCAST: Do Selected Agents Receive Claim Emails?

**VERDICT: YES -- with the 2-second rate limit fix now in place**

**Flow:**
1. `register-crm-lead` creates the lead with `last_alarm_level: 0`
2. Looks up `crm_round_robin_config` for the lead's language (Round 1)
3. Fetches agent details, filters by: `is_active`, `accepts_new_leads`, capacity, and excludes admins (unless only admins exist)
4. Calls `send-lead-notification` with the agent list
5. `send-lead-notification` now shuffles agents randomly and sends emails with 2-second delays

**Potential issue found:** The `register-crm-lead` function sends TWO calls to `send-lead-notification`:
- Call 1 (line 559): Admin form submission alert
- Call 2 (line 769): Agent T+0 broadcast

These are sequential (Call 1 completes before Call 2 starts), and each call now has internal 2-second throttling. This should prevent rate limit failures.

**Night-held leads:** Leads arriving between 21:00-09:00 Madrid time are silently held. The `release-night-held-leads` cron job releases them at 09:00 with `last_alarm_level: 0` and a fresh `claim_timer_started_at`, then sends the T+0 broadcast. This path is correct.

---

## 3. T+1 to T+4 ESCALATION: Do Secondary Emails Fire After 1 Minute?

**VERDICT: YES -- state machine is correctly implemented**

**Flow (managed by `send-escalating-alarms` cron, runs every 1 minute):**

| Time | Level | Query Condition | Action |
|------|-------|----------------|--------|
| T+0 | 0 | Set by `register-crm-lead` | Initial broadcast (handled above) |
| T+1 | 0 -> 1 | `last_alarm_level = 0` AND `claim_timer_started_at <= now - 1 min` | Yellow reminder email |
| T+2 | 1 -> 2 | `last_alarm_level = 1` AND `claim_timer_started_at <= now - 2 min` | Orange reminder email |
| T+3 | 2 -> 3 | `last_alarm_level = 2` AND `claim_timer_started_at <= now - 3 min` | Red urgent email |
| T+4 | 3 -> 4 | `last_alarm_level = 3` AND `claim_timer_started_at <= now - 4 min` | Final warning email |

Each level increments `last_alarm_level` after sending, ensuring no duplicate sends.

**Email delivery:** `send-escalating-alarms` batches all agent emails into a single Resend API call per lead (line 264: `to: agentEmails`), so rate limiting is NOT an issue here.

**Admin filtering:** Correctly excludes admins from escalation emails unless they're the only agents available (lines 124-132).

**When claimed:** `claim-lead` sets `last_alarm_level: 99`, which effectively kills the escalation sequence since the cron only looks for levels 0-3.

**No issues found.**

---

## 4. T+5 ADMIN FALLBACK: Does the Fallback Admin Get Notified?

**VERDICT: YES -- with the Hans fix now in place**

**Flow (managed by `check-claim-window-expiry` cron, runs every 1 minute):**

1. Queries leads where `claim_timer_expires_at < now` AND `lead_claimed = false` AND `claim_sla_breached = false`
2. Looks up `fallback_admin_id` from `crm_round_robin_config` for the lead's language
3. Sets `claim_sla_breached: true`
4. Sends email directly via Resend to the fallback admin (Hans)
5. Creates in-app notification and activity log

**Subject line:** `CRM_ADMIN_NO_CLAIM_[LANG] | No agent claimed lead within 5 minutes`

**All 10 languages now correctly point to Hans** (`95808453-dde1-421c-85ba-52fe534ef288`) as `fallback_admin_id`.

**One observation:** This function sends the email directly via Resend (not through `send-lead-notification`), so it bypasses the email logging in `crm_email_logs`. The email IS sent, but there's no database audit trail for T+5 admin emails specifically. The `crm_activities` entry serves as the only record.

---

## 5. ADMIN REASSIGNMENT: Does the New Agent Get an Email?

**VERDICT: YES -- fully implemented**

**Flow (managed by `reassign-lead` edge function):**

1. Updates lead with new `assigned_agent_id`, resets contact timer (5 min)
2. Records reassignment in `crm_lead_reassignments` table
3. Adjusts lead counts on both old and new agents
4. Creates in-app notification for new agent
5. Sends email directly via Resend to the new agent

**Subject line:** `CRM_LEAD_REASSIGNED_[LANG] | Lead reassigned to you`

**Email content includes:**
- Full lead details (name, phone, email, language, source)
- Reassignment reason and previous agent name
- Contact timer warning (5 minutes) for non-manual reassignments
- CTA button linking to `/crm/agent/leads/[id]`

**No issues found.**

---

## 6. CONTACT SLA BREACH: Does Admin Get Notified When Agent Doesn't Call?

**VERDICT: YES -- fully implemented**

**Flow (managed by `check-contact-window-expiry` cron, runs every 1 minute):**

1. Queries leads where `contact_timer_expires_at < now` AND `lead_claimed = true` AND `first_action_completed = false` AND `contact_sla_breached = false`
2. Gets assigned agent details (name, email)
3. Looks up `fallback_admin_id` from `crm_round_robin_config`
4. Sets `contact_sla_breached: true`
5. Sends email to fallback admin (Hans) with agent details and lead details
6. Creates in-app notification and activity log

**Subject line:** `CRM_ADMIN_CLAIMED_NOT_CALLED_[LANG] | Lead claimed but not called (SLA breach)`

**Same observation as T+5:** This function sends emails directly via Resend, bypassing `crm_email_logs`.

---

## Summary of Findings

| Checkpoint | Status | Notes |
|-----------|--------|-------|
| All forms go through round robin | PASS | 10/10 entry points verified |
| Agents get T+0 claim email | PASS | Rate limit fix deployed |
| T+1 to T+4 escalation emails | PASS | State machine correct, single batch API call |
| T+5 admin fallback email | PASS | Hans set for all languages |
| Reassignment email to new agent | PASS | Full details + contact timer |
| Contact SLA breach admin email | PASS | Agent details included |

### Minor Observations (Non-Blocking)

1. **No email audit trail for T+5 and Contact SLA emails**: `check-claim-window-expiry` and `check-contact-window-expiry` send emails directly via Resend without logging to `crm_email_logs`. Only `crm_activities` records exist. This means the Email Logs view in the admin panel won't show these notifications.

2. **`release-night-held-leads` doesn't set `claim_timer_expires_at`**: It sets `claim_timer_started_at` but not `claim_timer_expires_at`. The `check-claim-window-expiry` cron uses `claim_timer_expires_at` for its query. However, `claim_window_expires_at` IS set (line 81), and the escalation state machine (`send-escalating-alarms`) uses `claim_timer_started_at` which IS set. So T+1 through T+4 will fire correctly, but the T+5 breach detection relies on `claim_timer_expires_at` which is NOT set for released night-held leads.

   **This is a bug**: Night-held leads released at 09:00 will get T+0 through T+4 escalation emails, but if still unclaimed at T+5, the `check-claim-window-expiry` cron will NOT detect them because `claim_timer_expires_at` is null. They would eventually be caught by the legacy `check-unclaimed-leads` cron (every 15 minutes via `claim_window_expires_at`), but there would be a 10-15 minute delay before admin notification.

### Recommended Fix

Add `claim_timer_expires_at` to the `release-night-held-leads` update (1 line change):

```
// In release-night-held-leads/index.ts, line 82, add:
claim_timer_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
```

This ensures night-held leads get the same 5-minute T+5 admin notification as daytime leads.

