

## Fix: Remove "XX" Prefix from Phone Numbers Everywhere

### Problem
Some legacy phone numbers are stored with an "XX" prefix (e.g., `XX+34613578413`). While two table views already strip this, the lead detail page, mobile cards, and call history still show the raw "XX" prefix.

### Solution
Create a small shared phone sanitization helper and apply it consistently across all components that display phone numbers.

### Changes

**1. Create a phone sanitization utility**
- Add a `sanitizePhone` function in `src/lib/phone-utils.ts`
- It strips any leading "XX" prefix, ensuring the number starts with "+" (e.g., `XX+34...` becomes `+34...`)

**2. Update `ContactInfoCard.tsx`** (lead detail page -- the screenshot)
- Apply `sanitizePhone()` to all three places `lead.phone_number` is displayed or used: the tel link href, the display text, and the copy-to-clipboard call

**3. Update `MobileLeadCard.tsx`**
- Apply sanitization in `handleCall` and `handleWhatsApp` callbacks

**4. Update `SalestrailCallsCard.tsx`**
- Sanitize the "Tracking: ..." phone display

**5. Refactor existing inline replacements**
- Replace the inline `.replace(/^XX\+?/, '+')` calls in `LeadsTable.tsx` and `LeadsOverview.tsx` with the shared `sanitizePhone()` for consistency

### Technical Detail
```typescript
// src/lib/phone-utils.ts
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/^XX\+?/, '+');
}
```

This is a display-only fix -- no database changes needed. The underlying data remains unchanged, but all UI surfaces will render clean phone numbers.
