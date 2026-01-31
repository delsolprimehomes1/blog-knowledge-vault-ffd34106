

# Property Lead Capture & Emma Integration Audit and Fix

## Current Status Assessment

### What Works Correctly ✅
1. **Send Inquiry Form** (`PropertyContact.tsx`):
   - Captures property reference, price, and type from props
   - Sends to `register-crm-lead` edge function
   - Triggers round-robin routing
   - Admin notifications sent
   - CRM receives complete property context

2. **CRM Lead Registration** (`register-crm-lead/index.ts`):
   - Properly stores `property_ref`, `interest`, and `property_type`
   - Calculates lead score and segment
   - Handles night hold logic
   - Triggers round-robin broadcast
   - Sends admin alerts

### Issues Found ❌

#### Issue 1: Wrong Page Type Detection
**File:** `src/lib/webhookHandler.ts` (line 93)
```typescript
// CURRENT (WRONG):
if (pathWithoutLang.startsWith('/properties/')) return 'property_detail';

// ACTUAL ROUTE:
/:lang/property/:reference  (e.g., /en/property/R5073766)
```
**Impact:** Emma reports `page_type: "other"` instead of `"property_detail"` when opened from property pages.

#### Issue 2: No Property Reference Extraction
**File:** `src/components/landing/EmmaChat.tsx`

When Emma opens on a property detail page, the URL contains the property reference (e.g., `/en/property/R5073766`), but this reference is NOT extracted and included in the CRM lead payload.

**Current behavior:**
- `page_url` is captured but not parsed
- `property_ref` field is always null/undefined for Emma leads from property pages

#### Issue 3: No Property Context in Emma Event
**File:** `src/components/property/PropertyContact.tsx` (line 230)
```typescript
// CURRENT: No context passed
onClick={() => window.dispatchEvent(new CustomEvent('openEmmaChat'))}

// NEEDED: Pass property context
onClick={() => window.dispatchEvent(new CustomEvent('openEmmaChat', {
  detail: { propertyRef: reference, propertyPrice: price, propertyType }
}))}
```

---

## Implementation Plan

### Step 1: Fix Page Type Detection
**File:** `src/lib/webhookHandler.ts`

Change line 93 from:
```typescript
if (pathWithoutLang.startsWith('/properties/')) return 'property_detail';
```
To:
```typescript
if (pathWithoutLang.startsWith('/property/')) return 'property_detail';
```

### Step 2: Pass Property Context to Emma
**File:** `src/components/property/PropertyContact.tsx`

Update the Schedule button and mobile Inquire button to pass property details:

```typescript
// Desktop Schedule button (line 230)
onClick={() => window.dispatchEvent(new CustomEvent('openEmmaChat', {
  detail: { propertyRef: reference, propertyPrice: price, propertyType }
}))}

// Mobile Inquire button (line 290)
onClick={() => window.dispatchEvent(new CustomEvent('openEmmaChat', {
  detail: { propertyRef: reference, propertyPrice: price }
}))}
```

### Step 3: Capture Property Context in Emma
**File:** `src/components/landing/EmmaChat.tsx`

**3a. Add property context state:**
```typescript
const [propertyContext, setPropertyContext] = useState<{
  propertyRef?: string;
  propertyPrice?: string;
  propertyType?: string;
} | null>(null);
```

**3b. Listen for property context in openEmmaChat event:**

Update the event listener in the component where `openEmmaChat` is handled (either in EmmaChat or BlogEmmaChat):

```typescript
useEffect(() => {
  const handleOpenEmma = (e: CustomEvent) => {
    if (e.detail) {
      setPropertyContext({
        propertyRef: e.detail.propertyRef,
        propertyPrice: e.detail.propertyPrice,
        propertyType: e.detail.propertyType
      });
    }
    setIsOpen(true);
  };
  
  window.addEventListener('openEmmaChat', handleOpenEmma as EventListener);
  return () => window.removeEventListener('openEmmaChat', handleOpenEmma as EventListener);
}, []);
```

**3c. Fallback: Extract property reference from URL if not passed:**
```typescript
// In initialization effect (when Emma opens)
const extractPropertyRefFromUrl = (): string | null => {
  const match = window.location.pathname.match(/\/property\/([A-Z0-9]+)/i);
  return match ? match[1] : null;
};

// When setting emmaOpenedContext, add:
const urlPropertyRef = extractPropertyRefFromUrl();
setEmmaOpenedContext({
  pageType: detectPageType(window.location.pathname),
  // ... existing fields ...
  propertyRef: urlPropertyRef || undefined
});
```

**3d. Include property context in lead payload:**

Update `sendToGHLWebhook` function to include property context:

```typescript
page_context: {
  page_type: pageContext.pageType,
  page_url: pageContext.pageUrl,
  // ... existing fields ...
  property_ref: propertyContext?.propertyRef || pageContext.propertyRef || null,
  property_type: propertyContext?.propertyType || null,
  property_price: propertyContext?.propertyPrice || null,
}
```

### Step 4: Update Edge Function to Handle Property Context
**File:** `supabase/functions/send-emma-lead/index.ts`

Add property fields to the CRM payload:

```typescript
const crmPayload = {
  // ... existing fields ...
  propertyRef: payload.page_context?.property_ref || null,
  propertyType: payload.page_context?.property_type || null,
  // Format interest for agent visibility
  interest: payload.page_context?.property_ref 
    ? `Property ${payload.page_context.property_ref}` 
    : undefined,
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/webhookHandler.ts` | Fix path pattern from `/properties/` to `/property/` |
| `src/components/property/PropertyContact.tsx` | Pass property context in openEmmaChat event |
| `src/components/blog-article/BlogEmmaChat.tsx` | Listen for property context from event |
| `src/components/landing/EmmaChat.tsx` | Extract property ref from URL, include in payload |
| `supabase/functions/send-emma-lead/index.ts` | Pass property context to CRM registration |

---

## Expected Result After Fix

When a user on `/en/property/R5073766` clicks "Schedule" or "Inquire":

1. Emma opens with property context (`propertyRef: "R5073766"`)
2. Emma correctly identifies `page_type: "property_detail"`
3. Lead sent to CRM includes:
   - `property_ref: "R5073766"`
   - `interest: "Property R5073766"`
   - `page_type: "property_detail"`
4. Admin and claiming agent see which specific property the user was viewing
5. Round-robin routing works as expected with complete context

---

## Technical Notes

- Property reference extraction uses regex: `/\/property\/([A-Z0-9]+)/i`
- Fallback extraction ensures leads are tracked even if event detail is missing
- Changes are backward compatible - existing Emma conversations continue working

