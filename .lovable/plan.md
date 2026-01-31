

# Full Localization of the Contact Page (10 Languages)

## Problem Analysis

The Contact page (`/:lang/contact`) displays **100% English content** on all language versions because:

1. **No `contact` translations exist** in any of the 10 translation files
2. The page uses `getDefaultContactTranslations()` as fallback, which returns hardcoded English
3. All components receive this English fallback via the `t` prop

### Current Code Flow

```text
Contact.tsx
    ↓
const contactT = (t as any).contact || getDefaultContactTranslations();  ← Always hits fallback!
    ↓
<ContactHero t={contactT} />        ← English
<ContactOptions t={contactT} />    ← English  
<ContactForm t={contactT} />       ← English
<OfficeInfo t={contactT} />        ← English
<ContactFAQ t={contactT} />        ← English
<EmmaCallout t={contactT} />       ← English
```

### Hardcoded English Strings Found

| Component | Hardcoded English |
|-----------|-------------------|
| `ContactOptions.tsx` | "Fastest Response" badge (line 60) |
| `OfficeInfo.tsx` | "Office Address" heading (line 84) |
| `ContactForm.tsx` | "Privacy Policy" link text (line 367), toast messages (lines 97-98, 171-172) |
| `EmmaCallout.tsx` | "AI-Powered" badge (line 40), "Chat with Emma" button (line 57) |

---

## Solution: Add Full `contact` Object to All 10 Languages

### Translation Structure to Add

Each translation file needs a complete `contact` object:

```text
contact: {
  meta: {
    title: "Contact Del Sol Prime Homes | Costa del Sol Real Estate",
    description: "Get in touch with our expert real estate team..."
  },
  hero: {
    headline: "Get in Touch",
    subheadline: "We're here to help you find your perfect Costa del Sol property"
  },
  options: {
    fastestResponse: "Fastest Response",  // NEW - badge text
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
      privacy: "I agree to the Privacy Policy and consent to processing of my data.",
      privacyLink: "Privacy Policy"  // NEW - for localized link text
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
    validation: {
      requiredFields: "Please fill in all required fields"  // NEW - toast message
    },
    error: {
      title: "Something went wrong",
      description: "Please try again or contact us via WhatsApp."
    },
    success: {
      title: "Message Sent!",
      description: "Thank you for contacting us. We'll respond within 24 hours."
    }
  },
  office: {
    headline: "Visit Our Office",
    addressTitle: "Office Address",  // NEW - was hardcoded
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
        answer: "We aim to respond to all inquiries within 24 hours..."
      },
      {
        question: "Do you speak my language?",
        answer: "Yes! Our team speaks 10+ languages..."
      },
      {
        question: "Can I schedule a video call?",
        answer: "Absolutely! Contact us via WhatsApp or email..."
      },
      {
        question: "What areas do you cover?",
        answer: "We specialize in the entire Costa del Sol region..."
      }
    ]
  },
  emma: {
    badge: "AI-Powered",  // NEW - was hardcoded
    callout: "Prefer instant answers?",
    cta: "Chat with Emma, our AI assistant",
    buttonText: "Chat with Emma"  // NEW - button text was hardcoded
  }
}
```

---

## Files to Modify

### Part 1: Translation Files (Add `contact` object)

| File | Language |
|------|----------|
| `src/i18n/translations/en.ts` | English |
| `src/i18n/translations/fi.ts` | Finnish |
| `src/i18n/translations/nl.ts` | Dutch |
| `src/i18n/translations/fr.ts` | French |
| `src/i18n/translations/de.ts` | German |
| `src/i18n/translations/pl.ts` | Polish |
| `src/i18n/translations/da.ts` | Danish |
| `src/i18n/translations/hu.ts` | Hungarian |
| `src/i18n/translations/sv.ts` | Swedish |
| `src/i18n/translations/no.ts` | Norwegian |

### Part 2: Component Updates (Use new i18n keys)

| File | Changes |
|------|---------|
| `src/components/contact/ContactOptions.tsx` | Replace hardcoded "Fastest Response" with `t.options.fastestResponse` |
| `src/components/contact/OfficeInfo.tsx` | Replace hardcoded "Office Address" with `t.office.addressTitle` |
| `src/components/contact/ContactForm.tsx` | Replace hardcoded "Privacy Policy" link and toast messages with i18n keys |
| `src/components/contact/EmmaCallout.tsx` | Replace hardcoded "AI-Powered" and "Chat with Emma" button with i18n keys |

### Part 3: Page Update

| File | Changes |
|------|---------|
| `src/pages/Contact.tsx` | Update type interface, remove fallback reliance for non-English |

---

## Sample Translations (Finnish)

```text
contact: {
  meta: {
    title: "Ota Yhteyttä Del Sol Prime Homes | Costa del Sol Kiinteistöt",
    description: "Ota yhteyttä asiantuntevaan kiinteistötiimimme..."
  },
  hero: {
    headline: "Ota Yhteyttä",
    subheadline: "Olemme täällä auttamassa sinua löytämään täydellisen Costa del Sol -kiinteistösi"
  },
  options: {
    fastestResponse: "Nopein Vastaus",
    whatsapp: {
      title: "Keskustele WhatsAppissa",
      description: "Saat välittömät vastaukset tiimiltämme",
      cta: "Avaa WhatsApp",
      prefill: "Hei, olen kiinnostunut Costa del Solin kiinteistöistä. Voitteko auttaa?"
    },
    email: {
      title: "Lähetä Sähköpostia",
      description: "Vastaamme 24 tunnin kuluessa",
      cta: "Lähetä Sähköposti"
    },
    phone: {
      title: "Soita Toimistoomme",
      description: "Puhu suoraan neuvonantajan kanssa",
      cta: "Soita Nyt"
    }
  },
  form: {
    headline: "Lähetä Viesti",
    subheadline: "Täytä lomake ja otamme sinuun pian yhteyttä",
    fields: {
      fullName: "Koko Nimi",
      email: "Sähköpostiosoite",
      phone: "Puhelinnumero (Valinnainen)",
      language: "Ensisijainen Kieli",
      subject: "Aihe",
      message: "Viestisi",
      referral: "Miten kuulit meistä? (Valinnainen)",
      privacy: "Hyväksyn tietosuojakäytännön ja suostun tietojeni käsittelyyn.",
      privacyLink: "Tietosuojakäytäntö"
    },
    subjects: {
      general: "Yleinen Tiedustelu",
      property: "Kiinteistötiedustelu",
      selling: "Kiinteistöni Myynti",
      viewing: "Varaa Näyttö",
      other: "Muu"
    },
    referrals: {
      google: "Google-haku",
      socialMedia: "Sosiaalinen Media",
      referral: "Ystävän/Perheen Suositus",
      advertisement: "Verkkomainos",
      other: "Muu"
    },
    submit: "Lähetä Viesti",
    submitting: "Lähetetään...",
    validation: {
      requiredFields: "Täytä kaikki pakolliset kentät"
    },
    error: {
      title: "Jokin meni pieleen",
      description: "Yritä uudelleen tai ota yhteyttä WhatsAppilla."
    },
    success: {
      title: "Viesti Lähetetty!",
      description: "Kiitos yhteydenotostasi. Vastaamme 24 tunnin kuluessa."
    }
  },
  office: {
    headline: "Käy Toimistollamme",
    addressTitle: "Toimiston Osoite",
    hours: {
      title: "Aukioloajat",
      weekdays: "Maanantai - Perjantai",
      saturday: "Lauantai",
      sunday: "Sunnuntai",
      closed: "Suljettu",
      timezone: "Keski-Euroopan Aika (CET)"
    },
    directions: "Hae Reittiohjeet"
  },
  faq: {
    headline: "Usein Kysytyt Kysymykset",
    items: [
      {
        question: "Kuinka nopeasti vastaatte?",
        answer: "Pyrimme vastaamaan kaikkiin tiedusteluihin 24 tunnin kuluessa arkipäivisin. WhatsApp-viestit saavat yleensä nopeamman vastauksen."
      },
      {
        question: "Puhutteko kieltäni?",
        answer: "Kyllä! Tiimimme puhuu yli 10 kieltä, mukaan lukien englanti, hollanti, saksa, ranska, ruotsi, norja, tanska, suomi, puola ja unkari."
      },
      {
        question: "Voinko varata videopuhelun?",
        answer: "Ehdottomasti! Ota yhteyttä WhatsAppilla tai sähköpostilla sopiaksesi sopivan ajan videokonsultaatioon yhden kiinteistöasiantuntijamme kanssa."
      },
      {
        question: "Mitä alueita katatte?",
        answer: "Erikoistumme koko Costa del Solin alueeseen, Málagasta Sotograndeen, mukaan lukien Marbella, Estepona, Fuengirola, Benalmádena ja Mijas."
      }
    ]
  },
  emma: {
    badge: "Tekoälykäyttöinen",
    callout: "Haluatko välittömiä vastauksia?",
    cta: "Keskustele Emman kanssa, tekoälyavustajamme",
    buttonText: "Keskustele Emman kanssa"
  }
}
```

---

## Expected Result

After implementation:
- Visiting `/fi/contact` will show **100% Finnish** content
- All 10 language versions will display fully localized Contact pages
- Form labels, button text, FAQ items, office hours labels, and badges will all translate
- No English "bleeding" on non-English pages
- Consistent with the project's 100% localization integrity standard

