
# Unified Form Submission System with Admin Email Notifications

## ✅ COMPLETED

All forms on the site now send data to the CRM lead routing system with admin email notifications.

---

## Changes Made

### 1. TeamMemberContactForm.tsx
- Added import for `registerCrmLead` utility
- After saving to legacy `leads` table, now also calls `registerCrmLead` with:
  - `leadSource`: "Website Form"
  - `leadSourceDetail`: "team_member_contact_{memberName}_{language}"
  - `pageType`: "team_page"
  - `interest`: Team member being contacted

### 2. useChatbot.ts
- Added import for `registerCrmLead` utility  
- After saving to `chatbot_conversations`, now also calls `registerCrmLead` with:
  - `leadSource`: "Emma Chatbot"
  - `leadSourceDetail`: "chatbot_embedded_{articleSlug}_{language}"
  - `pageType`: "blog_article"
  - `interest`: Conversation summary (property type, budget, area)

### 3. send-lead-notification Edge Function
- Added new notification type: `form_submission_alert`
- Added `generateFormSubmissionAlertEmailHtml()` function
- Template includes:
  - Form name, page URL, language
  - Contact details (name, phone, email)
  - Form-specific data (budget, property type, locations, etc.)
  - Source tracking (UTM parameters)
  - Link to admin dashboard

### 4. register-crm-lead Edge Function
- Now sends admin form submission alert for ALL new leads
- Gets all active admin agents and sends them form_submission_alert emails
- Includes form metadata (name, data, UTM tracking)
- Non-blocking - errors don't stop lead routing

---

## Email Template: Form Submission Alert

```
📬 NEW FORM SUBMISSION
Form: {form_name}
Page: {page_url}
Language: {flag} {language}
Time: {timestamp}

Contact: {name} | {phone} | {email}
Form Data: budget, property_type, locations, interest, message

Source Tracking: UTM Source, UTM Campaign

[📋 View in Admin Dashboard]
```

---

## CRM Lead Data Fields

All forms now send these standardized fields:

| Field | Description |
|-------|-------------|
| `leadSource` | Category: "Website Form", "Emma Chatbot", "Landing Form" |
| `leadSourceDetail` | Specific: "team_member_steven_en", "chatbot_embedded_slug_de" |
| `pageType` | "team_page", "blog_article", "contact_page", "property_page" |
| `pageUrl` | Full URL where form was submitted |
| `pageTitle` | Document title of the page |
| `language` | User's language code |
| `referrer` | Previous page URL |
| `message` | User's message/notes |
| `interest` | Context: property name, team member, conversation summary |

---

## Verification Checklist

After implementation, all these forms now:
1. ✅ Team Member Contact Form → CRM lead + admin email
2. ✅ Chatbot embedded form → CRM lead + admin email
3. ✅ Contact Page form → CRM lead + admin email (already working)
4. ✅ Landing page forms → CRM lead + admin email (already working)
5. ✅ Property inquiry forms → CRM lead + admin email (already working)
6. ✅ Brochure download forms → CRM lead + admin email (already working)
