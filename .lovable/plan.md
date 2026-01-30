
# Fix: Connect "Chat with Emma" Header Button to Emma Chatbot

## Problem Identified
The **"Chat with Emma"** button in the top-right corner of the navigation header dispatches a custom `openEmmaChat` event, but several pages are missing the `BlogEmmaChat` component that listens for this event and opens the Emma chatbot.

### Current State
The button works correctly on these pages (they have `BlogEmmaChat` mounted):
- Home, Blog Articles, Q&A pages, Comparison pages, Location pages, City Brochures

The button **does nothing** on these pages (missing `BlogEmmaChat`):
- **Buyers Guide** (your current page)
- Contact
- About
- Team
- Glossary
- Property Finder
- Property Detail
- Comparison Index

---

## Solution
Add the `BlogEmmaChat` component to all pages that are missing it. This ensures:
1. The header "Chat with Emma" button opens the Emma chatbot
2. All data is saved to `emma_leads` and `crm_leads` tables
3. Leads are routed through language-specific round-robin pools
4. The chatbot uses the correct language based on the page

---

## Files to Update

| Page | File | Change |
|------|------|--------|
| Buyers Guide | `src/pages/BuyersGuide.tsx` | Import and add `BlogEmmaChat` |
| Contact | `src/pages/Contact.tsx` | Import and add `BlogEmmaChat` |
| About | `src/pages/About.tsx` | Import and add `BlogEmmaChat` |
| Team | `src/pages/Team.tsx` | Import and add `BlogEmmaChat` |
| Glossary | `src/pages/Glossary.tsx` | Import and add `BlogEmmaChat` |
| Property Finder | `src/pages/PropertyFinder.tsx` | Import and add `BlogEmmaChat` |
| Property Detail | `src/pages/PropertyDetail.tsx` | Import and add `BlogEmmaChat` |
| Comparison Index | `src/pages/ComparisonIndex.tsx` | Import and add `BlogEmmaChat` |

---

## Example Change (BuyersGuide.tsx)

**Before:**
```tsx
import { BuyersGuideCTA } from '@/components/buyers-guide/BuyersGuideCTA';
// ... other imports

const BuyersGuide: React.FC = () => {
  // ...
  return (
    <>
      <Helmet>...</Helmet>
      <Header />
      <main>...</main>
      <Footer />
    </>
  );
};
```

**After:**
```tsx
import { BuyersGuideCTA } from '@/components/buyers-guide/BuyersGuideCTA';
import BlogEmmaChat from '@/components/blog-article/BlogEmmaChat';
// ... other imports

const BuyersGuide: React.FC = () => {
  const { lang = 'en' } = useParams<{ lang: string }>();
  // ...
  return (
    <>
      <Helmet>...</Helmet>
      <Header />
      <main>...</main>
      <Footer />
      <BlogEmmaChat language={lang} />
    </>
  );
};
```

---

## Data Flow (Already Implemented in BlogEmmaChat)

Once `BlogEmmaChat` is mounted, clicking "Chat with Emma" will:

1. **Open Emma Chat** → Listens to `openEmmaChat` event
2. **Capture Page Context** → Stores page URL, type, language, referrer
3. **Save to Database** → `emma_leads` and `crm_leads` tables
4. **CRM Routing** → `register-crm-lead` edge function triggers round-robin
5. **Agent Notification** → Language-matched agents receive email alerts

---

## Technical Details

The `BlogEmmaChat` component:
- Uses the same `EmmaChat` component as landing pages
- Accepts a `language` prop for localized greetings
- Listens for both `openChatbot` and `openEmmaChat` events
- Shows floating Emma avatar button when chat is closed

---

## Verification Steps

After implementation:
1. Navigate to `/en/buyers-guide`
2. Click "Chat with Emma" in the header
3. Confirm Emma chatbot opens with English greeting
4. Test the conversation flow
5. Verify lead appears in CRM dashboard
