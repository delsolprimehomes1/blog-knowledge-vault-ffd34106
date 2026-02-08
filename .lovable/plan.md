

# Localize Blog Teaser by Current Language

## Problem Identified

The homepage Blog Teaser section is **hardcoded to fetch only English articles** regardless of which language the user is viewing. 

Looking at line 55 of `src/components/home/sections/ReviewsAndBlog.tsx`:
```typescript
.eq('language', 'en')  // ❌ Always English
```

This means French visitors (on `/fr/`) see English blog posts, Dutch visitors (on `/nl/`) see English blog posts, etc.

## Current State

| Element | Status |
|---------|--------|
| Section headers (eyebrow, headline) | ✅ Translated |
| "Visit Blog" button text | ✅ Translated |
| "Read Article" link text | ✅ Translated |
| **Blog article content** | ❌ **Always English** |
| Article date format | ⚠️ Always English format |

## Database Availability

All 10 languages have published articles available:
- English: 440 articles
- Dutch: 337 articles  
- German: 334 articles
- Polish: 324 articles
- Swedish: 323 articles
- French: 315 articles
- Hungarian: 311 articles
- Danish: 309 articles
- Norwegian: 298 articles
- Finnish: 280 articles

## Solution

### 1. Update Query to Use Current Language

Modify the `BlogTeaser` component to filter articles by `currentLanguage`:

```typescript
// Before
.eq('language', 'en')

// After  
.eq('language', currentLanguage)
```

### 2. Update Query Key to Include Language

Ensure React Query refetches when language changes:

```typescript
// Before
queryKey: ['homepage-blog-articles']

// After
queryKey: ['homepage-blog-articles', currentLanguage]
```

### 3. Add Fallback to English (Optional Safety)

If no articles exist for the current language, fall back to English articles:

```typescript
const { data: articles, isLoading } = useQuery({
  queryKey: ['homepage-blog-articles', currentLanguage],
  queryFn: async () => {
    // First try current language
    let { data, error } = await supabase
      .from('blog_articles')
      .select('...')
      .eq('status', 'published')
      .eq('language', currentLanguage)
      .order('date_published', { ascending: false })
      .limit(3);
    
    // Fallback to English if no articles in current language
    if (!error && (!data || data.length === 0) && currentLanguage !== 'en') {
      const fallback = await supabase
        .from('blog_articles')
        .select('...')
        .eq('status', 'published')
        .eq('language', 'en')
        .order('date_published', { ascending: false })
        .limit(3);
      data = fallback.data;
    }
    
    if (error) throw error;
    return data;
  },
});
```

### 4. Add Localized Date Formatting (Enhancement)

Format dates in the user's language using date-fns locales:

```typescript
import { 
  enUS, nl, de, fr, pl, sv, da, hu, fi, nb 
} from 'date-fns/locale';

const dateLocales: Record<string, Locale> = {
  en: enUS, nl, de, fr, pl, sv, da, hu, fi, no: nb
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy', {
      locale: dateLocales[currentLanguage] || enUS
    });
  } catch {
    return '';
  }
};
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/home/sections/ReviewsAndBlog.tsx` | Update query filter, query key, add fallback logic, and localized date formatting |

## Result After Implementation

- French homepage → French blog articles
- Dutch homepage → Dutch blog articles  
- All other languages → Articles in matching language
- Fallback → English articles if none exist in user's language
- Dates formatted in the user's language (e.g., "Jan 13, 2026" → "13 janv. 2026" in French)

