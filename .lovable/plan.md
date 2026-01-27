
# Retargeting Page Redesign - Modern Glassmorphism Design

## Overview

Transform the retargeting landing page (`/en/welcome-back`) to match the modern, sleek, and professional design of the main landing pages. This includes adding glassmorphism effects, pulling real properties from the database, and creating a premium luxury aesthetic.

## Current vs Target Design

| Element | Current State | Target State |
|---------|--------------|--------------|
| Hero | Plain gradient background | Full-height image with overlay, glassmorphism header |
| Cards | Basic white with minimal shadow | Glassmorphism with blur, gradient borders, hover lift |
| Properties | Static placeholder data (3 Unsplash images) | Real properties from `properties` table via Supabase |
| Testimonials | Simple cards | Premium cards with hover glow, animated reveals |
| Form | Basic form styling | Glassmorphism container, floating labels, glow effects |
| Decorations | None | Blur circles, gradient accents, animated elements |

---

## Design System Updates

### Glassmorphism Styling Pattern

```text
- bg-white/80 backdrop-blur-xl (or backdrop-blur-md)
- border border-white/50 (or border-white/20)
- shadow-xl or shadow-2xl
- rounded-2xl or rounded-3xl
- Hover: border-gold/20 glow effect
```

### Decorative Elements

```text
- Blur circles: bg-landing-gold/5 or bg-landing-navy/5 with blur-3xl
- Gradient backgrounds: bg-gradient-to-br from-white to-gray-50
- Animated reveals: fade-in + scale on scroll
```

### Color Palette (aligned with landing pages)

```text
- Primary: #1A2332 (landing-navy)
- Gold: #C4A053 (landing-gold)
- Backgrounds: white, #f8f9fa, #faf9f7
- Glassmorphism: white/80, white/95
```

---

## Component Updates

### 1. RetargetingHero.tsx - Full Visual Redesign

**Current:**
- Plain gradient background
- Centered text block
- Simple gold button

**New Design:**
- Full-height hero with Costa del Sol background image (use existing hero assets)
- Dark overlay (`bg-landing-navy/50`)
- Gradient overlay for text readability
- Glassmorphism header (matching landing page)
- Ken Burns animation on background
- Animated text reveal
- Primary CTA with glow effect
- Scroll indicator at bottom

**Key styling:**
```text
- min-h-[100svh] with background image
- Overlay: bg-landing-navy/50 mix-blend-multiply
- Text with drop shadows for visibility
- Button: gradient gold with hover shadow
```

---

### 2. RetargetingHeader (new sub-component)

**New Design:**
- Fixed position header
- Glassmorphism: `bg-white/95 backdrop-blur-md`
- Subtle border and shadow
- Logo centered, language selector optional
- Smooth transition on scroll

---

### 3. RetargetingVisualContext.tsx - Premium Styling

**Current:**
- Placeholder SVG icon
- Basic grid layout

**New Design:**
- Real image (iPad/documents visual or use existing assets)
- Glassmorphism image container
- Decorative blur circles in background
- Animated reveal on scroll using framer-motion
- Quote styled with serif typography and gold accent bar

---

### 4. RetargetingTestimonials.tsx - Modern Card Design

**Current:**
- Basic white cards with subtle shadow

**New Design:**
- Glassmorphism cards: `bg-white/80 backdrop-blur-sm`
- Hover effects: `hover:scale-[1.02] hover:shadow-xl`
- Gold accent on quote marks
- Border glow on hover: `hover:border-landing-gold/20`
- Staggered reveal animation
- Larger flag icons with shadow

**Card structure:**
```text
- rounded-2xl
- shadow-lg hover:shadow-xl
- border border-gray-100 hover:border-gold/20
- transition-all duration-300
- group for hover effects
```

---

### 5. RetargetingPositioning.tsx - Enhanced Visual Impact

**Current:**
- Navy background with white text (good)
- Basic padding

**New Design:**
- Keep navy background
- Add subtle gradient overlay
- Decorative blur circles at edges
- Larger, more dramatic typography
- Animated reveal with scale effect
- Optional: subtle animated particles or glow

---

### 6. RetargetingProjects.tsx - Real Property Data + Premium Cards

**This is the biggest change - switching from static placeholders to real data**

**Current:**
- 3 static placeholder properties with Unsplash images
- Basic card design

**New Design:**
- Fetch 3-4 properties from Supabase `properties` table (like PropertiesShowcase.tsx)
- Use `PropertyImageCarousel` component for image galleries
- Glassmorphism price badge
- Property details: beds, baths, size
- Hover effects: image zoom, card lift
- Staggered reveal animation
- "View details" opens lead form (like landing page behavior)

**Data Integration:**
```text
- Use supabase client to fetch active properties
- Filter: is_active = true, limit 3-4
- Display: internal_name, location, price, images, descriptions
- Format price with EUR
```

**Card Features:**
- Image carousel with dots/arrows
- Price badge with glassmorphism
- Beds/Baths/Size indicators
- Hover zoom on image
- "View details" subtle link or opens modal

---

### 7. RetargetingForm.tsx - Glassmorphism Form Design

**Current:**
- Basic form with cream background
- Simple input styling

**New Design:**
- Glassmorphism container: `bg-white/80 backdrop-blur-xl`
- Decorative blur circles in background
- Floating label inputs (optional)
- Focus states with gold ring
- Submit button with gradient and glow
- Success state with animated checkmark
- Input styling: rounded-xl, focus:ring-gold

---

### 8. RetargetingFooter.tsx - Premium Footer

**Current:**
- Navy background with basic logo/links

**New Design:**
- Keep navy background
- Add subtle gradient overlay
- Logo with gold accent
- Minimal links with hover underline animation
- Optional: decorative line or gold accent

---

### 9. RetargetingIntro.tsx - Subtle Enhancement

**Current:**
- White background, centered text (good base)

**New Design:**
- Add subtle decorative blur circles
- Animated text reveal
- Slightly larger, more impactful typography

---

## New Components Needed

### PropertyImageCarousel Integration
- Import and use existing `PropertyImageCarousel` from landing components
- Provides swipeable image gallery on property cards

### useScrollAnimation Hook
- Already exists at `src/hooks/useScrollAnimation.tsx`
- Use for section reveal animations

---

## File Changes Summary

| File | Change Type | Key Updates |
|------|-------------|-------------|
| `RetargetingLanding.tsx` | Modify | Add fixed header, update structure |
| `RetargetingHero.tsx` | Major rewrite | Background image, overlay, glassmorphism |
| `RetargetingVisualContext.tsx` | Modify | Add real image, glassmorphism, decorations |
| `RetargetingTestimonials.tsx` | Modify | Glassmorphism cards, hover effects |
| `RetargetingPositioning.tsx` | Modify | Add decorative elements, enhanced animation |
| `RetargetingProjects.tsx` | Major rewrite | Supabase integration, PropertyImageCarousel, premium cards |
| `RetargetingForm.tsx` | Modify | Glassmorphism styling, enhanced inputs |
| `RetargetingFooter.tsx` | Minor | Add subtle decorative elements |
| `RetargetingIntro.tsx` | Minor | Add blur decorations, animation |

---

## Technical Implementation

### Supabase Query for Properties

```typescript
const { data } = await supabase
  .from('properties')
  .select('*')
  .eq('is_active', true)
  .order('display_order', { ascending: true })
  .limit(4);
```

### Imports to Add

```typescript
import { supabase } from '@/integrations/supabase/client';
import { PropertyImageCarousel } from '@/components/landing/PropertyImageCarousel';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Bed, Bath, Square, MapPin, ArrowRight } from 'lucide-react';
```

### Animation Pattern

```typescript
const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.1 });

// Apply to container:
className={`transition-all duration-700 ${
  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
}`}
```

---

## Hero Image Options

Two approaches:

1. **Use existing landing hero images:**
   - Import from `@/assets/hero-landing-desktop.jpg` and `hero-landing-mobile.jpg`
   - Proven to work, consistent branding

2. **Use a different, calmer Costa del Sol image:**
   - Could use a property-related image from Supabase storage
   - Would need to source/upload new assets

**Recommendation:** Use existing hero images for consistency

---

## Maintaining Calm Tone

While adding modern design, we preserve the calm educational tone:
- No urgency language or badges
- Subtle animations (not flashy)
- Properties shown as "examples" not "offers"
- Form remains optional-feeling
- Muted gold accents (not bright)
- Generous whitespace preserved

---

## Implementation Order

1. **RetargetingHero.tsx** - Visual anchor, sets the tone
2. **RetargetingProjects.tsx** - Biggest change, real data integration
3. **RetargetingTestimonials.tsx** - Premium card styling
4. **RetargetingForm.tsx** - Glassmorphism form
5. **RetargetingVisualContext.tsx** - Enhanced visual block
6. **RetargetingPositioning.tsx** - Decorative enhancements
7. **RetargetingLanding.tsx** - Fixed header integration
8. **RetargetingFooter.tsx** - Minor polish
9. **RetargetingIntro.tsx** - Final touches

---

## Expected Visual Result

After implementation, the retargeting page will feature:
- Immersive full-screen hero with Costa del Sol imagery
- Glassmorphism cards and containers throughout
- Real property listings with interactive image carousels
- Premium testimonial cards with subtle animations
- Modern form with focus states and glow effects
- Decorative blur elements for visual depth
- Smooth scroll animations for professional feel
- Consistent with main landing page luxury aesthetic

The page will maintain its calm, educational messaging while delivering a premium visual experience that matches the main landing pages.
