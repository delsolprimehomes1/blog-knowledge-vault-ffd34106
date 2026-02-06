
# Comprehensive Website Link Audit Plan

## Executive Summary

This plan creates a **Unified Link Audit System** to confirm there are no broken links on your website and that all links are active and responsive. The audit will cover:

- Internal content links (blog, Q&A, comparisons, locations)
- External authority/citation links
- Navigation links (header, footer, CTAs)
- Social media links

---

## Current State Analysis

### Existing Link Infrastructure
| Tool | Purpose | Last Run |
|------|---------|----------|
| `/admin/broken-links` | Internal link validation | Jan 30, 2026 (0 broken found) |
| `/admin/redirect-checker` | Detect redirect URLs | Available |
| `/admin/production-audit` | Live site SEO checks | Available |

### Content with Links
| Content Type | Total Published | With Internal Links |
|--------------|-----------------|---------------------|
| Blog Articles | 3,271 | 517 |
| Q&A Pages | 9,600 | 9,600 |
| Comparison Pages | 47 | 47 |
| Gone URLs (410) | 800 | N/A |

---

## Proposed Solution

### Phase 1: Create Comprehensive Link Audit Dashboard

A new `/admin/link-audit` page that consolidates all link checking into one view:

**Section 1: Internal Links**
- Run existing broken link scanner across all content types
- Show results grouped by content type
- Quick-fix actions (remove link, mark as 410)

**Section 2: External Links Health**
- Scan all published content for external URLs
- HTTP HEAD request to verify each returns 200/301/302
- Flag any 4xx/5xx responses
- Track authority domain health (gov.es, notaries.es, etc.)

**Section 3: Navigation Links**
- Audit all hardcoded links in footer, CTAs, and navigation
- Verify routes exist in React Router
- Check external links (social media, Google reviews)

**Section 4: Summary Dashboard**
- Total links audited
- Healthy vs broken percentage
- Links by status (200, 301, 404, 410, timeout)
- Last scan timestamp

---

## Technical Implementation

### 1. New Edge Function: `audit-all-links`

```text
Input: { 
  scanTypes: ['internal', 'external', 'navigation'],
  contentTypes: ['blog', 'qa', 'comparison', 'location'],
  sampleSize?: number // for large datasets
}

Process:
1. Query all published content with links
2. Extract internal links from internal_links JSONB
3. Extract external links from content body
4. HTTP HEAD request to each unique URL
5. Record results in audit_results table

Output: {
  total_links: number,
  healthy: number,
  broken: number,
  redirects: number,
  timeouts: number,
  results: LinkResult[]
}
```

### 2. New Database Table: `link_audit_results`

```sql
CREATE TABLE link_audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL,
  link_url TEXT NOT NULL,
  link_type TEXT, -- 'internal' | 'external' | 'navigation'
  source_type TEXT, -- 'blog' | 'qa' | 'footer' | 'cta'
  source_id UUID,
  source_slug TEXT,
  http_status INTEGER,
  response_time_ms INTEGER,
  is_broken BOOLEAN,
  checked_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. New Admin Page: `/admin/link-audit`

**Dashboard Layout:**
- Summary cards (Total, Healthy, Broken, Redirects)
- Progress bar during scan
- Tabs for Internal/External/Navigation
- Bulk actions (Remove all broken, Export CSV)

---

## Navigation Links to Audit

### Footer Links (src/components/home/Footer.tsx)
| Link | Destination | Type |
|------|-------------|------|
| Properties | `/{lang}/properties` | Internal |
| Locations | `/{lang}/locations` | Internal |
| About | `/about` | Internal |
| Buyers Guide | `/{lang}/buyers-guide` | Internal |
| Blog | `/{lang}/blog` | Internal |
| Glossary | `/{lang}/glossary` | Internal |
| Comparisons | `/{lang}/compare` | Internal |
| Contact | `/{lang}/contact` | Internal |
| Dashboard | `/crm/agent/login` | Internal |
| Privacy | `/privacy` | Internal |
| Terms | `/terms` | Internal |

### Social Links
| Platform | URL | Status Check |
|----------|-----|--------------|
| Facebook | facebook.com/delsolprimehomes | HEAD request |
| Instagram | instagram.com/delsolprimehomes | HEAD request |
| LinkedIn | linkedin.com/company/delsolprimehomes | HEAD request |
| Google Reviews | Google My Business link | HEAD request |

---

## Audit Execution Steps

1. **Run Internal Link Scan**
   - Use existing `/admin/broken-links` tool
   - Select all content types (blog, QA, comparison, location)
   - Export results

2. **Run External Link Scan**
   - New scanner for external URLs in content
   - Sample 100-200 articles for efficiency
   - Focus on authority domains

3. **Verify Navigation Links**
   - Automated check of all footer/header links
   - Verify React routes exist
   - Test external social links

4. **Generate Report**
   - Export comprehensive CSV
   - Dashboard summary
   - Action items for any broken links

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/admin/LinkAudit.tsx` | Create | Unified audit dashboard |
| `supabase/functions/audit-all-links/index.ts` | Create | Comprehensive link scanner |
| `src/components/AdminLayout.tsx` | Modify | Add menu item |
| `src/App.tsx` | Modify | Add route |

---

## Quick Win: Run Existing Tools Now

Before building the new system, you can run the existing tools:

1. **Go to `/admin/broken-links`**
   - Enable all content types
   - Click "Scan Content"
   - Review any broken internal links

2. **Go to `/admin/production-audit`**
   - Run full audit
   - Check "External Citations" section
   - Review any broken authority links

3. **Manual Navigation Check**
   - Test each footer link manually
   - Verify social links open correctly

---

## Timeline Estimate

| Phase | Duration |
|-------|----------|
| Run existing tools | 15 minutes |
| Create new audit edge function | 2 hours |
| Create unified dashboard | 3 hours |
| Full site audit | 30 minutes |
| **Total** | **~6 hours** |
