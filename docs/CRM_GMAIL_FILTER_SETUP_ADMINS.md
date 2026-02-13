# 📧 CRM Gmail Filter Setup — Admins

> **Last updated:** 2026-02-13
> **Sender:** `crm@notifications.delsolprimehomes.com`
> **Audience:** Admin users only

---

## 👤 Admin Routing

| Admin | Handles Languages |
|-------|------------------|
| **Hans** | FI (Finnish), PL (Polish) |
| **Steven** | EN, NL, FR, DE, ES, SV, DA, HU, NO |

Both admins receive all admin emails. Use Gmail filters or manual review to focus on your assigned languages.

---

## 📁 Step 1: Create Your Label Tree

Create these 3 labels in Gmail (Settings → Labels → Create new label):

```
CRM/
└── Admin/
    ├── Form-Submissions
    ├── Stage-1-Breach
    └── Stage-2-Breach
```

**How to create:**
1. Create `CRM` (if not already present)
2. Create `Admin` nested under `CRM`
3. Create `Form-Submissions`, `Stage-1-Breach`, and `Stage-2-Breach` each nested under `CRM/Admin`

---

## 📋 Filter Overview

| # | Filter Name | Gmail Label | Catches | Priority |
|---|------------|-------------|---------|----------|
| 1 | T+5 Unclaimed | **CRM/Admin/Stage-1-Breach** | No agent claimed the lead within 5 min | 🔴 CRITICAL |
| 2 | T+5 Not Called | **CRM/Admin/Stage-2-Breach** | Lead claimed but agent didn't call (SLA breach) | 🔴 CRITICAL |
| 3 | Form Submissions | **CRM/Admin/Form-Submissions** | Website contact form entries | 🟢 INFO |

---

## FILTER 1: T+5 Unclaimed (CRM/Admin/Stage-1-Breach)

**What it catches:** No agent claimed the lead within the 5-minute SLA window.

**Gmail search query:**
```
from:crm@notifications.delsolprimehomes.com subject:(CRM_ADMIN_NO_CLAIM_EN | CRM_ADMIN_NO_CLAIM_NL | CRM_ADMIN_NO_CLAIM_FR | CRM_ADMIN_NO_CLAIM_FI | CRM_ADMIN_NO_CLAIM_PL | CRM_ADMIN_NO_CLAIM_DE | CRM_ADMIN_NO_CLAIM_ES | CRM_ADMIN_NO_CLAIM_SV | CRM_ADMIN_NO_CLAIM_DA | CRM_ADMIN_NO_CLAIM_HU | CRM_ADMIN_NO_CLAIM_NO)
```

**Filter actions:**
- ☑️ Apply label: **CRM/Admin/Stage-1-Breach**
- ☑️ Mark as important
- ☑️ Star the message
- ☑️ Never send to spam

**📱 Mobile notification:** Emergency ringtone

**Example subjects:**
- `CRM_ADMIN_NO_CLAIM_FI | No agent claimed lead within 5 minutes`
- `CRM_ADMIN_NO_CLAIM_EN | No agent claimed lead within 5 minutes`

**Action required:** Manually reassign the lead to an available agent via CRM admin panel.

---

## FILTER 2: T+5 Not Called (CRM/Admin/Stage-2-Breach)

**What it catches:** An agent claimed the lead but did not make the call within the SLA window.

**Gmail search query:**
```
from:crm@notifications.delsolprimehomes.com subject:(CRM_ADMIN_CLAIMED_NOT_CALLED_EN | CRM_ADMIN_CLAIMED_NOT_CALLED_NL | CRM_ADMIN_CLAIMED_NOT_CALLED_FR | CRM_ADMIN_CLAIMED_NOT_CALLED_FI | CRM_ADMIN_CLAIMED_NOT_CALLED_PL | CRM_ADMIN_CLAIMED_NOT_CALLED_DE | CRM_ADMIN_CLAIMED_NOT_CALLED_ES | CRM_ADMIN_CLAIMED_NOT_CALLED_SV | CRM_ADMIN_CLAIMED_NOT_CALLED_DA | CRM_ADMIN_CLAIMED_NOT_CALLED_HU | CRM_ADMIN_CLAIMED_NOT_CALLED_NO)
```

**Filter actions:**
- ☑️ Apply label: **CRM/Admin/Stage-2-Breach**
- ☑️ Mark as important
- ☑️ Star the message
- ☑️ Never send to spam

**📱 Mobile notification:** Emergency ringtone

**Example subjects:**
- `CRM_ADMIN_CLAIMED_NOT_CALLED_FI | Lead claimed but not called (SLA breach)`
- `CRM_ADMIN_CLAIMED_NOT_CALLED_EN | Lead claimed but not called (SLA breach)`

**Action required:** Contact the claiming agent and/or reassign the lead.

---

## FILTER 3: Form Submissions (CRM/Admin/Form-Submissions)

**What it catches:** Direct form submissions from the website.

**Gmail search query:**
```
subject:"Form Submission" from:crm@notifications.delsolprimehomes.com
```

**Filter actions:**
- ☑️ Apply label: **CRM/Admin/Form-Submissions**
- ☑️ Never send to spam

**📱 Mobile notification:** Optional — moderate notification

**Example subjects:**
- `📬 Form Submission: John Doe (Website) - 🇬🇧 EN`
- `📬 Form Submission: Jane Smith (Landing page fi) - 🇫🇮 FI`

---

## 🔧 How to Create Each Filter

### Step 1: Open Gmail Filter Creator
1. Click the **search box** at the top of Gmail
2. Click the **filter icon** (sliders) on the right side

### Step 2: Enter Search Query
1. In the **"Has the words"** field, paste the search query from the filter section above
2. Click **"Create filter"** at the bottom

### Step 3: Configure Actions
1. Check the boxes listed in the filter's actions
2. For **"Apply label"**, select the matching label from the dropdown
3. Click **"Create filter"**

### Step 4: Verify
1. Find a matching email in your inbox
2. Confirm the label was applied correctly
3. If not, edit the filter and adjust the query

Repeat for all 3 filters.

---

## 📱 Mobile Notification Setup

### Android (Gmail App)
1. Gmail app → **Settings** → Select account
2. Tap **Manage labels**
3. Find each CRM/Admin label → Tap it
4. Enable **Label notifications**
5. Tap **Sound** → Choose ringtone per label

| Label | Ringtone |
|-------|----------|
| CRM/Admin/Stage-1-Breach | 🔊 Emergency |
| CRM/Admin/Stage-2-Breach | 🔊 Emergency |
| CRM/Admin/Form-Submissions | 🔔 Moderate (optional) |

### iOS (Gmail App)
1. Gmail app → **Settings** → Select account
2. Tap **Label settings**
3. Find each CRM/Admin label → Enable notifications
4. Note: iOS does not support per-label ringtones

---

## ✅ Verification Checklist

After setting up all 3 filters:

- [ ] Filter 1: CRM/Admin/Stage-1-Breach catches `CRM_ADMIN_NO_CLAIM_XX` emails
- [ ] Filter 2: CRM/Admin/Stage-2-Breach catches `CRM_ADMIN_CLAIMED_NOT_CALLED_XX` emails
- [ ] Filter 3: CRM/Admin/Form-Submissions catches website form submission emails
- [ ] Mobile notifications enabled for Stage-1-Breach and Stage-2-Breach
- [ ] End-to-end test confirms correct label assignment

---

## 🎯 Quick Reference: Subject → Label Mapping

| Email Subject Pattern | Gmail Label | Priority |
|----------------------|-------------|----------|
| `CRM_ADMIN_NO_CLAIM_XX \|...` | CRM/Admin/Stage-1-Breach | 🔴 CRITICAL |
| `CRM_ADMIN_CLAIMED_NOT_CALLED_XX \|...` | CRM/Admin/Stage-2-Breach | 🔴 CRITICAL |
| `📬 Form Submission...` | CRM/Admin/Form-Submissions | 🟢 INFO |

*Where XX = EN, NL, FR, FI, PL, DE, ES, SV, DA, HU, NO*
