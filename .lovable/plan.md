
# Unified Form Submission System with Admin Email Notifications

## Problem

Currently, not all forms on the site send data to the CRM lead routing system. Two forms are missing proper CRM integration:

1. **Team Member Contact Form** (`TeamMemberContactForm.tsx`) - Only saves to the legacy `leads` table
2. **Chatbot Contact Form** (`useChatbot.ts`) - Only saves to `chatbot_conversations`

Additionally, while leads go through the round-robin system, there's no dedicated email notification to admins showing the raw form submission details with form/page/language context.

---

## Solution Overview

1. **Integrate missing forms** with the `registerCrmLead` function
2. **Enhance `send-lead-notification`** to include a new "form_submission_alert" email type
3. **Track form metadata** (form name, page URL, language) in all submissions
4. **Send admin emails** via Resend with complete form data

---

## Implementation Steps

### Step 1: Update TeamMemberContactForm

Add CRM registration with proper form/page tracking:

| Field | Value |
|-------|-------|
| leadSource | "Website Form" |
| leadSourceDetail | "team_member_contact_{memberName}_{language}" |
| pageType | "team_page" |

Changes:
- Import `registerCrmLead` and `parseFullName` from existing utilities
- Call `registerCrmLead` after successful database insert
- Include member name being contacted in the interest field

### Step 2: Update useChatbot Submission

Connect the embedded chatbot form to the CRM:

| Field | Value |
|-------|-------|
| leadSource | "Emma Chatbot" |
| leadSourceDetail | "chatbot_embedded_{articleSlug}_{language}" |
| pageType | "blog_article" or "property_page" |

Changes:
- Import `registerCrmLead`
- Add CRM registration call with collected data (property type, budget, area)
- Include conversation summary in the message field

### Step 3: Create Admin Form Submission Notification

Add a new notification type "form_submission_alert" to `send-lead-notification` edge function that:
- Sends to designated admins (configurable via crm_system_settings)
- Shows complete form data in a clean email template
- Includes form name, source page, language, and timestamp
- Does NOT require round-robin - immediate notification to admins

New email template will include:
- Form identification (which form, which page, which language)
- All submitted data fields
- Source tracking (UTM parameters, referrer)
- Quick action buttons to view in admin dashboard

### Step 4: Add Admin Notification Trigger

Modify `register-crm-lead` edge function to:
- Always trigger an admin notification email for every new lead
- Include form-specific metadata in the notification
- Continue existing round-robin behavior unchanged

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/team/TeamMemberContactForm.tsx` | Add CRM registration with form/page tracking |
| `src/components/chatbot/useChatbot.ts` | Add CRM registration for chatbot contacts |
| `supabase/functions/send-lead-notification/index.ts` | Add "form_submission_alert" email template |
| `supabase/functions/register-crm-lead/index.ts` | Trigger admin notification for all leads |

---

## New Email Template Preview

```text
┌─────────────────────────────────────────────────────────┐
│  📬 NEW FORM SUBMISSION                                 │
│  Form: Team Member Contact                              │
│  Page: /en/team                                         │
│  Language: EN                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Contact Details                                        │
│  ────────────────────────────────────                   │
│  Name:     John Smith                                   │
│  Email:    john@example.com                             │
│  Phone:    +44 7123 456789                              │
│                                                         │
│  Message                                                │
│  ────────────────────────────────────                   │
│  "I'd like to schedule a viewing for properties        │
│   in Marbella..."                                       │
│                                                         │
│  Source Tracking                                        │
│  ────────────────────────────────────                   │
│  UTM Source:     google                                 │
│  UTM Campaign:   spring2026                             │
│  Referrer:       google.com                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │     📋 View in Admin Dashboard                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## CRM Lead Data Enhancement

All forms will now send these standard fields for tracking:

| Field | Description |
|-------|-------------|
| `leadSource` | Category: "Website Form", "Emma Chatbot", "Landing Form", etc. |
| `leadSourceDetail` | Specific identifier: "team_member_steven_en", "contact_page_de", etc. |
| `pageType` | Page category: "team_page", "contact_page", "blog_article", "property_page" |
| `pageUrl` | Full URL where form was submitted |
| `pageTitle` | Document title of the page |
| `language` | User's language code |
| `referrer` | Previous page URL |
| `message` | User's message/notes |
| `interest` | Context-specific info (property name, team member contacted, etc.) |

---

## Testing Checklist

After implementation, verify:

1. Team Member Contact Form → CRM lead created + admin email sent
2. Chatbot embedded form → CRM lead created + admin email sent  
3. Contact Page form → continues working + admin email sent
4. Landing page forms → continue working + admin email sent
5. Property inquiry forms → continue working + admin email sent
6. Brochure download forms → continue working + admin email sent
7. Retargeting forms → continue working + admin email sent

---

## Technical Notes

- The `registerCrmLead` function already handles the edge function call non-blocking
- Admin notification emails will use the existing `RESEND_API_KEY` secret
- Email sender will be `crm@notifications.delsolprimehomes.com` (already configured)
- Admin recipient list will be derived from `crm_round_robin_config.fallback_admin_id` for each language or a global admin list
