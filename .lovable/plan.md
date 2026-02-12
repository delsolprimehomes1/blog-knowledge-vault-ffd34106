

# Fix Schema.org Markup on Q&A Pages

## Problem
The Q&A page component (`src/pages/QAPage.tsx`) does not inject any structured data. The JSON-LD schema generator (`src/lib/qaPageSchemaGenerator.ts`) exists but is never called from the page component. While the SSR edge function handles schema for crawlers, the client-side React page has zero Schema.org markup -- neither JSON-LD nor microdata attributes.

## Changes

### 1. Inject JSON-LD Schema via Helmet (`src/pages/QAPage.tsx`)

Import `generateAllQASchemas` from `qaPageSchemaGenerator.ts` and render the full schema graph as a `<script type="application/ld+json">` tag inside the existing `<Helmet>` block.

This provides the QAPage, WebPage, BreadcrumbList, and Organization schemas in a single `@graph` structure -- the same format Google recommends.

### 2. Add Microdata Attributes to HTML Elements (`src/pages/QAPage.tsx`)

Add Schema.org microdata as a secondary signal alongside JSON-LD:

- Wrap the main content area with `itemScope itemType="https://schema.org/QAPage"`
- Add a `mainEntity` wrapper with `itemProp="mainEntity" itemScope itemType="https://schema.org/Question"`
- Set `itemProp="name"` on the H1 question title
- Add `<meta itemProp="answerCount" content="1" />` inside the Question scope
- Wrap the answer content with `itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer"`
- Set `itemProp="text"` on the answer div

### 3. No Changes Needed Elsewhere

- The SSR edge function already generates correct QAPage schema for search engine crawlers
- The schema generator library is already correct (uses QAPage, not FAQPage)
- All 10 languages are covered automatically since the component reads `qaPage.language`

## Technical Details

**File modified:** `src/pages/QAPage.tsx`

**Import added:**
```typescript
import { generateAllQASchemas } from '@/lib/qaPageSchemaGenerator';
```

**JSON-LD injection (inside Helmet):**
```tsx
<script type="application/ld+json">
  {JSON.stringify(generateAllQASchemas(qaPage, author))}
</script>
```

**Microdata structure (simplified):**
```
<main itemScope itemType="https://schema.org/QAPage">
  <div itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
    <h1 itemProp="name">{question}</h1>
    <meta itemProp="answerCount" content="1" />
    <div itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
      <article itemProp="text">{answer_main}</article>
    </div>
  </div>
</main>
```

## Verification
After deployment, test with:
- Google Rich Results Test: paste any Q&A page URL
- Schema Markup Validator: validate the QAPage structure
- Google Search Console: monitor for schema error resolution

