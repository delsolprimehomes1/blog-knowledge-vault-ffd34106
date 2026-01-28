
# Replicate Landing Page Framework to Retargeting Pages

## Current State Analysis

### Landing Page (`/en/landing`) Structure:
1. **Fixed Header** - White background with property category links, centered logo, language selector, "Speak with Emma" CTA button
2. **Hero** - Full-screen with background image, dark overlay, headline, subheadline, dual CTAs (Watch Video + Start with Emma)
3. **AutoplayVideo** - Video section with headline, embedded video player, bullet points, golden CTA button
4. **TestimonialsSection** - 3 testimonial cards with flags, Swiper carousel on mobile, grid on desktop
5. **EmmaSection** - Premium card with icon, headline, explanation, navy CTA button
6. **PropertiesShowcase** - Categorized into Apartments and Villas, 3-column grid, image carousels
7. **ClassicOptin** - Form with Full Name, Phone, Interest dropdown, checkbox consent
8. **Footer** - Minimal with logo, copyright, links, language selector
9. **EmmaChat** - Floating chat modal
10. **LeadCaptureForm** - Property inquiry modal

### Retargeting Page (`/en/welcome-back`) Structure:
1. **Transparent Header** - Scroll-aware, simpler layout, no property links
2. **RetargetingHero** - Similar structure but different styling
3. **RetargetingIntro** - Simple text section
4. **RetargetingVisualContext** - Image + quote layout
5. **RetargetingTestimonials** - 3-column cards
6. **RetargetingPositioning** - Dark navy background quote
7. **RetargetingProjects** - 3-column property grid (all properties)
8. **RetargetingForm** - Simpler form (First Name, Email, Question)
9. **RetargetingFooter** - Dark navy footer

---

## Key Differences to Align

| Feature | Landing Page | Retargeting Page (Current) |
|---------|--------------|----------------------------|
| Header | Fixed white, property links, Emma CTA | Transparent → white on scroll, no links |
| Video Section | AutoplayVideo with embedded player | Video modal only (no inline video) |
| Emma Section | Premium card with CTA | Missing entirely |
| Properties | Categorized (Apartments/Villas) | Single grid, all properties |
| Form | Phone-focused (WhatsApp/SMS) | Email-focused |
| Footer | Light minimal | Dark navy |
| EmmaChat | Yes | Missing |

---

## Implementation Plan

### Phase 1: Update RetargetingLanding.tsx (Main Page)
**Goal:** Match the section order and structure of LandingLayout.tsx

```text
Current Retargeting Order:
Hero → Intro → VisualContext → Testimonials → Positioning → Projects → Form → Footer

Target Landing Order:
Hero → Video → Testimonials → Emma → Properties → ClassicOptin → Footer
```

**Changes:**
1. Add fixed white header with property category links (matching landing)
2. Replace transparent header with the landing page header style
3. Add "Speak with Emma" CTA button that opens EmmaChat
4. Add EmmaChat component for chat functionality
5. Restructure section order to match landing page

### Phase 2: Create/Modify Section Components

#### 2.1 Header Update (`RetargetingLanding.tsx`)
Replace the current transparent header with landing page's fixed white header:
- Property category links (Apartments, Penthouses, Townhouses, Villas)
- Centered logo
- Language selector
- "Speak with Emma" CTA button

#### 2.2 Hero Update (`RetargetingHero.tsx`)
Update to match landing Hero:
- Add secondary CTA "Or start with clear answers" below video button
- Add "No pressure · No obligation" microcopy

#### 2.3 Add Video Section
**New component:** Create `RetargetingAutoplayVideo.tsx` based on `AutoplayVideo.tsx`
- Inline video player (not just modal)
- Language-specific video URLs (reuse from AutoplayVideo)
- Bullet points with checkmarks
- Golden "Ask Emma All Your Questions" CTA

#### 2.4 Testimonials Update (`RetargetingTestimonials.tsx`)
Update to match landing TestimonialsSection:
- Add Swiper carousel for mobile
- Match card styling with flag icons, headlines, body text
- Add section heading and subheading

#### 2.5 Add Emma Section
**New component:** Create `RetargetingEmmaSection.tsx` based on `EmmaSection.tsx`
- Premium card with MessageCircle icon
- "Start with clarity, not listings" headline
- "Get clarity with Emma" CTA button
- Opens EmmaChat on click

#### 2.6 Properties Update (`RetargetingProjects.tsx`)
Update to match PropertiesShowcase:
- Keep current 3-column layout and all properties
- Add category sections (Apartments & Penthouses / Townhouses & Villas)
- Match card styling with landing page
- Add "View all" CTAs per category

#### 2.7 Form Update (`RetargetingForm.tsx`)
Update to match ClassicOptin:
- Change from Email-focused to Phone/WhatsApp-focused
- Add Interest dropdown (Apartments, Villas, Both)
- Add consent checkbox
- Match styling and labels

#### 2.8 Footer Update (`RetargetingFooter.tsx`)
Convert from dark navy to light minimal footer matching landing:
- Light gray background
- Same logo, links, copyright format

### Phase 3: Add EmmaChat Integration
Import and mount EmmaChat from landing components:
- Add state for `isEmmaOpen`
- Wire up CTAs to open Emma chat
- Add event listeners for custom events

### Phase 4: Update Translations
Extend `retargetingTranslations.ts` with new keys:
- Header labels (apartments, penthouses, townhouses, villas, cta)
- Video section (softLine, bullets, ctaButton, reassurance)
- Emma section (statement, explanation, cta, microcopy)
- Updated form fields (phone-focused)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/RetargetingLanding.tsx` | Modify | Update header, add EmmaChat, reorder sections |
| `src/components/retargeting/RetargetingHero.tsx` | Modify | Add secondary CTA and microcopy |
| `src/components/retargeting/RetargetingAutoplayVideo.tsx` | Create | Inline video section with language-specific videos |
| `src/components/retargeting/RetargetingEmmaSection.tsx` | Create | Premium card CTA section |
| `src/components/retargeting/RetargetingTestimonials.tsx` | Modify | Add Swiper carousel, match landing styling |
| `src/components/retargeting/RetargetingProjects.tsx` | Modify | Add category sections, match card styling |
| `src/components/retargeting/RetargetingForm.tsx` | Modify | Phone-focused form with interest dropdown |
| `src/components/retargeting/RetargetingFooter.tsx` | Modify | Light minimal footer |
| `src/components/retargeting/index.ts` | Modify | Export new components |
| `src/lib/retargetingTranslations.ts` | Modify | Add new translation keys for all languages |

---

## Section Removal

The following current retargeting sections will be removed or repurposed:
- **RetargetingIntro** - Content merged into Video section
- **RetargetingVisualContext** - Removed (landing doesn't have this)
- **RetargetingPositioning** - Removed (replaced by Emma section)

---

## Expected Result

After implementation, the retargeting pages (`/{lang}/welcome-back`) will have:
1. Fixed white header with property category navigation and Emma CTA
2. Full-screen Hero with dual CTAs
3. Inline video section with language-specific videos
4. Testimonials carousel matching landing page design
5. Emma premium card section with chat CTA
6. Property showcase with categories (Apartments + Villas)
7. Phone/WhatsApp-focused lead capture form
8. Light minimal footer
9. Emma AI chatbot integration

All content will remain fully localized across all 10 supported languages (en, nl, de, fr, fi, pl, da, hu, sv, no).
