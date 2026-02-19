
## Add Intro Text Strip Between Hero and "Featured Properties"

### Where It Goes

Inside `src/components/apartments/ApartmentsPropertiesSection.tsx`, between the `<section>` opening tag and the existing `Featured Properties` heading block. No new files or components are needed — this is a self-contained addition to the existing translations map and JSX.

### Translations (all 10 locales)

The intro text will be added as a new `introText` key inside the existing `TRANSLATIONS` constant in `ApartmentsPropertiesSection.tsx`:

| Language | Translation |
|----------|-------------|
| en | This is a selection of the latest modern property developments along the main seaside resorts on the Costa del Sol (Malaga), in the beautiful southern Spanish region of Andalucia. |
| nl | Dit is een selectie van de nieuwste moderne vastgoedontwikkelingen langs de belangrijkste badplaatsen aan de Costa del Sol (Málaga), in de prachtige zuidelijke Spaanse regio Andalusië. |
| fr | Voici une sélection des derniers projets immobiliers modernes le long des principales stations balnéaires de la Costa del Sol (Málaga), dans la magnifique région méridionale espagnole d'Andalousie. |
| de | Dies ist eine Auswahl der neuesten modernen Immobilienprojekte entlang der wichtigsten Seebäder der Costa del Sol (Málaga), in der wunderschönen südspanischen Region Andalusien. |
| fi | Tämä on valikoima uusimmista moderneista kiinteistökehityshankkeista Costa del Solin (Málaga) tärkeimpien rantakuurorien varrella, kauniissa Espanjan eteläisessä Andalusian alueella. |
| pl | To jest wybór najnowszych nowoczesnych inwestycji nieruchomościowych wzdłuż głównych nadmorskich kurortów Costa del Sol (Málaga), w pięknym południowym hiszpańskim regionie Andaluzji. |
| da | Dette er et udvalg af de nyeste moderne ejendomsudviklinger langs de vigtigste badebyer på Costa del Sol (Málaga), i den smukke sydlige spanske region Andalusien. |
| hu | Ez a Costa del Sol (Málaga) fő tengerparti üdülőhelyei mentén található legújabb modern ingatlanfejlesztések válogatása, Spanyolország gyönyörű déli régiójában, Andalúziában. |
| sv | Detta är ett urval av de senaste moderna fastighetsutvecklingarna längs de viktigaste badorternas Costa del Sol (Málaga), i den vackra södra spanska regionen Andalusien. |
| no | Dette er et utvalg av de nyeste moderne eiendomsutviklingene langs de viktigste badestrendene på Costa del Sol (Málaga), i den vakre sørlige spanske regionen Andalucia. |

### Visual Design (Mobile-Optimised)

- Thin horizontal rule above the text to separate from hero
- Text centred, `max-w-2xl mx-auto` for controlled line length on wide screens
- Font: `text-sm sm:text-base` — readable but clearly subordinate to the "Featured Properties" heading below
- Colour: `text-gray-600` — muted, editorial feel
- Padding: `px-4 pt-8 pb-4 sm:pt-10 sm:pb-6` — compact on mobile, slightly more breathing room on desktop
- Italic styling to give it a descriptive/editorial tone distinct from the heading

### Technical Change

Single file edit — `src/components/apartments/ApartmentsPropertiesSection.tsx`:

1. Add `introText` to every locale entry in the `TRANSLATIONS` constant (lines 7–18)
2. Insert a new `<div>` between the `<section>` opening and the existing heading block (around line 170), rendering `t.introText` inside a `<p>` tag with the styling described above

No database changes, no new files, no new dependencies.
