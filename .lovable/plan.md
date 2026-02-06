

# Update register-crm-lead to Save Country Data

## Overview

Update the `register-crm-lead` edge function to save the country data (country_name, country_code, country_flag) that Emma now extracts from phone number prefixes.

---

## Changes Required

### 1. Update LeadPayload Interface (lines 15-56)

Add the three new country fields to the interface:

```typescript
interface LeadPayload {
  // Contact info
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  countryPrefix?: string;
  countryName?: string;      // NEW: "Belgium", "France", etc.
  countryCode?: string;      // NEW: "BE", "FR", etc.
  countryFlag?: string;      // NEW: "🇧🇪", "🇫🇷", etc.
  
  // ... rest of existing fields
}
```

### 2. Update INSERT Statement (around line 460-510)

Add the three new columns to the crm_leads INSERT:

```typescript
.insert({
  // ... existing fields ...
  country_prefix: payload.countryPrefix || "",
  country_name: payload.countryName || "Unknown",    // NEW
  country_code: payload.countryCode || "XX",          // NEW  
  country_flag: payload.countryFlag || "🌍",          // NEW
  // ... rest of existing fields ...
})
```

---

## Data Flow

```text
User provides phone    Emma extracts        send-emma-lead       register-crm-lead
+32 471 234 567   -->  country info    -->  passes to CRM   -->  saves to DB
                       - prefix: +32
                       - name: Belgium
                       - code: BE
                       - flag: 🇧🇪
```

---

## Technical Details

| Field | Default Value | Source |
|-------|--------------|--------|
| `country_name` | "Unknown" | Extracted from phone prefix in emma-chat |
| `country_code` | "XX" | ISO 2-letter code from prefix lookup |
| `country_flag` | "🌍" | Flag emoji from prefix lookup |

---

## Downstream Dependency

After this change, the `send-emma-lead` function should also be updated to pass the country data in its `crmPayload` object. Currently it only passes `countryPrefix` but not the other three fields. This can be done as a follow-up task.

