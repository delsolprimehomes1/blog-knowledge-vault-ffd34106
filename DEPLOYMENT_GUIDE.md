# Deployment Guide - Del Sol Prime Homes CMS

## Overview

This guide covers the production deployment of the Del Sol Prime Homes blog CMS, including GitHub integration, Cloudflare Worker setup, and final testing procedures.

## Architecture

```
┌─────────────────────────────────────────┐
│    delsolprimehomes.com (Root Domain)   │
└─────────────────────────────────────────┘
                  ↓
         Cloudflare Worker
                  ↓
        ┌─────────┴─────────┐
        ↓                   ↓
  Webflow (/)          React App (/blog)
  Main Website         Blog & CMS
```

## Phase 1: GitHub Integration

### 1. Connect Repository

1. **In Lovable:**
   - Click GitHub icon in top right
   - Click "Connect to GitHub"
   - Authorize Lovable GitHub App
   - Select organization/account
   - Click "Create Repository"
   - Repository name: `delsol-blog-cms`

2. **Verify Connection:**
   - Changes in Lovable auto-push to GitHub
   - Commits from GitHub auto-sync to Lovable
   - Check bidirectional sync is working

### 2. Configure Auto-Deploy

The Lovable project automatically deploys when:
- Code is pushed to the main branch
- Content is published through the CMS
- Changes are made in the Lovable editor

## Phase 2: Cloudflare Pages Setup

### 1. Create Cloudflare Pages Project

```bash
# From your GitHub repository
1. Log in to Cloudflare Dashboard
2. Go to Pages
3. Click "Create a project"
4. Select GitHub repository: delsol-blog-cms
5. Configure build settings:
   - Framework preset: Vite
   - Build command: npm run build
   - Build output directory: dist
6. Add environment variables:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PUBLISHABLE_KEY
   - VITE_SUPABASE_PROJECT_ID
```

### 2. Configure Custom Domain

```bash
# In Cloudflare Pages
1. Go to Custom domains
2. Add domain: blog.delsolprimehomes.com
3. Cloudflare will auto-configure DNS
4. Wait for SSL certificate (2-5 minutes)
```

## Phase 3: Cloudflare Worker Setup

### 1. Create Worker for Routing

```javascript
// worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Route blog paths to React app
    if (url.pathname.startsWith('/blog') || 
        url.pathname.startsWith('/admin') ||
        url.pathname.startsWith('/auth')) {
      return fetch(`https://blog.delsolprimehomes.com${url.pathname}${url.search}`);
    }
    
    // Route everything else to Webflow
    return fetch(`https://delsolprimehomes.webflow.io${url.pathname}${url.search}`);
  }
}
```

### 2. Deploy Worker

```bash
# Using Wrangler CLI
npm install -g wrangler
wrangler login
wrangler init delsol-router
# Paste worker code above
wrangler publish
```

### 3. Configure Route

```bash
# In Cloudflare Dashboard
1. Go to Workers & Pages
2. Select your worker
3. Add route: delsolprimehomes.com/*
4. Set to trigger on all requests
```

## Phase 4: DNS Configuration

### Update DNS Records

```dns
# A Records (if using Cloudflare Pages directly)
@    A    192.0.2.1   (Cloudflare proxy enabled)
www  A    192.0.2.1   (Cloudflare proxy enabled)

# CNAME Record (if using subdomain)
blog  CNAME  delsol-blog-cms.pages.dev  (Cloudflare proxy enabled)
```

## Phase 5: Testing Procedures

### Pre-Launch Testing Checklist

#### Content Testing
- [ ] Create article in English
- [ ] Create translations in 8 other languages
- [ ] Link all translations together
- [ ] Verify hreflang tags in page source
- [ ] Test all 9 language selectors work

#### Blog Index Testing
- [ ] Test category filter (all 6 categories)
- [ ] Test language filter (all 9 languages)
- [ ] Test search functionality
- [ ] Test pagination (if >20 articles)
- [ ] Verify article count updates correctly
- [ ] Test filter combinations

#### Funnel Testing
- [ ] Create TOFU article
- [ ] Create MOFU article
- [ ] Create BOFU article
- [ ] Verify chatbot only shows on BOFU
- [ ] Test chatbot conversation flow
- [ ] Verify form submission to Supabase

#### Schema Validation
- [ ] Run Google Rich Results Test on 3 articles
- [ ] Verify ArticleSchema valid
- [ ] Verify FAQSchema valid (if FAQ present)
- [ ] Verify BreadcrumbSchema valid
- [ ] Check no schema errors

#### Performance Testing
- [ ] Run Lighthouse on 10 sample articles
- [ ] Verify LCP < 2.5s
- [ ] Verify FID < 100ms
- [ ] Verify CLS < 0.1
- [ ] Check all images load properly
- [ ] Test on mobile device (real device)
- [ ] Test on tablet device
- [ ] Test on desktop (multiple browsers)

#### SEO Testing
- [ ] Verify robots.txt accessible
- [ ] Verify sitemap.xml generates correctly
- [ ] Check canonical URLs correct
- [ ] Verify Open Graph tags
- [ ] Verify Twitter Card tags
- [ ] Test social sharing preview

#### Link Testing
- [ ] Test 5 internal links
- [ ] Verify external links open in new tab
- [ ] Check all internal links go to correct pages
- [ ] Verify external links have rel="noopener noreferrer"

#### E-E-A-T Testing
- [ ] Verify author bio displays
- [ ] Check author LinkedIn link works
- [ ] Verify reviewer badge shows (if present)
- [ ] Check credentials display properly

#### Admin Testing
- [ ] Test login/logout flow
- [ ] Create new article as draft
- [ ] Publish article
- [ ] Edit published article
- [ ] Verify audit trail (who published)
- [ ] Test image upload
- [ ] Test export functionality

### Post-Launch Monitoring

#### First 24 Hours
- Monitor error logs in Cloudflare
- Check Supabase database activity
- Verify article views in analytics
- Monitor chatbot conversations

#### First Week
- Run daily Lighthouse audits
- Check search console for errors
- Monitor sitemap indexing
- Review user feedback

## Phase 6: SEO Submission

### Google Search Console

```bash
1. Add property: https://www.delsolprimehomes.com
2. Verify ownership via DNS
3. Submit sitemap: https://www.delsolprimehomes.com/sitemap.xml
4. Request indexing for 10 key articles
5. Monitor coverage report
```

### Bing Webmaster Tools

```bash
1. Add site: https://www.delsolprimehomes.com
2. Verify ownership
3. Submit sitemap
4. Enable URL inspection
```

## Phase 7: Backup Strategy

### Automated Backups

```javascript
// Supabase Automated Backups (via dashboard)
1. Go to Supabase project settings
2. Enable daily backups
3. Retain 7 days of backups
4. Set backup time to 2 AM UTC
```

### Manual Backups

```bash
# Weekly manual export schedule
Monday: Complete backup via /admin/export
Store in: Google Drive/delsol-backups/
Keep: Last 4 weeks of backups
```

## Troubleshooting

### Common Issues

**Articles not showing on blog index**
- Check article status is "published"
- Verify RLS policies allow public read
- Check date_published is set

**Images not loading**
- Verify Supabase storage bucket is public
- Check image URLs are correct
- Verify CORS settings in Supabase

**Chatbot not appearing**
- Confirm article funnel_stage is "BOFU"
- Check JavaScript console for errors
- Verify Supabase connection

**404 on blog routes**
- Check Cloudflare Worker is active
- Verify route configuration
- Check DNS propagation

**Slow page loads**
- Run Lighthouse audit
- Check image sizes
- Verify code splitting is working
- Check Cloudflare caching

## Environment Variables

### Production Environment

```bash
VITE_SUPABASE_URL=https://kazggnufaoicopvmwhdl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
VITE_SUPABASE_PROJECT_ID=kazggnufaoicopvmwhdl
```

**Security Note**: Never commit .env files to repository. Use Cloudflare Pages environment variables instead.

## Rollback Procedure

### If deployment fails:

1. **Immediate Rollback:**
   ```bash
   # In Cloudflare Pages
   1. Go to Deployments
   2. Find last working deployment
   3. Click "Rollback to this deployment"
   ```

2. **Verify Rollback:**
   - Test blog index loads
   - Test one article loads
   - Test admin panel accessible

3. **Investigate Issue:**
   - Check build logs
   - Review recent commits
   - Test locally with production env

## Success Criteria

Deployment is successful when:
- ✅ All routes resolve correctly
- ✅ Blog index shows published articles
- ✅ Article pages load without errors
- ✅ Admin panel requires authentication
- ✅ Lighthouse score 95+ on sample pages
- ✅ All Core Web Vitals pass
- ✅ Sitemap accessible and valid
- ✅ robots.txt accessible
- ✅ No console errors
- ✅ Mobile responsive
- ✅ Chatbot works on BOFU articles

## Support Contacts

**Technical Issues:**
- Lovable Support: [support link]
- Supabase Support: [support link]
- Cloudflare Support: [support link]

**Content/CMS Issues:**
- Refer to ADMIN_GUIDE.md
- Check SCHEMA_DOCUMENTATION.md

## Post-Deployment Tasks

1. **Week 1:**
   - Monitor analytics daily
   - Review error logs
   - Test on various devices
   - Gather user feedback

2. **Month 1:**
   - Review performance metrics
   - Optimize slow pages
   - Update documentation as needed
   - Train additional admins

3. **Ongoing:**
   - Monthly content audits
   - Weekly backups
   - Quarterly performance reviews
   - Security updates as needed

---

## Ready for Production Checklist

Before going live:
- [ ] All testing procedures completed
- [ ] Backups configured
- [ ] DNS updated
- [ ] SSL certificate active
- [ ] Admin accounts created
- [ ] Documentation reviewed
- [ ] Rollback plan tested
- [ ] Monitoring enabled
- [ ] Search console configured
- [ ] Team trained

**Status: READY FOR PRODUCTION** ✅
