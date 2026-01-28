
# Fix Lead Capture Integration with CRM Round-Robin System

## Problem Summary

Currently, the retargeting pages have **inconsistent lead routing**:

| Lead Source | Current Behavior | Goes to CRM? | Round Robin? |
|-------------|------------------|--------------|--------------|
| Property Inquiry Modal | Calls `registerCrmLead()` | Yes | Yes - but hardcoded to "en" |
| Emma Chatbot | Calls `send-emma-lead` → `register-crm-lead` | Yes | Yes - correct language |
| Retargeting Form | Saves to `retargeting_leads` table only | **NO** | **NO** |

**The main form on the retargeting page does NOT send leads to the CRM system at all!**

---

## Solution

### 1. Update `useRetargetingForm.ts` - Add CRM Integration

Add the `registerCrmLead()` call after saving to `retargeting_leads`:

```typescript
import { registerCrmLead } from '@/utils/crm/registerCrmLead';

const submitForm = async (data: FormData) => {
  // ... existing retargeting_leads insert ...
  
  // Parse full name into first/last
  const nameParts = data.firstName.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  // Register in CRM for round-robin routing
  await registerCrmLead({
    firstName,
    lastName,
    phone: data.phone || '',
    leadSource: 'Landing Form',
    leadSourceDetail: `retargeting_welcome_back_${language}`,
    pageType: 'retargeting',
    pageUrl: window.location.href,
    pageTitle: document.title,
    language: language, // Uses page language for routing
    interest: data.question || 'Not specified',
    message: data.question,
    referrer: document.referrer,
  });
};
```

### 2. Update `RetargetingPropertyModal.tsx` - Fix Language Hardcoding

Change the hardcoded `language: "en"` to use the dynamic page language:

**Before (line 117):**
```tsx
language: "en",
```

**After:**
```tsx
language: language, // From component props
```

Also update `leadSourceDetail` to use dynamic language:

**Before (line 113):**
```tsx
leadSourceDetail: "retargeting_property_card_en",
```

**After:**
```tsx
leadSourceDetail: `retargeting_property_card_${language}`,
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useRetargetingForm.ts` | Add `registerCrmLead()` import and call with proper language routing |
| `src/components/retargeting/RetargetingPropertyModal.tsx` | Fix hardcoded `language: "en"` to use dynamic `language` prop |

---

## Expected Result After Fix

| Lead Source | Behavior | CRM? | Round Robin by Language? |
|-------------|----------|------|--------------------------|
| Property Inquiry Modal | `registerCrmLead()` | Yes | Yes (dynamic) |
| Emma Chatbot | `send-emma-lead` | Yes | Yes (dynamic) |
| Retargeting Form | `registerCrmLead()` | Yes | Yes (dynamic) |

All leads will:
1. Enter the CRM system (`crm_leads` table)
2. Be routed to agents based on the **page's language** (e.g., `/nl/welcome-back` → Dutch agents)
3. Follow round-robin claim windows and escalation rules
4. Appear in agent dashboards with proper notifications

---

## Technical Notes

- The `registerCrmLead()` function is non-blocking - errors don't fail the main form submission
- Leads arriving outside business hours (21:00-09:00 Madrid) will be "night held" and released the next morning
- Language determines which agent pool receives the lead notification
- Incomplete leads (no phone/email) are saved but flagged for admin review
