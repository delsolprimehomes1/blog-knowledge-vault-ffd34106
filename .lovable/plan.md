
# Ensure Comparison Generator Creates Articles in All 10 Languages

## Executive Summary

The project already has robust multi-language infrastructure for comparisons:
- **Edge functions exist**: `generate-comparison`, `translate-comparison`, `generate-comparison-batch`, and `backfill-comparison-languages`
- **Database schema is ready**: `comparison_pages` table has `language`, `hreflang_group_id`, `translations` JSONB, and `source_language` columns
- **10 supported languages**: en, de, nl, fr, pl, sv, da, hu, fi, no (note: NOT es/Spanish per codebase standard)

The task requires enhancing the UI to provide batch multi-language generation with a checkbox selection interface and improving the admin view to show language coverage.

---

## Current State

| Component | Status |
|-----------|--------|
| `comparison_pages` table with language columns | Exists |
| `generate-comparison` function (single/multi-language) | Exists - already supports `languages` array |
| `translate-comparison` function | Exists |
| `backfill-comparison-languages` function | Exists - translates missing languages |
| UI with language checkbox selection | Missing |
| Admin view grouped by comparison_group | Exists but basic |
| Hreflang tags in ComparisonPage.tsx | Missing |
| Language-specific URL slugs (/nl/vergelijk/) | Not implemented - all use /compare/ |

---

## Phase 1: Add Multi-Language Selection UI

### Modify `src/pages/admin/ComparisonGenerator.tsx`

Add a new "Languages" section in the "Generate Custom" tab with:

```text
+------------------------------------------------------+
| Select Languages to Generate                          |
+------------------------------------------------------+
| [ ] Select All / Deselect All                        |
|                                                       |
| [x] 🇬🇧 English (en)    [x] 🇩🇪 German (de)          |
| [x] 🇳🇱 Dutch (nl)      [x] 🇫🇷 French (fr)          |
| [x] 🇵🇱 Polish (pl)     [x] 🇸🇪 Swedish (sv)         |
| [x] 🇩🇰 Danish (da)     [x] 🇭🇺 Hungarian (hu)       |
| [x] 🇫🇮 Finnish (fi)    [x] 🇳🇴 Norwegian (no)       |
+------------------------------------------------------+
| [Generate in 10 Languages]                           |
+------------------------------------------------------+
```

**State additions:**
```typescript
const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
  LANGUAGES.map(l => l.code) // All selected by default
);
```

**UI components:**
- Checkbox grid using existing `Checkbox` component
- "Select All" / "Deselect All" buttons
- Badge showing count (e.g., "10 languages selected")
- Progress indicator showing which language is currently being generated

---

## Phase 2: Enhance Generation Mutation

### Update the `generateMutation` to support batch mode:

```typescript
const generateMutation = useMutation({
  mutationFn: async (params) => {
    const { data, error } = await supabase.functions.invoke('generate-comparison', {
      body: { 
        option_a: params.optionA, 
        option_b: params.optionB, 
        niche: params.niche, 
        target_audience: params.targetAudience, 
        suggested_headline: params.suggestedHeadline,
        languages: selectedLanguages, // Pass array of selected languages
        include_internal_links: true,
        include_citations: true,
      }
    });
    if (error) throw error;
    return data;
  },
});
```

The existing `generate-comparison` function already supports a `languages` array parameter - it generates all requested languages with a shared `hreflang_group_id`.

---

## Phase 3: Add Batch Generation with Progress

### New progress tracking state:

```typescript
const [batchProgress, setBatchProgress] = useState<{
  isGenerating: boolean;
  currentLanguage: string;
  completedCount: number;
  totalCount: number;
  results: { lang: string; success: boolean; error?: string }[];
}>({
  isGenerating: false,
  currentLanguage: '',
  completedCount: 0,
  totalCount: 0,
  results: [],
});
```

### Progress UI component:

```text
+--------------------------------------------------+
| Generating: 4 of 10 languages                    |
| [====================================----]  40%  |
|                                                   |
| ✓ en  ✓ de  ✓ nl  ✓ fr                          |
| ⏳ pl  ○ sv  ○ da  ○ hu  ○ fi  ○ no              |
+--------------------------------------------------+
```

---

## Phase 4: Enhance "Manage" Tab with Language Coverage View

### Group comparisons by `comparison_topic` with language matrix:

```text
+----------------------------------------------------------+
| Golden Mile vs Nueva Andalucía                            |
| 10/10 languages ✓                                         |
|----------------------------------------------------------+
| 🇬🇧✓ 🇩🇪✓ 🇳🇱✓ 🇫🇷✓ 🇵🇱✓ 🇸🇪✓ 🇩🇰✓ 🇭🇺✓ 🇫🇮✓ 🇳🇴✓ |
+----------------------------------------------------------+

+----------------------------------------------------------+
| New-Build vs Resale Property                              |
| 3/10 languages ⚠                                          |
|----------------------------------------------------------+
| 🇬🇧✓ 🇩🇪✓ 🇳🇱✓ 🇫🇷○ 🇵🇱○ 🇸🇪○ 🇩🇰○ 🇭🇺○ 🇫🇮○ 🇳🇴○ |
|                                                           |
| [Add Missing 7 Languages]  [Translate All Missing]        |
+----------------------------------------------------------+
```

### Features:
- Visual language coverage matrix (existing badges enhanced)
- "Add Missing Languages" button per comparison group
- Bulk "Generate All Missing Translations" button at page level
- Filter: Show All / Incomplete Only

---

## Phase 5: Add Hreflang Tags to ComparisonPage.tsx

### Add to Helmet section:

```typescript
// Fetch translations from comparison or database
const translations = comparison.translations as Record<string, string> | null;
const hreflangGroupId = comparison.hreflang_group_id;

// Generate hreflang tags
const hreflangTags = translations 
  ? Object.entries(translations).map(([lang, slug]) => ({
      hreflang: lang === 'en' ? 'en' : lang,
      href: `https://www.delsolprimehomes.com/${lang}/compare/${slug}`
    }))
  : [];

// Add self-referencing hreflang
if (!hreflangTags.find(t => t.hreflang === comparison.language)) {
  hreflangTags.push({
    hreflang: comparison.language,
    href: `https://www.delsolprimehomes.com/${comparison.language}/compare/${comparison.slug}`
  });
}
```

### Render in Helmet:

```jsx
<Helmet>
  <link rel="canonical" href={canonicalUrl} />
  
  {/* Hreflang tags for all translations */}
  {hreflangTags.map(({ hreflang, href }) => (
    <link key={hreflang} rel="alternate" hrefLang={hreflang} href={href} />
  ))}
  
  {/* x-default points to English */}
  <link rel="alternate" hrefLang="x-default" 
        href={`https://www.delsolprimehomes.com/en/compare/${translations?.en || comparison.slug}`} />
</Helmet>
```

---

## Phase 6: Add Language Switcher to Comparison Page

### Similar to existing ContentLanguageSwitcher:

```jsx
{translations && Object.keys(translations).length > 0 && (
  <div className="flex flex-wrap gap-2 justify-center mt-4">
    {Object.entries(translations).map(([lang, slug]) => (
      <Link 
        key={lang}
        to={`/${lang}/compare/${slug}`}
        className={cn(
          "px-3 py-1 rounded-full text-sm",
          lang === comparison.language 
            ? "bg-primary text-white" 
            : "bg-muted hover:bg-primary/10"
        )}
      >
        {LANGUAGES.find(l => l.code === lang)?.flag} {lang.toUpperCase()}
      </Link>
    ))}
  </div>
)}
```

---

## Phase 7: Add JSON-LD Schema with Translations

### Add to ComparisonPage.tsx:

```typescript
const comparisonSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": comparison.headline,
  "description": comparison.meta_description,
  "inLanguage": comparison.language,
  "isPartOf": {
    "@type": "WebSite",
    "name": "Del Sol Prime Homes",
    "url": "https://www.delsolprimehomes.com"
  },
  // Link to translations
  "workTranslation": translations 
    ? Object.entries(translations)
        .filter(([lang]) => lang !== comparison.language)
        .map(([lang, slug]) => ({
          "@type": "Article",
          "inLanguage": lang,
          "url": `https://www.delsolprimehomes.com/${lang}/compare/${slug}`
        }))
    : undefined
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/ComparisonGenerator.tsx` | Add language checkbox selection, batch progress UI, enhanced manage view |
| `src/pages/ComparisonPage.tsx` | Add hreflang tags, language switcher, enhanced schema |
| `src/components/comparison/ComparisonHero.tsx` | Add language switcher component |

## No Database Changes Required

The existing schema already has all required columns:
- `language` TEXT
- `hreflang_group_id` UUID
- `translations` JSONB
- `source_language` VARCHAR
- `canonical_url` TEXT

---

## URL Structure Clarification

The project uses a **consistent URL pattern** across all languages:
- `/{lang}/compare/{slug}` for ALL languages
- This is consistent with blog (`/{lang}/blog/{slug}`) and Q&A (`/{lang}/qa/{slug}`)
- The slug contains the language suffix (e.g., `golden-mile-vs-nueva-andalucia-nl`)

The localized path prefixes (/nl/vergelijk/, /de/vergleich/) mentioned in requirements would require significant routing changes. The current pattern is SEO-acceptable and matches existing infrastructure.

---

## Implementation Order

1. **Phase 1**: Add language checkbox selection UI
2. **Phase 2**: Update generation mutation to use selected languages
3. **Phase 3**: Add batch progress indicator
4. **Phase 4**: Enhance manage tab with language coverage matrix
5. **Phase 5**: Add hreflang tags to ComparisonPage.tsx
6. **Phase 6**: Add language switcher to comparison pages
7. **Phase 7**: Enhance JSON-LD schema

---

## Testing Checklist

- [ ] Generate comparison with all 10 languages selected
- [ ] Verify each language article is created with correct content
- [ ] Check all 10 articles share the same `hreflang_group_id`
- [ ] Verify `translations` JSONB contains all 10 slugs
- [ ] View comparison page - verify hreflang tags in HTML source
- [ ] Click language switcher - navigate correctly between translations
- [ ] Check JSON-LD schema includes `workTranslation` links
- [ ] Test "Add Missing Languages" button on incomplete comparison
- [ ] Verify UTF-8 encoding for all languages (especially Hungarian, Finnish)
- [ ] Test mobile layout of language selector
