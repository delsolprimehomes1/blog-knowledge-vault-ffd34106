
# Country-Aware Lead Capture: Eliminating Personality Confusion in Emma Chatbot

## Problem Summary

Current Emma leads have inconsistent `country_prefix` data:
- `+1` (13 leads) - Valid
- `XX` (4 leads) - Junk
- `+32` (2 leads) - Valid  
- `belgium` (2 leads) - Country name instead of prefix
- `750000` (1 lead) - User typed phone as prefix
- `Prefix is already there` (1 lead) - Free-text junk

Agents cannot distinguish between French leads from France vs Belgium, or English leads from UK vs USA.

## Solution Overview

Combine the country and prefix questions into a single, smarter question where Emma asks for the user's **country** first, then uses the LLM to extract both the `country_name` and `country_prefix` from the response.

---

## Technical Changes

### 1. Update `supabase/functions/emma-chat/index.ts`

**Modify Step 6 (Reachability) in the system prompt:**

Current flow (two questions):
```
Emma: "To which number may I send it?"
User: "5551234567"
Emma: "And which country prefix should I note?"
User: "Belgium" or "750000" or whatever
```

New flow (single smart question):
```
Emma: "To which number may I send additional information? 
Please also include which country you're calling from (e.g., Belgium, UK, France) 
so I can ensure the right regional expert contacts you."

User: "My number is 0471234567, I'm from Belgium"
```

**Add new extraction logic** to parse both values:

```typescript
// New extraction function
function extractCountryInfo(text: string): { 
  country_name?: string; 
  country_prefix?: string; 
} | null {
  const match = text.match(/COUNTRY_INFO:\s*({[\s\S]*?})/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error('Error parsing country info:', e);
    }
  }
  return null;
}
```

**Update system prompt instructions** for Step 6:

```text
## STEP 6: REACHABILITY (SINGLE QUESTION - COUNTRY + PHONE)

Emma's exact message:
"In case additional clarification or a correction needs to be sent, to which number may I send it?

Please also tell me which country you're calling from (e.g., Belgium, UK, Netherlands, France) so I can ensure the right regional expert contacts you."

EXTRACTION RULES:
When the user responds, you MUST extract THREE pieces of data:
1. phone_number - The actual phone digits (e.g., "0471234567")
2. country_name - The full country name (e.g., "Belgium", "France", "United Kingdom")
3. country_prefix - The ISO dial code (e.g., "+32" for Belgium, "+33" for France)

COUNTRY CODE MAPPING (use this to derive country_prefix from country_name):
- Belgium → +32
- France → +33
- Netherlands → +31
- Germany → +49
- United Kingdom / UK → +44
- USA / United States → +1
- Spain → +34
- Sweden → +46
- Denmark → +45
- Finland → +358
- Hungary → +36
- Norway → +47
- Poland → +48

OUTPUT FORMAT:
After extracting, output:
COLLECTED_INFO: {"phone": "[phone number]", "country_name": "[country]", "country_prefix": "[+XX]"}

VALIDATION:
- If user provides a number but NO country, ask: "Thank you. And which country are you calling from?"
- If user says something like "Belgium" without a number, ask: "Thank you for sharing that. And your phone number?"
- Do NOT proceed until you have BOTH a valid phone number AND country/prefix
```

**Update CustomFields interface:**

```typescript
interface CustomFields {
  // ... existing fields
  country_name?: string;     // NEW: "Belgium", "France", etc.
  country_prefix?: string;   // EXISTING: "+32", "+33", etc.
}
```

**Update extractCollectedInfo function:**

```typescript
function extractCollectedInfo(text: string): { 
  name?: string; 
  family_name?: string; 
  phone?: string; 
  country_name?: string;    // NEW
  country_prefix?: string; 
  whatsapp?: string;
} | null {
  const match = text.match(/COLLECTED_INFO:\s*({[\s\S]*?})/);
  if (match) {
    try {
      const info = JSON.parse(match[1]);
      // Build full_phone from country_prefix + phone
      if (info.phone && info.country_prefix) {
        info.whatsapp = `${info.country_prefix}${info.phone.replace(/^0+/, '')}`;
      } else if (info.phone) {
        info.whatsapp = info.phone;
      }
      return info;
    } catch (e) {
      console.error('Error parsing collected info:', e);
    }
  }
  return null;
}
```

---

### 2. Update `supabase/functions/send-emma-lead/index.ts`

**Extend payload interface:**

```typescript
interface LeadPayload {
  contact_info: {
    first_name: string;
    last_name: string;
    phone_number: string;
    country_prefix: string;
    country_name?: string;  // NEW
  };
  // ... rest unchanged
}
```

**Update updateLeadRecord function:**

```typescript
const updateData: Record<string, any> = {
  // ... existing fields
  country_prefix: payload.contact_info.country_prefix,
  country_name: payload.contact_info.country_name || null,  // NEW
  // ...
};
```

**Update registerInCRM call:**

```typescript
const crmPayload = {
  // ... existing
  countryPrefix: payload.contact_info.country_prefix,
  countryName: payload.contact_info.country_name || null,  // NEW
  // ...
};
```

---

### 3. Update `supabase/functions/register-crm-lead/index.ts`

**Extend LeadPayload interface:**

```typescript
interface LeadPayload {
  // ... existing
  countryPrefix?: string;
  countryName?: string;  // NEW
}
```

**Add country_name to lead insert:**

```typescript
const { data: lead, error: leadError } = await supabase
  .from("crm_leads")
  .insert({
    // ... existing fields
    country_prefix: payload.countryPrefix || "",
    country_name: payload.countryName || null,  // NEW
    // ...
  });
```

---

### 4. Update `supabase/functions/send-lead-notification/index.ts`

**Add country_name to Lead interface:**

```typescript
interface Lead {
  // ... existing
  country_prefix?: string;
  country_name?: string;  // NEW
}
```

**Update email templates to display country/origin:**

In `generateEmailHtml`, `generateUrgentEmailHtml`, and other templates, add a new row after PHONE:

```html
<tr>
  <td width="50%" style="padding: 8px 0;">
    <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Phone</p>
    <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.phone_number}</p>
  </td>
  <td width="50%" style="padding: 8px 0;">
    <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Country / Origin</p>
    <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">
      ${getCountryDisplay(lead.country_name, lead.country_prefix)}
    </p>
  </td>
</tr>
```

**Add helper function for country display:**

```typescript
function getCountryDisplay(countryName?: string, countryPrefix?: string): string {
  if (!countryName && !countryPrefix) return "Not specified";
  
  // Map country names to flag emojis
  const countryFlags: Record<string, string> = {
    "Belgium": "🇧🇪",
    "France": "🇫🇷",
    "Netherlands": "🇳🇱",
    "Germany": "🇩🇪",
    "United Kingdom": "🇬🇧",
    "UK": "🇬🇧",
    "USA": "🇺🇸",
    "United States": "🇺🇸",
    "Spain": "🇪🇸",
    "Sweden": "🇸🇪",
    "Denmark": "🇩🇰",
    "Finland": "🇫🇮",
    "Hungary": "🇭🇺",
    "Norway": "🇳🇴",
    "Poland": "🇵🇱",
  };
  
  const flag = countryFlags[countryName || ""] || "🌍";
  const prefix = countryPrefix ? ` (${countryPrefix})` : "";
  const name = countryName || "Unknown";
  
  return `${flag} ${name}${prefix}`;
}
```

---

### 5. Database Migration

Add `country_name` column to both tables:

```sql
-- Add country_name to crm_leads
ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS country_name TEXT;

-- Add country_name to emma_leads
ALTER TABLE emma_leads 
ADD COLUMN IF NOT EXISTS country_name TEXT;

-- Add index for country-based filtering
CREATE INDEX IF NOT EXISTS idx_crm_leads_country_name 
ON crm_leads(country_name) 
WHERE country_name IS NOT NULL;
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/emma-chat/index.ts` | Update Step 6 prompt, add country extraction logic |
| `supabase/functions/send-emma-lead/index.ts` | Add `country_name` to payload and CRM registration |
| `supabase/functions/register-crm-lead/index.ts` | Add `country_name` to lead insert |
| `supabase/functions/send-lead-notification/index.ts` | Add COUNTRY/ORIGIN row to all email templates |
| Database migration | Add `country_name` column to `crm_leads` and `emma_leads` |

---

## Expected Results

**Before:**
- Agent receives email showing: `🇫🇷 FR` (language only)
- Phone: `0471234567`
- No idea if lead is from France, Belgium, or French-speaking Switzerland

**After:**
- Agent receives email showing: `🇧🇪 Belgium (+32)` (country + prefix)
- Phone: `0471234567`
- Full context: French-speaking lead from Belgium

**Data quality improvement:**
- No more "750000" or "Prefix is already there" junk
- LLM validates and maps country names to ISO prefixes
- Agents can immediately identify lead origin for regional expertise
