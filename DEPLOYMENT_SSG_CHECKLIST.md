# SSG Deployment Verification Checklist

## Pre-Deployment Local Testing

### 1. Build Verification
```bash
# Clean and build
npm run build
```

**Expected Output:**
```
✓ building for production...
✓ 1234 modules transformed
✓ built in 45.67s
📄 Generating static pages...
✨ Static generation complete! ✅ Generated: 5 pages
```

### 2. Check Static Files Exist
```bash
# List all generated static HTML files
ls -la dist/blog/*/index.html

# Should show files like:
# dist/blog/your-essential-checklist-for-internet-mobile-in-a-new-build-home-on-the-costa-del-sol/index.html
# dist/blog/mobile-reception-on-the-costa-del-sol-a-guide-for-expats-and-homebuyers-in-new-complexes/index.html
```

### 3. Verify Content in HTML
```bash
# Pick any article and check content
cat dist/blog/mobile-reception-on-the-costa-del-sol-a-guide-for-expats-and-homebuyers-in-new-complexes/index.html | grep "article-content" -A 5

# Should show actual article content, not just <div id="root"></div>
```

### 4. Verify Schemas Present
```bash
# Check for JSON-LD schemas
cat dist/blog/mobile-reception-on-the-costa-del-sol-a-guide-for-expats-and-homebuyers-in-new-complexes/index.html | grep "application/ld+json" -A 20

# Should show multiple schema objects:
# - BlogPosting (Article)
# - BreadcrumbList
# - FAQPage (if article has FAQs)
```

### 5. Run Verification Script
```bash
npm run verify-ssg
```

**Expected Output:**
```
🔍 Verifying SSG deployment...
✅ All 5 articles have valid static pages
📊 Schema validation: 5/5 passed
```

### 6. Local Preview Test
```bash
npm run preview
```

Then visit: `http://localhost:4173/blog/[any-slug]`

**Checklist:**
- [ ] Page loads immediately (no spinner)
- [ ] Content visible in "View Page Source"
- [ ] No console errors
- [ ] React hydration works smoothly

---

## Deployment Process

### 1. Commit Changes
```bash
git add .
git commit -m "chore: deploy SSG implementation"
git push origin main
```

### 2. Trigger Lovable Deployment
- In Lovable dashboard, click "Publish" button (top right)
- Wait for build to complete (5-10 minutes)
- Monitor build logs

### 3. Build Success Indicators
Look for these messages in build logs:
- ✅ "📄 Generating static pages..."
- ✅ "✨ Static generation complete! ✅ Generated: X pages"
- ✅ No errors in static generation

---

## Post-Deployment Verification

### Test 1: View Source Test 🔍
**Time:** 2 minutes

**Steps:**
1. Visit 3 random published articles on production domain
2. Right-click → "View Page Source" (or `Ctrl+U` / `Cmd+Option+U`)
3. Search for `<article class="article-content"`

**✅ Success Criteria:**
- Full article HTML visible (not just `<div id="root"></div>`)
- Article content includes headings, paragraphs, lists
- Meta tags visible in `<head>` section
- JSON-LD schemas visible in `<head>`

**❌ Failure Indicators:**
- Only `<div id="root"></div>` visible
- No article content in HTML
- Schemas missing from `<head>`

---

### Test 2: Google Rich Results Test 🔍
**Time:** 5 minutes

**Steps:**
1. Go to: https://search.google.com/test/rich-results
2. Enter 3 article URLs from production
3. Click "Test URL"
4. Wait for results

**✅ Success Criteria:**
- All schemas validate successfully:
  - ✅ BlogPosting (Article schema)
  - ✅ BreadcrumbList
  - ✅ FAQPage (if article has FAQs)
  - ✅ Organization (publisher)
- No errors shown
- Preview displays article correctly

**⚠️ Acceptable Warnings:**
- Missing recommended fields (e.g., "image caption")
- Non-critical schema suggestions

**❌ Critical Errors:**
- Schema parsing errors
- Missing required fields
- Invalid structured data

---

### Test 3: Curl Tests (Simulate Bots) 🔍
**Time:** 3 minutes

#### 3a. Googlebot Simulation
```bash
curl -A "Googlebot" https://www.delsolprimehomes.com/blog/mobile-reception-on-the-costa-del-sol-a-guide-for-expats-and-homebuyers-in-new-complexes | grep "application/ld+json" -A 20
```

**✅ Success:** Returns JSON-LD schemas

#### 3b. GPTBot (ChatGPT) Simulation
```bash
curl -A "GPTBot" https://www.delsolprimehomes.com/blog/beyond-the-beaches-uncovering-the-lifestlye-investment-appeal-of-the-costa-del-sol-for-digital-nomads | grep -i "article-content" -A 10
```

**✅ Success:** Returns full article content

#### 3c. Claude Bot Simulation
```bash
curl -A "Claude-Web" https://www.delsolprimehomes.com/blog/your-essential-checklist-for-internet-mobile-in-a-new-build-home-on-the-costa-del-sol | grep -i "<article" -A 15
```

**✅ Success:** Returns article HTML

---

### Test 4: Lighthouse SEO Audit 🔍
**Time:** 5 minutes per article

**Steps:**
1. Open Chrome DevTools (`F12`)
2. Go to "Lighthouse" tab
3. Select categories: "SEO", "Performance", "Accessibility"
4. Click "Generate report"
5. Test 3 articles

**✅ Target Scores:**
- SEO: **95-100**
- Performance: **85+**
- Accessibility: **90+**
- Best Practices: **90+**

**Key Checks:**
- [ ] Structured data is valid
- [ ] Meta description present
- [ ] Title tag present and unique
- [ ] Hreflang tags present (for translations)
- [ ] Canonical URL correct
- [ ] Images have alt attributes
- [ ] Content is readable

---

### Test 5: Schema Validator 🔍
**Time:** 3 minutes

**Steps:**
1. Go to: https://validator.schema.org/
2. Enter article URL
3. Click "Run Test"

**✅ Success Criteria:**
- No errors
- All schemas detected:
  - BlogPosting
  - BreadcrumbList
  - FAQPage (if applicable)
  - Organization

**⚠️ Warnings OK:**
- Missing recommended properties
- Additional type suggestions

---

### Test 6: Mobile Responsiveness Test 🔍
**Time:** 3 minutes

**Steps:**
1. Open Chrome DevTools (`F12`)
2. Click "Toggle device toolbar" (or `Ctrl+Shift+M`)
3. Select "iPhone 12 Pro" or "Pixel 5"
4. Visit article page

**✅ Success Criteria:**
- [ ] Content loads immediately (no spinner)
- [ ] Text is readable without zooming
- [ ] Images scale properly
- [ ] Navigation works smoothly
- [ ] React hydration happens seamlessly

---

### Test 7: Production Network Tab Test 🔍
**Time:** 2 minutes

**Steps:**
1. Open Chrome DevTools → Network tab
2. Visit article page
3. Look at initial HTML document request

**✅ Success Criteria:**
- HTML document size: **50-150 KB** (not ~5 KB)
- Response contains article content in preview
- Status code: **200 OK**
- Content-Type: `text/html`

---

## Automated Verification

### Run Verification Script on Production
```bash
npm run verify-ssg
```

This script checks:
- ✅ All published articles have static HTML files
- ✅ Each file contains JSON-LD schemas
- ✅ Each file contains article content
- ✅ Meta tags are present
- ✅ Hreflang links exist (for translations)
- ✅ Canonical URLs are correct

---

## Troubleshooting

### Issue: Static pages not generating

**Symptoms:**
- `dist/blog/` folder empty or missing
- Build logs don't show "Generating static pages..."

**Solutions:**
1. Check `NODE_ENV` is set to `production`:
   ```bash
   echo $NODE_ENV
   # Should output: production
   ```

2. Verify Supabase connection in build:
   ```bash
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_PUBLISHABLE_KEY
   ```

3. Check if articles are published:
   ```sql
   SELECT slug, status FROM blog_articles WHERE status = 'published';
   ```

4. Review `scripts/generateStaticPages.ts` for errors

---

### Issue: Content not in "View Source"

**Symptoms:**
- Only `<div id="root"></div>` visible
- Article content loads after page loads (via JS)

**Solutions:**
1. Clear browser cache and hard reload (`Ctrl+Shift+R`)
2. Verify static file exists:
   ```bash
   ls dist/blog/[slug]/index.html
   ```
3. Check server configuration (ensure it serves static HTML)
4. Verify Vite build output directory is `dist/`

---

### Issue: Schemas not validating

**Symptoms:**
- Google Rich Results Test shows errors
- Schema validator reports issues

**Solutions:**
1. Check schema validation in admin panel (Schema Health card)
2. Review `src/lib/schemaGenerator.ts` for schema generation logic
3. Verify article has required fields:
   - Title, slug, content, meta_description
   - Author information
   - Featured image
   - FAQ entries (for FAQ schema)

---

### Issue: React hydration errors

**Symptoms:**
- Console warnings: "Text content does not match"
- Page flickers on load

**Solutions:**
1. Ensure static HTML structure matches React component
2. Check `data-article-id` attribute exists in pre-rendered HTML
3. Verify server doesn't modify HTML before serving
4. Review `src/pages/BlogArticle.tsx` hydration logic

---

### Issue: Build succeeds but pages not deployed

**Symptoms:**
- Build logs show success
- But changes not visible on production

**Solutions:**
1. Check deployment status in Lovable dashboard
2. Verify deployment completed (not still in progress)
3. Clear CDN cache (if using CDN)
4. Wait 5-10 minutes for propagation
5. Check domain DNS settings

---

## Success Metrics

After successful deployment:

**Indexing Speed:**
- ✅ Before: 21-35 days
- ✅ After: 3-7 days

**Initial HTML Size:**
- ✅ Before: ~5 KB (empty shell)
- ✅ After: 50-150 KB (full content)

**SEO Scores:**
- ✅ Lighthouse SEO: 95-100
- ✅ Schema validation: Pass
- ✅ Rich results: FAQ, Breadcrumbs

**Performance:**
- ✅ Content visible immediately (0s)
- ✅ Time to First Byte: <500ms
- ✅ Largest Contentful Paint: <2.5s

---

## Next Steps

1. **Monitor Google Search Console:**
   - Check indexing coverage
   - Monitor for crawl errors
   - Track impressions and clicks

2. **Submit Sitemap:**
   ```
   https://www.delsolprimehomes.com/sitemap.xml
   ```

3. **Request Reindexing:**
   - Use "URL Inspection" tool in Search Console
   - Request indexing for updated articles

4. **Set Up Weekly Checks:**
   - Run `npm run verify-ssg`
   - Check Lighthouse scores
   - Monitor schema validation

5. **Plan Automated Rebuilds:**
   - Use "Rebuild Site" button in Admin Dashboard
   - Or set up webhook for auto-rebuild on publish
