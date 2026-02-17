

## Add Privacy Policy and Terms of Service Links to Form Pop-ups

Currently, the consent checkbox on the Apartments lead form modal shows plain text like "I agree to the processing of my personal data in accordance with the privacy policy." with no clickable links. The villas pages reuse the same pattern.

### What will be changed

**1. Update `src/components/apartments/ApartmentsLeadFormModal.tsx`**

- Split the `consent` string in `FORM_TRANSLATIONS` into two parts: `consentPrefix` (the agreement text) and `consentSuffix` (any trailing text), plus localized labels for "Privacy Policy" and "Terms of Service" for all 10 languages.
- Replace the plain `<span>{ft.consent}</span>` (line 164) with JSX containing two hyperlinks:
  - **Privacy Policy** link pointing to `https://policies.google.com/privacy` (opens in new tab)
  - **Terms of Service** link pointing to `https://policies.google.com/terms` (opens in new tab)
- Links will be styled with an underline and the landing gold color for visibility.

**Example rendered text (English):**
"I agree to the processing of my personal data in accordance with the [Privacy Policy](https://policies.google.com/privacy) and [Terms of Service](https://policies.google.com/terms). *"

This single file change covers all 10 language variants for the Apartments landing pages, and since the Villas landing page (when created) will reuse this same modal component, it will automatically inherit the same linked consent text.

### Technical details

| Action | File |
|--------|------|
| Edit | `src/components/apartments/ApartmentsLeadFormModal.tsx` -- update FORM_TRANSLATIONS to split consent into parts with localized "Privacy Policy" / "Terms of Service" labels, update JSX to render `<a>` tags |

