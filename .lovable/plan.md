
# Property Inquiry Modal with CRM Integration

## Overview

Transform the "View details" links on property cards in the retargeting page to open a modern glassmorphism modal form instead of navigating away. The form collects Name, WhatsApp number, and Questions. All submissions are stored in the CRM dashboard and follow the round robin routing rules based on the page language (English), triggering email notifications to assigned agents.

---

## Current vs Target Behavior

| Element | Current | Target |
|---------|---------|--------|
| "View details" click | Navigates to `/en/property/{id}` | Opens inquiry modal with property context |
| Form fields | N/A | Full Name, WhatsApp Number, Questions |
| Data storage | N/A | `crm_leads` table via `register-crm-lead` edge function |
| Agent notification | N/A | Round robin broadcast to EN language agents |
| Design | N/A | Glassmorphism modal matching page aesthetic |

---

## Component Architecture

```text
RetargetingProjects.tsx
├── State: selectedProperty, isModalOpen
├── Property Cards (existing)
│   └── "View details" → onClick opens modal (not <a href>)
└── RetargetingPropertyModal (new component)
    ├── Glassmorphism Dialog styling
    ├── Property context display (name, location, price)
    └── Lead form (Name, WhatsApp, Questions)
        └── onSubmit → registerCrmLead() + submitLeadFunction()
```

---

## New Component: RetargetingPropertyModal.tsx

A modern glassmorphism modal that:
1. Displays selected property context (name, location, price badge)
2. Collects lead information via a form
3. Integrates with the existing CRM system

### Form Fields
- **Full Name** (required) - text input
- **WhatsApp Number** (required) - PhoneInput with international format
- **Your Questions** (optional) - textarea

### Visual Design
- Glassmorphism container: `bg-white/95 backdrop-blur-xl`
- Rounded inputs with gold focus rings
- Property info card at top with subtle styling
- Success animation with checkmark (matching RetargetingForm pattern)

---

## Changes to RetargetingProjects.tsx

### Add State Management
```typescript
const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
const [isModalOpen, setIsModalOpen] = useState(false);
```

### Replace Anchor with Button
Change from:
```tsx
<a href={`/en/property/${property.id}`} ...>View details</a>
```

To:
```tsx
<button onClick={() => { setSelectedProperty(property); setIsModalOpen(true); }}>
  View details
</button>
```

### Add Modal Component
```tsx
<RetargetingPropertyModal
  isOpen={isModalOpen}
  onClose={() => { setIsModalOpen(false); setSelectedProperty(null); }}
  property={selectedProperty}
/>
```

---

## CRM Integration Details

### Lead Source Tracking
The form submission will include:
- **leadSource**: `'Property Inquiry'`
- **leadSourceDetail**: `'retargeting_property_card_en'`
- **pageType**: `'retargeting'`
- **pageUrl**: Current page URL
- **language**: `'en'` (extracted from URL)
- **interest**: Formatted as `"{PropertyName} - {Location}"`
- **propertyRef**: Property ID
- **propertyPrice**: Property price (for lead scoring)

### Data Flow
```text
User clicks "View details"
    ↓
Modal opens with property context
    ↓
User fills form → Submit
    ↓
1. Save to legacy `leads` table (existing pattern)
2. Send to GHL webhook (existing pattern)
3. Call registerCrmLead() → register-crm-lead edge function
    ↓
Edge function:
- Creates lead in crm_leads table
- Applies lead scoring (budget, timeframe, etc.)
- Checks round robin config for 'en' language
- Broadcasts to all EN agents (John Melvin, Steven)
- Creates notifications
- Sends claim emails to eligible agents
    ↓
Agents receive email with claim link
First agent to click claims the lead
```

### Round Robin Flow (EN Language)
Based on existing `crm_round_robin_config`:
1. Lead arrives with `language: 'en'`
2. System looks up round 1 config for English
3. All agents in `agent_ids` array receive broadcast email
4. 5-minute claim window starts
5. First agent to claim wins the lead
6. If unclaimed, escalates to fallback admin

---

## Form Validation

Using Zod schema (matching LeadForm.tsx pattern):
```typescript
const formSchema = z.object({
  fullName: z.string().min(2, "Name is too short").max(100),
  whatsapp: z.string().min(6, "Phone number is required"),
  questions: z.string().max(1000).optional(),
});
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/retargeting/RetargetingPropertyModal.tsx` | Create | New glassmorphism modal with form |
| `src/components/retargeting/RetargetingProjects.tsx` | Modify | Add modal state and trigger |
| `src/components/retargeting/index.ts` | Modify | Export new modal component |

---

## RetargetingPropertyModal.tsx Structure

```typescript
interface RetargetingPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: {
    id: string;
    internal_name: string;
    location: string;
    price_eur: number | null;
  } | null;
}
```

### Key Features
1. **Property Context Card**: Shows property name, location, and price
2. **PhoneInput Integration**: Uses react-phone-number-input for WhatsApp
3. **Form Handling**: react-hook-form with zod validation
4. **Success State**: Animated checkmark with "Thank you" message
5. **Auto-close**: Closes after 3 seconds on success

### Styling
- Dialog: `sm:max-w-[500px] bg-white/95 backdrop-blur-xl border-0 shadow-2xl`
- Inputs: Rounded with gold focus rings (matching RetargetingForm)
- Button: Gradient gold with hover glow

---

## Implementation Notes

### Language Detection
Since the page is at `/en/welcome-back`, the language is hardcoded to `'en'` for now. Future enhancement can extract from URL path.

### Property Data Passed to CRM
```typescript
registerCrmLead({
  firstName,
  lastName,
  phone: whatsappNumber,
  leadSource: 'Property Inquiry',
  leadSourceDetail: 'retargeting_property_card_en',
  pageType: 'retargeting',
  pageUrl: window.location.href,
  pageTitle: document.title,
  language: 'en',
  propertyRef: property.id,
  propertyPrice: property.price_eur,
  propertyType: 'Property Card', // Generic since we don't have category
  interest: `${property.internal_name} - ${property.location}`,
  message: questions,
  referrer: document.referrer,
});
```

### Agent Notification Content
The `register-crm-lead` edge function already handles:
- Creating the lead in `crm_leads`
- Looking up round robin config for the language
- Broadcasting to all eligible agents
- Sending claim emails with property context

---

## Expected Result

After implementation:
1. User clicks "View details" on any property card
2. Modern glassmorphism modal slides in
3. Modal shows property name, location, price at top
4. User fills in Name, WhatsApp, and optional questions
5. On submit:
   - Lead saved to database
   - Agents receive email: "New Lead: [Name] interested in [Property]"
   - CRM dashboard shows new lead with property context
   - Round robin claim flow begins
6. Success animation plays
7. Modal auto-closes after 3 seconds
