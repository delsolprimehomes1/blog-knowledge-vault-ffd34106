

## Fully Localize Apartments Property Cards, Section Headings, and Lead Form

### Problem
Several UI elements on the apartments page are hardcoded in English:
- "Featured Properties" section heading and subtitle
- "View" button on each property card
- "FROM" label on the price overlay
- The entire lead form modal (placeholders, consent text, submit button, toast messages)

### Solution
Add a translation map covering all 10 languages for every hardcoded string, applied across three files.

---

### Changes

**1. `src/components/apartments/ApartmentsPropertiesSection.tsx`**

Add a `TRANSLATIONS` object at the top of the file with keys for each language:

```
{
  en: { featured: "Featured Properties", subtitle: "Handpicked residences on the Costa del Sol", view: "View", from: "FROM" },
  nl: { featured: "Uitgelichte Woningen", subtitle: "Zorgvuldig geselecteerde woningen aan de Costa del Sol", view: "Bekijk", from: "VANAF" },
  fr: { featured: "Proprietes en Vedette", subtitle: "Residences selectionnees sur la Costa del Sol", view: "Voir", from: "A PARTIR DE" },
  de: { featured: "Ausgewahlte Immobilien", subtitle: "Handverlesene Residenzen an der Costa del Sol", view: "Ansehen", from: "AB" },
  fi: { featured: "Esittelyssa Olevat Kohteet", subtitle: "Huolella valitut asunnot Costa del Solilla", view: "Katso", from: "ALKAEN" },
  pl: { featured: "Wyrozniajace sie Nieruchomosci", subtitle: "Starannie wybrane rezydencje na Costa del Sol", view: "Zobacz", from: "OD" },
  da: { featured: "Udvalgte Ejendomme", subtitle: "Handplukkede boliger pa Costa del Sol", view: "Se", from: "FRA" },
  hu: { featured: "Kiemelt Ingatlanok", subtitle: "Valogatott rezidenciak a Costa del Solon", view: "Megtekintos", from: "TOBB MINT" },
  sv: { featured: "Utvalda Fastigheter", subtitle: "Noggrant utvalda bostader pa Costa del Sol", view: "Visa", from: "FRAN" },
  no: { featured: "Utvalgte Eiendommer", subtitle: "Noye utvalgte boliger pa Costa del Sol", view: "Se", from: "FRA" },
}
```

- Pass `language` into `PropertyCard` as a new prop
- Replace hardcoded "Featured Properties", "Handpicked residences...", "View", and "From" with the translation lookups

**2. `src/components/apartments/ApartmentsLeadFormModal.tsx`**

Add a `FORM_TRANSLATIONS` object with keys for all 10 languages covering:
- Form title: "Please fill in the form to receive further information"
- Placeholders: "Full Name", "Email", "Phone Number", "Message"
- Consent text: "I consent to receive communications from Del Sol Prime Homes"
- Submit button: "Send"
- Privacy/reCAPTCHA note
- Toast success title and description
- Sending state text

Replace all hardcoded English strings in the form with these translations.

### No backend changes needed
All translations are static UI strings handled in the component files.

