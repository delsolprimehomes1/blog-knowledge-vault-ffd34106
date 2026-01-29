
# Create Comprehensive Contact Page

## Overview

This plan creates a fully-featured Contact page with WhatsApp as the primary contact method, full translations for all 10 languages, lead capture integration, and complete SEO optimization.

---

## Current State

| Item | Status |
|------|--------|
| Contact page exists | No - needs to be created |
| Route defined | No - needs to be added to App.tsx |
| Translations | No - need to add contact section to all 10 language files |
| Leads table | Exists and supports full contact submissions |
| Webhook integration | Exists in webhookHandler.ts |
| CRM integration | Exists via registerCrmLead utility |

---

## Implementation Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Contact.tsx` | Main Contact page |
| `src/components/contact/ContactHero.tsx` | Hero section with headline |
| `src/components/contact/ContactOptions.tsx` | 3-column contact options grid |
| `src/components/contact/ContactForm.tsx` | Full contact form with validation |
| `src/components/contact/OfficeInfo.tsx` | Office hours, map, and address |
| `src/components/contact/ContactFAQ.tsx` | FAQ accordion section |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add route `/:lang/contact` and legacy redirect |
| `src/i18n/translations/*.ts` | Add `contact` section to all 10 languages |
| `src/components/home/Footer.tsx` | Add Contact link to navigation |
| `src/constants/company.ts` | Add office hours and address constant |

---

## Phase 1: Add Company Constants

**File: `src/constants/company.ts`**

Add office hours and address to centralized constants:

```typescript
export const COMPANY_ADDRESS = {
  street: 'C. Alfonso XIII, 6',
  building: 'ED SAN FERNAN',
  floor: '1 OFICINA',
  postalCode: '29640',
  city: 'Fuengirola',
  province: 'Málaga',
  country: 'Spain',
  full: 'ED SAN FERNAN, C. Alfonso XIII, 6, 1 OFICINA, 29640 Fuengirola, Málaga, Spain',
  googleMapsUrl: 'https://goo.gl/maps/YOUR_MAP_ID',
  googleMapsEmbed: 'https://www.google.com/maps/embed?pb=!1m18!...'
} as const;

export const COMPANY_HOURS = {
  weekdays: { open: '09:00', close: '18:00' },
  saturday: { open: '10:00', close: '14:00' },
  sunday: null, // Closed
  timezone: 'CET (Central European Time)'
} as const;
```

---

## Phase 2: Add Contact Translations to All 10 Languages

Add new `contact` section to each translation file:

### English (`en.ts`):

```typescript
contact: {
  meta: {
    title: "Contact Del Sol Prime Homes | Costa del Sol Real Estate",
    description: "Get in touch with our expert real estate team. WhatsApp, email, or call us for personalized property guidance on the Costa del Sol."
  },
  hero: {
    headline: "Get in Touch",
    subheadline: "We're here to help you find your perfect Costa del Sol property"
  },
  options: {
    whatsapp: {
      title: "Chat on WhatsApp",
      description: "Get instant responses from our team",
      cta: "Open WhatsApp",
      prefill: "Hi, I'm interested in Costa del Sol properties. Can you help me?"
    },
    email: {
      title: "Send Us an Email",
      description: "We'll respond within 24 hours",
      cta: "Send Email"
    },
    phone: {
      title: "Call Our Office",
      description: "Speak directly with an advisor",
      cta: "Call Now"
    }
  },
  form: {
    headline: "Send Us a Message",
    subheadline: "Fill out the form and we'll get back to you shortly",
    fields: {
      fullName: "Full Name",
      email: "Email Address",
      phone: "Phone Number (Optional)",
      language: "Preferred Language",
      subject: "Subject",
      message: "Your Message",
      referral: "How did you hear about us? (Optional)",
      privacy: "I agree to the Privacy Policy and consent to processing of my data."
    },
    subjects: {
      general: "General Inquiry",
      property: "Property Inquiry",
      selling: "Selling My Property",
      viewing: "Schedule a Viewing",
      other: "Other"
    },
    referrals: {
      google: "Google Search",
      socialMedia: "Social Media",
      referral: "Friend/Family Referral",
      advertisement: "Online Advertisement",
      other: "Other"
    },
    submit: "Send Message",
    submitting: "Sending...",
    success: {
      title: "Message Sent!",
      description: "Thank you for contacting us. We'll respond within 24 hours."
    }
  },
  office: {
    headline: "Visit Our Office",
    hours: {
      title: "Office Hours",
      weekdays: "Monday - Friday",
      saturday: "Saturday",
      sunday: "Sunday",
      closed: "Closed",
      timezone: "Central European Time (CET)"
    },
    directions: "Get Directions"
  },
  faq: {
    headline: "Frequently Asked Questions",
    items: [
      {
        question: "How quickly will you respond?",
        answer: "We aim to respond to all inquiries within 24 hours during business days. WhatsApp messages typically receive faster responses."
      },
      {
        question: "Do you speak my language?",
        answer: "Yes! Our team speaks 10+ languages including English, Dutch, German, French, Swedish, Norwegian, Danish, Finnish, Polish, and Hungarian."
      },
      {
        question: "Can I schedule a video call?",
        answer: "Absolutely! Contact us via WhatsApp or email to arrange a convenient time for a video consultation with one of our property experts."
      },
      {
        question: "What areas do you cover?",
        answer: "We specialize in the entire Costa del Sol region, from Málaga to Sotogrande, including Marbella, Estepona, Fuengirola, Benalmádena, and Mijas."
      }
    ]
  },
  emma: {
    callout: "Prefer instant answers?",
    cta: "Chat with Emma, our AI assistant"
  }
}
```

### Translations for other languages

Similar structure with translated content for:
- Dutch (`nl.ts`)
- German (`de.ts`) 
- French (`fr.ts`)
- Swedish (`sv.ts`)
- Norwegian (`no.ts`)
- Danish (`da.ts`)
- Finnish (`fi.ts`)
- Polish (`pl.ts`)
- Hungarian (`hu.ts`)

---

## Phase 3: Create Contact Page Components

### Component 1: ContactHero.tsx

Simple hero with headline, subheadline, and gradient background.

### Component 2: ContactOptions.tsx

3-column grid with:
- **WhatsApp** (PRIMARY - most prominent, green accent)
- **Email** (Secondary)
- **Phone** (Tertiary)

Each with icon, description, and CTA button.

**WhatsApp link:**
```typescript
const whatsappUrl = COMPANY_CONTACT.whatsappWithMessage(t.contact.options.whatsapp.prefill);
```

**Analytics tracking:**
```typescript
onClick={() => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'whatsapp_click', {
      category: 'Contact',
      location: 'contact_page_options'
    });
  }
}}
```

### Component 3: ContactForm.tsx

Full form with:
- Full Name (required)
- Email (required, validated)
- Phone (optional)
- Preferred Language (dropdown, 10 options)
- Subject (dropdown, 5 options)
- Message (textarea, required)
- How did you hear about us? (dropdown, optional)
- Privacy checkbox (required)

**Form submission flow:**
1. Validate all fields with Zod schema
2. Save to leads table via Supabase
3. Send to GHL webhook via `sendFormToGHL()`
4. Register in CRM via `registerCrmLead()`
5. Track `generate_lead` event in GA4
6. Show success message
7. Trigger Emma chat after 2 seconds

### Component 4: OfficeInfo.tsx

- Google Maps embed iframe
- Office address display
- "Get Directions" button (opens Google Maps)
- Office hours table
- Timezone note

### Component 5: ContactFAQ.tsx

Accordion component using existing `Accordion` UI component with FAQ items from translations.

---

## Phase 4: Create Main Contact Page

**File: `src/pages/Contact.tsx`**

Structure:
```
<Header />
<main>
  <ContactHero />
  <ContactOptions />
  <ContactForm />
  <OfficeInfo />
  <ContactFAQ />
  <EmmaCallout />
</main>
<Footer />
```

SEO elements:
- LocalBusiness JSON-LD schema
- Consistent NAP (Name, Address, Phone)
- Language-specific meta tags

---

## Phase 5: Add Routes

**File: `src/App.tsx`**

Add lazy import:
```typescript
const Contact = lazy(() => import("./pages/Contact"));
```

Add routes (before the `/:lang` catch-all):
```typescript
{/* Contact page with language prefix */}
<Route path="/:lang/contact" element={<Contact />} />

{/* Legacy redirect */}
<Route path="/contact" element={<Navigate to="/en/contact" replace />} />
```

---

## Phase 6: Update Footer Navigation

**File: `src/components/home/Footer.tsx`**

Add Contact link to Quick Links section:
```typescript
<li>
  <Link to={`/${currentLanguage}/contact`} className="hover:text-prime-gold transition-colors font-nav">
    {t.footer.links.contact || "Contact"}
  </Link>
</li>
```

Add translation key to all 10 language files:
```typescript
footer: {
  links: {
    contact: "Contact",
    // ... other links
  }
}
```

---

## Phase 7: Mobile-Specific Features

### Sticky WhatsApp Button

```typescript
<div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-luxury border-t border-border" 
     style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
  <div className="flex items-center gap-3 p-4">
    <a href={whatsappUrl} className="flex-1">
      <Button className="w-full h-14 bg-green-600 hover:bg-green-700">
        <MessageCircle className="w-5 h-5 mr-2" />
        Chat on WhatsApp
      </Button>
    </a>
    <a href={`tel:${COMPANY_CONTACT.phoneClean}`}>
      <Button variant="outline" className="h-14 w-14">
        <Phone className="w-5 h-5" />
      </Button>
    </a>
  </div>
</div>
```

### Touch-Friendly Form

- All inputs with `h-12` minimum height
- 44px minimum tap targets
- `touch-manipulation` class on buttons
- Simplified layout on mobile (single column)

---

## Phase 8: Analytics Tracking

Track all contact interactions:

| Event | Trigger |
|-------|---------|
| `whatsapp_click` | WhatsApp button clicked |
| `email_click` | Email link clicked |
| `phone_click` | Phone link clicked |
| `generate_lead` | Form submitted successfully |
| `map_directions_click` | Get Directions clicked |
| `emma_open` | Emma chat callout clicked |

---

## Database Integration

Uses existing `leads` table structure:
- `full_name` ← Form full name
- `email` ← Form email
- `phone` ← Form phone
- `comment` ← Form message
- `language` ← Selected language
- `source` ← 'contact_page'
- `page_url` ← Current URL
- `user_agent` ← Browser info
- UTM parameters ← From URL

---

## Files Summary

### New Files (6)

| File | Lines |
|------|-------|
| `src/pages/Contact.tsx` | ~200 |
| `src/components/contact/ContactHero.tsx` | ~50 |
| `src/components/contact/ContactOptions.tsx` | ~150 |
| `src/components/contact/ContactForm.tsx` | ~300 |
| `src/components/contact/OfficeInfo.tsx` | ~100 |
| `src/components/contact/ContactFAQ.tsx` | ~60 |

### Modified Files (12)

| File | Changes |
|------|---------|
| `src/App.tsx` | Add Contact route + redirect |
| `src/constants/company.ts` | Add address + hours constants |
| `src/components/home/Footer.tsx` | Add Contact link |
| `src/i18n/translations/en.ts` | Add contact section |
| `src/i18n/translations/nl.ts` | Add contact section |
| `src/i18n/translations/de.ts` | Add contact section |
| `src/i18n/translations/fr.ts` | Add contact section |
| `src/i18n/translations/sv.ts` | Add contact section |
| `src/i18n/translations/no.ts` | Add contact section |
| `src/i18n/translations/da.ts` | Add contact section |
| `src/i18n/translations/fi.ts` | Add contact section |
| `src/i18n/translations/pl.ts` | Add contact section |
| `src/i18n/translations/hu.ts` | Add contact section |

---

## Testing Checklist

After implementation:
- [ ] Visit `/en/contact` - verify all English text
- [ ] Visit `/nl/contact` - verify Dutch translations
- [ ] Visit `/de/contact` - verify German translations
- [ ] Test all 10 language versions
- [ ] WhatsApp button opens WhatsApp with pre-filled message
- [ ] Email link opens email client with subject
- [ ] Phone link initiates call on mobile
- [ ] Form submission saves to leads table
- [ ] Form submission triggers GHL webhook
- [ ] Form submission registers in CRM
- [ ] Success message displays after submission
- [ ] Emma chat opens after form submission
- [ ] Google Maps embed displays correctly
- [ ] "Get Directions" opens Google Maps
- [ ] FAQ accordion expands/collapses
- [ ] Mobile sticky WhatsApp bar appears on mobile
- [ ] All buttons have 44px minimum tap targets
- [ ] Analytics events fire correctly

---

## URL Structure

| Language | URL |
|----------|-----|
| English | `/en/contact` |
| Dutch | `/nl/contact` |
| German | `/de/contact` |
| French | `/fr/contact` |
| Swedish | `/sv/contact` |
| Norwegian | `/no/contact` |
| Danish | `/da/contact` |
| Finnish | `/fi/contact` |
| Polish | `/pl/contact` |
| Hungarian | `/hu/contact` |
| Legacy | `/contact` → redirects to `/en/contact` |
