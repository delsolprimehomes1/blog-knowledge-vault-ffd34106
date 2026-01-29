
# Fix and Optimize Sitemap Generation System

## Executive Summary

The project already has a **robust sitemap system** with:
- **Edge function** (`regenerate-sitemap`) that generates XML dynamically from database
- **Build script** (`scripts/generateSitemap.ts`) for static generation during deployment
- **Admin UI** (`SitemapRegenerator.tsx`) with regeneration, download, and IndexNow ping
- **Database triggers** (`notify_sitemap_ping`) that auto-ping IndexNow on publish
- **Storage integration** uploading to `sitemaps` bucket
- **Gone URL filtering** to exclude 410 pages

### Current Content Volume
| Content Type | Published Count |
|-------------|-----------------|
| Blog Articles | 3,271 |
| Q&A Pages | 9,600 |
| Comparison Pages | 47 |
| Location Pages | 198 |
| Properties | 12 |
| City Brochures | 10 |
| **Total** | **~13,138** |

### Current Structure
```
/sitemap-index.xml (master)
├── /sitemaps/en/blog.xml
├── /sitemaps/en/qa.xml
├── /sitemaps/en/locations.xml
├── /sitemaps/en/comparisons.xml
├── ... (×10 languages)
├── /sitemaps/glossary.xml
└── /sitemaps/brochures.xml
```

### What's Missing (per requirements)
1. **Properties sitemap** with image extensions
2. **Static pages sitemap** with hreflang for 10 languages (home, about, contact, buyers-guide)
3. **New-builds sitemap** (if applicable)
4. **Enhanced admin dashboard** with validation status and per-sitemap regeneration
5. **Automatic caching** with 6-hour TTL
6. **Robots.txt update** - currently points to `/sitemap-index.xml` not `/sitemap.xml`

---

## Phase 1: Rename Master Sitemap to /sitemap.xml

### Current Issue
- `robots.txt` references `/sitemap-index.xml`
- Google standard expects `/sitemap.xml`

### Fix
Update both generation scripts and `robots.txt` to consistently use `/sitemap.xml` as the primary entry point (currently already copies to both, but naming needs standardization).

**Files to modify:**
- `public/robots.txt` - Change `Sitemap: .../sitemap-index.xml` to `Sitemap: .../sitemap.xml`

---

## Phase 2: Add Properties Sitemap with Image Extensions

### New sitemap: `/sitemaps/properties.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://www.delsolprimehomes.com/properties/{internal_ref}</loc>
    <lastmod>2026-01-29</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>https://.../image1.jpg</image:loc>
      <image:title>Property Title - Image 1</image:title>
    </image:image>
    <!-- More images -->
  </url>
</urlset>
```

**Implementation:**
- Query `properties` table where `is_active = true`
- Extract images from `images` JSONB column
- Generate image sitemap extension for each property

**Files to modify:**
- `scripts/generateSitemap.ts` - Add `generatePropertiesSitemap()` function
- `supabase/functions/regenerate-sitemap/index.ts` - Add properties generation

---

## Phase 3: Add Static Pages Sitemap with Hreflang

### New sitemap: `/sitemaps/pages.xml`

Static pages need hreflang for all 10 languages:
- Homepage: `/`, `/{lang}/`
- About: `/about`, `/{lang}/about-us`
- Contact: `/{lang}/contact`
- Buyers Guide: `/guide`, `/{lang}/buyers-guide`
- Team: `/{lang}/team`
- Glossary: `/glossary`, `/{lang}/glossary`

```xml
<url>
  <loc>https://www.delsolprimehomes.com/en</loc>
  <lastmod>2026-01-29</lastmod>
  <changefreq>daily</changefreq>
  <priority>1.0</priority>
  <xhtml:link rel="alternate" hreflang="en-GB" href="https://www.delsolprimehomes.com/en" />
  <xhtml:link rel="alternate" hreflang="de-DE" href="https://www.delsolprimehomes.com/de" />
  <xhtml:link rel="alternate" hreflang="nl-NL" href="https://www.delsolprimehomes.com/nl" />
  <!-- ... all 10 languages + x-default -->
</url>
```

**Files to modify:**
- `scripts/generateSitemap.ts` - Add `generateStaticPagesSitemap()` 
- `supabase/functions/regenerate-sitemap/index.ts` - Add static pages generation

---

## Phase 4: Enhanced Admin Dashboard

### Current UI
The `SitemapRegenerator.tsx` shows:
- Total URLs, content counts, language breakdown
- Regenerate button, Download ZIP, Ping IndexNow

### Enhancements Required
1. **Per-sitemap table with details:**
   - File name, URL count, last modified, size
   - Individual "Regenerate" button per sitemap
   - Validation status (✅ Valid / ⚠️ Issues)

2. **Validation panel:**
   - Check for 404/410/redirect URLs in sitemap
   - Flag URLs exceeding 50,000 limit per file
   - XML syntax validation

3. **Quick actions:**
   - "Validate All" button
   - "Submit to GSC" links (external to Google Search Console)
   - Last ping timestamps per search engine

**Files to modify:**
- `src/components/admin/SitemapRegenerator.tsx` - Add per-sitemap table with actions

---

## Phase 5: Add Caching with 6-Hour TTL

### Current State
- Build script generates static files during deployment
- Edge function regenerates on demand and uploads to storage
- `_headers` sets 5-minute cache (`max-age=300`)

### Enhancement
1. **Storage-based caching:**
   - Store `last_regenerated_at` timestamp in `content_settings` table
   - Edge function checks timestamp; if < 6 hours old, serve from storage
   - Force regeneration option bypasses cache

2. **Auto-regeneration trigger:**
   - Already exists via `notify_sitemap_ping` database trigger
   - Enhance to batch updates (debounce multiple publishes within 5 minutes)

**Files to modify:**
- `supabase/functions/regenerate-sitemap/index.ts` - Add cache check logic
- Database: Store regeneration timestamp

---

## Phase 6: Update robots.txt

### Current
```
Sitemap: https://www.delsolprimehomes.com/sitemap-index.xml
```

### Updated (Single Entry)
```
Sitemap: https://www.delsolprimehomes.com/sitemap.xml
```

Remove redundant per-language sitemap references (Google follows the index automatically).

**Files to modify:**
- `public/robots.txt`

---

## Phase 7: Ensure Valid XML Generation

### Validation Requirements
1. **Escape special characters** in URLs (already handled)
2. **No 404/410/redirect URLs** (already filtered via `gone_urls` table)
3. **UTF-8 encoding** (already specified in XML header)
4. **Max 50,000 URLs per sitemap** (needs check for Q&A pages - currently 9,600, safe)

### URL Limit Check
| Sitemap | Current Count | Safe? |
|---------|---------------|-------|
| EN Blog | ~440 | ✅ |
| EN Q&A | ~960 | ✅ |
| All Q&A | 9,600 | ✅ (split by language) |

No pagination needed as largest per-language sitemap is well under 50,000.

---

## Files to Modify

| File | Changes |
|------|---------|
| `scripts/generateSitemap.ts` | Add `generatePropertiesSitemap()`, `generateStaticPagesSitemap()` |
| `supabase/functions/regenerate-sitemap/index.ts` | Add properties, static pages, cache check |
| `src/components/admin/SitemapRegenerator.tsx` | Add per-sitemap table, validation panel |
| `public/robots.txt` | Simplify to single sitemap entry |
| `public/_headers` | Optionally increase cache to 6 hours for sitemaps |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/SitemapValidationPanel.tsx` | Validation results display |
| `src/components/admin/SitemapFileTable.tsx` | Per-sitemap management table |

---

## Implementation Order

1. **Phase 1**: Update `robots.txt` to use `/sitemap.xml`
2. **Phase 2**: Add properties sitemap with image extensions
3. **Phase 3**: Add static pages sitemap with hreflang
4. **Phase 6**: Update master index to include new sitemaps
5. **Phase 4**: Enhance admin dashboard with per-sitemap management
6. **Phase 5**: Add caching mechanism

---

## Technical Details

### Properties Sitemap Generator Function

```typescript
function generatePropertiesSitemap(properties: PropertyData[]): string {
  const urls = properties.map(prop => {
    const images = (prop.images as { url: string }[]) || [];
    const imageXml = images.slice(0, 10).map(img => `
    <image:image>
      <image:loc>${escapeXml(img.url)}</image:loc>
      <image:title>${escapeXml(prop.internal_name)}</image:title>
    </image:image>`).join('');
    
    return `  <url>
    <loc>${BASE_URL}/properties/${prop.internal_ref}</loc>
    <lastmod>${formatDate(prop.updated_at)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>${imageXml}
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;
}
```

### Static Pages Sitemap Generator

```typescript
function generateStaticPagesSitemap(): string {
  const STATIC_PAGES = [
    { path: '', priority: 1.0, changefreq: 'daily' },      // homepage
    { path: 'about-us', priority: 0.8, changefreq: 'monthly' },
    { path: 'contact', priority: 0.7, changefreq: 'monthly' },
    { path: 'buyers-guide', priority: 0.9, changefreq: 'weekly' },
    { path: 'team', priority: 0.7, changefreq: 'monthly' },
    { path: 'glossary', priority: 0.7, changefreq: 'monthly' },
  ];

  const urls = STATIC_PAGES.flatMap(page => {
    return SUPPORTED_LANGUAGES.map(lang => {
      const url = page.path ? `${BASE_URL}/${lang}/${page.path}` : `${BASE_URL}/${lang}`;
      const hreflangLinks = SUPPORTED_LANGUAGES.map(l => {
        const href = page.path ? `${BASE_URL}/${l}/${page.path}` : `${BASE_URL}/${l}`;
        return `<xhtml:link rel="alternate" hreflang="${langToHreflang[l]}" href="${href}" />`;
      }).join('\n    ');
      
      return `  <url>
    <loc>${url}</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    ${hreflangLinks}
    <xhtml:link rel="alternate" hreflang="x-default" href="${page.path ? `${BASE_URL}/en/${page.path}` : `${BASE_URL}/en`}" />
  </url>`;
    });
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`;
}
```

---

## Updated Master Sitemap Index

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages (all languages) -->
  <sitemap><loc>https://www.delsolprimehomes.com/sitemaps/pages.xml</loc></sitemap>
  
  <!-- Properties with images -->
  <sitemap><loc>https://www.delsolprimehomes.com/sitemaps/properties.xml</loc></sitemap>
  
  <!-- Blog per language -->
  <sitemap><loc>https://www.delsolprimehomes.com/sitemaps/en/blog.xml</loc></sitemap>
  <!-- ... other languages -->
  
  <!-- Q&A per language -->
  <sitemap><loc>https://www.delsolprimehomes.com/sitemaps/en/qa.xml</loc></sitemap>
  <!-- ... other languages -->
  
  <!-- Locations per language -->
  <sitemap><loc>https://www.delsolprimehomes.com/sitemaps/en/locations.xml</loc></sitemap>
  
  <!-- Comparisons per language -->
  <sitemap><loc>https://www.delsolprimehomes.com/sitemaps/en/comparisons.xml</loc></sitemap>
  
  <!-- Brochures -->
  <sitemap><loc>https://www.delsolprimehomes.com/sitemaps/brochures.xml</loc></sitemap>
  
  <!-- Glossary -->
  <sitemap><loc>https://www.delsolprimehomes.com/sitemaps/glossary.xml</loc></sitemap>
</sitemapindex>
```

---

## Testing Checklist

- [ ] Master sitemap at `/sitemap.xml` is valid XML
- [ ] Properties sitemap includes image extensions
- [ ] Static pages sitemap has 11 hreflang tags per URL
- [ ] All URLs return 200 (no 404/410/redirects)
- [ ] No sitemap exceeds 50,000 URLs
- [ ] Admin dashboard shows per-sitemap details
- [ ] "Regenerate" button per sitemap works
- [ ] Validation panel detects issues
- [ ] robots.txt points to correct sitemap
- [ ] Auto-regeneration triggers on publish
- [ ] IndexNow ping fires after regeneration
