import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCTION_URL = 'https://www.delsolprimehomes.com';
const SUPPORTED_LANGUAGES = ['en', 'de', 'es', 'fr', 'nl', 'pl', 'hu', 'sv', 'da', 'fi'];

interface Issue {
  page: string;
  problem: string;
  details: string;
  severity: 'critical' | 'warning' | 'info';
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warning';
  severity: 'critical' | 'warning' | 'info';
  pages_tested: number;
  issues_found: number;
  issues: Issue[];
  details?: Record<string, any>;
}

interface FetchResult {
  html: string;
  status: number;
  ttfb: number;
  url: string;
}

// Fetch HTML with timeout and error handling
async function fetchPageHTML(url: string, timeout = 10000): Promise<FetchResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const ttfb = Date.now() - start;
    const html = await response.text();
    return { html, status: response.status, ttfb, url };
  } catch (error) {
    clearTimeout(timeoutId);
    return { html: '', status: 0, ttfb: Date.now() - start, url };
  }
}

// Extract hreflang tags from HTML
function extractHreflangTags(html: string): { lang: string; url: string }[] {
  const tags: { lang: string; url: string }[] = [];
  
  // Match both orderings: rel before hreflang and hreflang before rel
  const regex1 = /<link[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi;
  const regex2 = /<link[^>]*hreflang=["']([^"']+)["'][^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi;
  const regex3 = /<link[^>]*href=["']([^"']+)["'][^>]*hreflang=["']([^"']+)["'][^>]*rel=["']alternate["'][^>]*\/?>/gi;
  
  let match;
  while ((match = regex1.exec(html)) !== null) {
    tags.push({ lang: match[1], url: match[2] });
  }
  while ((match = regex2.exec(html)) !== null) {
    tags.push({ lang: match[1], url: match[2] });
  }
  while ((match = regex3.exec(html)) !== null) {
    tags.push({ lang: match[2], url: match[1] });
  }
  
  // Deduplicate
  const seen = new Set<string>();
  return tags.filter(tag => {
    const key = `${tag.lang}:${tag.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Extract canonical URL from HTML
function extractCanonical(html: string): string | null {
  const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (match) return match[1];
  
  const match2 = html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*\/?>/i);
  return match2 ? match2[1] : null;
}

// Extract html lang attribute
function extractHtmlLang(html: string): string | null {
  const match = html.match(/<html[^>]*lang=["']([^"']+)["'][^>]*>/i);
  return match ? match[1].split('-')[0].toLowerCase() : null;
}

// Extract JSON-LD schemas
function extractSchemas(html: string): any[] {
  const schemas: any[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        schemas.push(...parsed);
      } else {
        schemas.push(parsed);
      }
    } catch (e) {
      // Invalid JSON
    }
  }
  
  return schemas;
}

// Extract og:locale
function extractOgLocale(html: string): string | null {
  const match = html.match(/<meta[^>]*property=["']og:locale["'][^>]*content=["']([^"']+)["'][^>]*\/?>/i);
  if (match) return match[1].split('_')[0].toLowerCase();
  
  const match2 = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:locale["'][^>]*\/?>/i);
  return match2 ? match2[1].split('_')[0].toLowerCase() : null;
}

// Extract meta robots
function extractMetaRobots(html: string): string | null {
  const match = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*\/?>/i);
  return match ? match[1].toLowerCase() : null;
}

// Extract internal links
function extractInternalLinks(html: string): string[] {
  const links: string[] = [];
  const regex = /href=["'](\/[^"'#]+)["']/gi;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    if (!match[1].includes('.') || match[1].includes('/blog/') || match[1].includes('/qa/')) {
      links.push(match[1]);
    }
  }
  
  return [...new Set(links)];
}

// Extract external links from content
function extractExternalLinks(html: string): string[] {
  const links: string[] = [];
  const regex = /href=["'](https?:\/\/(?!www\.delsolprimehomes\.com)[^"']+)["']/gi;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    links.push(match[1]);
  }
  
  return [...new Set(links)];
}

// Get language from URL path
function getLanguageFromUrl(url: string): string | null {
  const match = url.match(/\/(en|de|es|fr|nl|pl|hu|sv|da|fi)\//);
  return match ? match[1] : null;
}

// Check if URL is accessible
async function checkUrlStatus(url: string): Promise<number> {
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return response.status;
  } catch {
    return 0;
  }
}

// AUDIT FUNCTIONS

async function auditHreflang(pages: { url: string; html: string; type: string }[]): Promise<CheckResult> {
  const issues: Issue[] = [];
  let pagesWithHreflang = 0;
  
  for (const page of pages) {
    const tags = extractHreflangTags(page.html);
    
    if (tags.length === 0) {
      issues.push({
        page: page.url,
        problem: 'missing_hreflang',
        details: 'No hreflang tags found in page',
        severity: 'warning'
      });
      continue;
    }
    
    pagesWithHreflang++;
    const pageLang = getLanguageFromUrl(page.url);
    
    // Check x-default
    const xDefault = tags.find(t => t.lang === 'x-default');
    if (!xDefault) {
      issues.push({
        page: page.url,
        problem: 'missing_x_default',
        details: 'No x-default hreflang tag found',
        severity: 'warning'
      });
    } else if (!xDefault.url.includes('/en/')) {
      issues.push({
        page: page.url,
        problem: 'x_default_not_english',
        details: `x-default points to ${xDefault.url} instead of English version`,
        severity: 'warning'
      });
    }
    
    // Check self-reference
    const selfRef = tags.find(t => t.lang === pageLang);
    if (!selfRef) {
      issues.push({
        page: page.url,
        problem: 'missing_self_reference',
        details: `No hreflang tag for own language (${pageLang})`,
        severity: 'critical'
      });
    }
    
    // Check language prefix matches hreflang
    for (const tag of tags) {
      if (tag.lang === 'x-default') continue;
      
      const tagUrlLang = getLanguageFromUrl(tag.url);
      if (tagUrlLang && tagUrlLang !== tag.lang) {
        issues.push({
          page: page.url,
          problem: 'language_mismatch',
          details: `hreflang="${tag.lang}" points to URL with /${tagUrlLang}/ prefix`,
          severity: 'critical'
        });
      }
    }
    
    // Check bidirectional linking (sample 2 random alternates per page)
    const alternates = tags.filter(t => t.lang !== pageLang && t.lang !== 'x-default').slice(0, 2);
    for (const alt of alternates) {
      try {
        const altResult = await fetchPageHTML(alt.url, 5000);
        if (altResult.status !== 200) {
          issues.push({
            page: page.url,
            problem: 'hreflang_404',
            details: `hreflang URL ${alt.url} returns ${altResult.status}`,
            severity: 'critical'
          });
          continue;
        }
        
        const altTags = extractHreflangTags(altResult.html);
        const linksBack = altTags.some(t => {
          const normalizedOriginal = page.url.replace(/\/$/, '');
          const normalizedTag = t.url.replace(/\/$/, '');
          return normalizedOriginal === normalizedTag || 
                 normalizedOriginal.replace(PRODUCTION_URL, '') === normalizedTag.replace(PRODUCTION_URL, '');
        });
        
        if (!linksBack) {
          issues.push({
            page: page.url,
            problem: 'not_bidirectional',
            details: `${alt.url} does not link back to ${page.url}`,
            severity: 'critical'
          });
        }
      } catch (e: any) {
        issues.push({
          page: page.url,
          problem: 'hreflang_fetch_error',
          details: `Could not fetch ${alt.url}: ${e?.message || 'Unknown error'}`,
          severity: 'warning'
        });
      }
    }
  }
  
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  
  return {
    status: criticalCount > 0 ? 'fail' : issues.length > 0 ? 'warning' : 'pass',
    severity: 'critical',
    pages_tested: pages.length,
    issues_found: issues.length,
    issues,
    details: { pages_with_hreflang: pagesWithHreflang }
  };
}

async function auditCanonical(pages: { url: string; html: string; type: string }[]): Promise<CheckResult> {
  const issues: Issue[] = [];
  
  for (const page of pages) {
    const canonical = extractCanonical(page.html);
    
    if (!canonical) {
      issues.push({
        page: page.url,
        problem: 'missing_canonical',
        details: 'No canonical URL found',
        severity: 'critical'
      });
      continue;
    }
    
    // Check self-referential
    const normalizedCanonical = canonical.replace(/\/$/, '').toLowerCase();
    const normalizedPage = page.url.replace(/\/$/, '').toLowerCase();
    
    if (normalizedCanonical !== normalizedPage) {
      issues.push({
        page: page.url,
        problem: 'non_self_referential',
        details: `Canonical (${canonical}) does not match page URL`,
        severity: 'warning'
      });
    }
    
    // Check HTTPS
    if (!canonical.startsWith('https://')) {
      issues.push({
        page: page.url,
        problem: 'canonical_not_https',
        details: 'Canonical URL does not use HTTPS',
        severity: 'critical'
      });
    }
    
    // Check www
    if (!canonical.includes('www.')) {
      issues.push({
        page: page.url,
        problem: 'canonical_missing_www',
        details: 'Canonical URL does not include www subdomain',
        severity: 'warning'
      });
    }
    
    // Check language prefix matches
    const pageLang = getLanguageFromUrl(page.url);
    const canonicalLang = getLanguageFromUrl(canonical);
    
    if (pageLang && canonicalLang && pageLang !== canonicalLang) {
      issues.push({
        page: page.url,
        problem: 'canonical_language_mismatch',
        details: `Page is /${pageLang}/ but canonical points to /${canonicalLang}/`,
        severity: 'critical'
      });
    }
  }
  
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  
  return {
    status: criticalCount > 0 ? 'fail' : issues.length > 0 ? 'warning' : 'pass',
    severity: 'critical',
    pages_tested: pages.length,
    issues_found: issues.length,
    issues
  };
}

async function auditLanguageConsistency(pages: { url: string; html: string; type: string }[]): Promise<CheckResult> {
  const issues: Issue[] = [];
  
  for (const page of pages) {
    const urlLang = getLanguageFromUrl(page.url);
    const htmlLang = extractHtmlLang(page.html);
    const canonical = extractCanonical(page.html);
    const canonicalLang = canonical ? getLanguageFromUrl(canonical) : null;
    const ogLocale = extractOgLocale(page.html);
    
    // Extract inLanguage from JSON-LD
    const schemas = extractSchemas(page.html);
    let schemaLang: string | null = null;
    for (const schema of schemas) {
      if (schema.inLanguage) {
        schemaLang = schema.inLanguage.split('-')[0].toLowerCase();
        break;
      }
    }
    
    // Check hreflang self-reference
    const hreflangTags = extractHreflangTags(page.html);
    const selfHreflang = hreflangTags.find(t => {
      const tagUrlLang = getLanguageFromUrl(t.url);
      return tagUrlLang === urlLang;
    });
    
    const indicators = {
      url: urlLang,
      html_lang: htmlLang,
      canonical: canonicalLang,
      og_locale: ogLocale,
      schema_inLanguage: schemaLang,
      hreflang_self: selfHreflang?.lang
    };
    
    // Check consistency
    const nonNullIndicators = Object.entries(indicators)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => ({ key: k, value: v }));
    
    const uniqueValues = [...new Set(nonNullIndicators.map(i => i.value))];
    
    if (uniqueValues.length > 1) {
      const mismatchDetails = nonNullIndicators
        .map(i => `${i.key}=${i.value}`)
        .join(', ');
      
      issues.push({
        page: page.url,
        problem: 'language_indicators_mismatch',
        details: `Inconsistent language indicators: ${mismatchDetails}`,
        severity: 'critical'
      });
    }
  }
  
  return {
    status: issues.length > 0 ? 'fail' : 'pass',
    severity: 'critical',
    pages_tested: pages.length,
    issues_found: issues.length,
    issues
  };
}

async function auditSchema(pages: { url: string; html: string; type: string }[]): Promise<CheckResult> {
  const issues: Issue[] = [];
  
  const requiredSchemas: Record<string, string[]> = {
    blog: ['BlogPosting', 'BreadcrumbList'],
    qa: ['QAPage'],
    location: ['LocalBusiness'],
    comparison: ['Article']
  };
  
  const forbiddenSchemas: Record<string, string[]> = {
    qa: ['FAQPage'] // Critical: Q&A pages should NOT have FAQPage
  };
  
  for (const page of pages) {
    const schemas = extractSchemas(page.html);
    const schemaTypes = schemas.map(s => s['@type']).flat().filter(Boolean);
    
    if (schemas.length === 0) {
      issues.push({
        page: page.url,
        problem: 'no_schema',
        details: 'No JSON-LD schema found',
        severity: 'warning'
      });
      continue;
    }
    
    // Check required schemas
    const required = requiredSchemas[page.type] || [];
    for (const req of required) {
      if (!schemaTypes.includes(req)) {
        issues.push({
          page: page.url,
          problem: 'missing_required_schema',
          details: `Missing required schema: ${req}`,
          severity: 'warning'
        });
      }
    }
    
    // Check forbidden schemas
    const forbidden = forbiddenSchemas[page.type] || [];
    for (const forb of forbidden) {
      if (schemaTypes.includes(forb)) {
        issues.push({
          page: page.url,
          problem: 'forbidden_schema',
          details: `CRITICAL: ${forb} schema found on ${page.type} page - should be QAPage!`,
          severity: 'critical'
        });
      }
    }
    
    // Check for valid JSON and language consistency
    const pageLang = getLanguageFromUrl(page.url);
    for (const schema of schemas) {
      if (schema.inLanguage && schema.inLanguage.split('-')[0].toLowerCase() !== pageLang) {
        issues.push({
          page: page.url,
          problem: 'schema_language_mismatch',
          details: `Schema inLanguage (${schema.inLanguage}) doesn't match page (${pageLang})`,
          severity: 'warning'
        });
      }
    }
  }
  
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  
  return {
    status: criticalCount > 0 ? 'fail' : issues.length > 0 ? 'warning' : 'pass',
    severity: 'critical',
    pages_tested: pages.length,
    issues_found: issues.length,
    issues
  };
}

async function auditSitemap(): Promise<CheckResult> {
  const issues: Issue[] = [];
  
  try {
    const result = await fetchPageHTML(`${PRODUCTION_URL}/sitemap.xml`);
    
    if (result.status !== 200) {
      return {
        status: 'fail',
        severity: 'critical',
        pages_tested: 0,
        issues_found: 1,
        issues: [{
          page: `${PRODUCTION_URL}/sitemap.xml`,
          problem: 'sitemap_not_found',
          details: `Sitemap returned ${result.status}`,
          severity: 'critical'
        }]
      };
    }
    
    // Count URLs by language
    const urlCounts: Record<string, number> = {};
    for (const lang of SUPPORTED_LANGUAGES) {
      const regex = new RegExp(`<loc>[^<]*/${lang}/[^<]*</loc>`, 'gi');
      const matches = result.html.match(regex) || [];
      urlCounts[lang] = matches.length;
    }
    
    // Check all languages represented
    for (const lang of SUPPORTED_LANGUAGES) {
      if (urlCounts[lang] === 0) {
        issues.push({
          page: `${PRODUCTION_URL}/sitemap.xml`,
          problem: 'language_missing_from_sitemap',
          details: `No URLs found for language: ${lang}`,
          severity: 'warning'
        });
      }
    }
    
    // Check lastmod present
    const hasLastmod = result.html.includes('<lastmod>');
    if (!hasLastmod) {
      issues.push({
        page: `${PRODUCTION_URL}/sitemap.xml`,
        problem: 'missing_lastmod',
        details: 'Sitemap does not include lastmod dates',
        severity: 'info'
      });
    }
    
    // Sample check 5 random URLs from sitemap
    const urlMatches = result.html.match(/<loc>([^<]+)<\/loc>/gi) || [];
    const sampleUrls = urlMatches
      .map(m => m.replace(/<\/?loc>/gi, ''))
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
    
    for (const url of sampleUrls) {
      const status = await checkUrlStatus(url);
      if (status !== 200) {
        issues.push({
          page: url,
          problem: 'sitemap_url_error',
          details: `Sitemap URL returns ${status}`,
          severity: 'warning'
        });
      }
    }
    
    const totalUrls = urlMatches.length;
    
    return {
      status: issues.some(i => i.severity === 'critical') ? 'fail' : issues.length > 0 ? 'warning' : 'pass',
      severity: 'critical',
      pages_tested: sampleUrls.length,
      issues_found: issues.length,
      issues,
      details: { total_urls: totalUrls, urls_by_language: urlCounts }
    };
  } catch (error: any) {
    return {
      status: 'fail',
      severity: 'critical',
      pages_tested: 0,
      issues_found: 1,
      issues: [{
        page: `${PRODUCTION_URL}/sitemap.xml`,
        problem: 'sitemap_fetch_error',
        details: `Error fetching sitemap: ${error?.message || 'Unknown error'}`,
        severity: 'critical'
      }]
    };
  }
}

async function auditRobots(pages: { url: string; html: string; type: string }[]): Promise<CheckResult> {
  const issues: Issue[] = [];
  
  // Check robots.txt
  try {
    const result = await fetchPageHTML(`${PRODUCTION_URL}/robots.txt`);
    
    if (result.status !== 200) {
      issues.push({
        page: `${PRODUCTION_URL}/robots.txt`,
        problem: 'robots_not_found',
        details: `robots.txt returned ${result.status}`,
        severity: 'warning'
      });
    } else {
      // Check for critical blocks
      const criticalPaths = ['/en/', '/de/', '/blog/', '/qa/', '/locations/', '/compare/'];
      for (const path of criticalPaths) {
        if (result.html.includes(`Disallow: ${path}`)) {
          issues.push({
            page: `${PRODUCTION_URL}/robots.txt`,
            problem: 'critical_path_blocked',
            details: `robots.txt blocks critical path: ${path}`,
            severity: 'critical'
          });
        }
      }
    }
  } catch (error: any) {
    issues.push({
      page: `${PRODUCTION_URL}/robots.txt`,
      problem: 'robots_fetch_error',
      details: `Error fetching robots.txt: ${error?.message || 'Unknown error'}`,
      severity: 'warning'
    });
  }
  
  // Check meta robots on pages
  for (const page of pages) {
    const metaRobots = extractMetaRobots(page.html);
    
    if (metaRobots) {
      if (metaRobots.includes('noindex')) {
        issues.push({
          page: page.url,
          problem: 'noindex_on_published',
          details: 'Published page has noindex meta tag',
          severity: 'critical'
        });
      }
      if (metaRobots.includes('nofollow')) {
        issues.push({
          page: page.url,
          problem: 'nofollow_on_published',
          details: 'Published page has nofollow meta tag',
          severity: 'warning'
        });
      }
    }
  }
  
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  
  return {
    status: criticalCount > 0 ? 'fail' : issues.length > 0 ? 'warning' : 'pass',
    severity: 'critical',
    pages_tested: pages.length + 1,
    issues_found: issues.length,
    issues
  };
}

async function auditInternalLinks(pages: { url: string; html: string; type: string }[]): Promise<CheckResult> {
  const issues: Issue[] = [];
  let totalLinks = 0;
  let brokenLinks = 0;
  
  // Only check blog pages for internal links
  const blogPages = pages.filter(p => p.type === 'blog').slice(0, 5);
  
  for (const page of blogPages) {
    const pageLang = getLanguageFromUrl(page.url);
    const links = extractInternalLinks(page.html).slice(0, 10); // Sample 10 links per page
    totalLinks += links.length;
    
    for (const link of links) {
      const fullUrl = link.startsWith('http') ? link : `${PRODUCTION_URL}${link}`;
      const linkLang = getLanguageFromUrl(fullUrl);
      
      // Check language consistency
      if (linkLang && pageLang && linkLang !== pageLang) {
        issues.push({
          page: page.url,
          problem: 'cross_language_link',
          details: `Link to ${link} is /${linkLang}/ but page is /${pageLang}/`,
          severity: 'warning'
        });
      }
      
      // Check if link works (sample)
      if (links.indexOf(link) < 3) { // Only check first 3 links per page
        const status = await checkUrlStatus(fullUrl);
        if (status !== 200 && status !== 301 && status !== 302) {
          brokenLinks++;
          issues.push({
            page: page.url,
            problem: 'broken_internal_link',
            details: `Link ${link} returns ${status}`,
            severity: 'critical'
          });
        }
      }
    }
  }
  
  return {
    status: brokenLinks > 0 ? 'fail' : issues.length > 0 ? 'warning' : 'pass',
    severity: 'critical',
    pages_tested: blogPages.length,
    issues_found: issues.length,
    issues,
    details: { total_links_checked: totalLinks, broken_links: brokenLinks }
  };
}

async function auditExternalCitations(pages: { url: string; html: string; type: string }[]): Promise<CheckResult> {
  const issues: Issue[] = [];
  let totalCitations = 0;
  let brokenCitations = 0;
  
  const blogPages = pages.filter(p => p.type === 'blog').slice(0, 5);
  
  // Competitor domains to flag
  const competitors = ['idealista.com', 'fotocasa.es', 'rightmove.co.uk', 'zoopla.co.uk'];
  
  for (const page of blogPages) {
    const links = extractExternalLinks(page.html).slice(0, 10);
    totalCitations += links.length;
    
    for (const link of links) {
      // Check for competitor links
      for (const competitor of competitors) {
        if (link.includes(competitor)) {
          issues.push({
            page: page.url,
            problem: 'competitor_link',
            details: `Link to competitor domain: ${link}`,
            severity: 'warning'
          });
        }
      }
      
      // Check if link works (sample first 3)
      if (links.indexOf(link) < 3) {
        const status = await checkUrlStatus(link);
        if (status === 0 || status >= 400) {
          brokenCitations++;
          issues.push({
            page: page.url,
            problem: 'broken_external_link',
            details: `External link ${link} returns ${status}`,
            severity: 'warning'
          });
        }
      }
    }
  }
  
  return {
    status: brokenCitations > (totalCitations * 0.05) ? 'warning' : 'pass',
    severity: 'warning',
    pages_tested: blogPages.length,
    issues_found: issues.length,
    issues,
    details: { total_citations: totalCitations, broken_citations: brokenCitations }
  };
}

async function auditPerformance(pages: { url: string; html: string; type: string; ttfb?: number }[]): Promise<CheckResult> {
  const issues: Issue[] = [];
  const ttfbValues: number[] = [];
  
  for (const page of pages.slice(0, 5)) {
    if (page.ttfb) {
      ttfbValues.push(page.ttfb);
      
      if (page.ttfb > 600) {
        issues.push({
          page: page.url,
          problem: 'slow_ttfb',
          details: `TTFB is ${page.ttfb}ms (should be < 600ms)`,
          severity: 'warning'
        });
      }
    }
    
    // Check if content renders (has actual content)
    if (page.html.length < 5000) {
      issues.push({
        page: page.url,
        problem: 'minimal_content',
        details: `Page HTML is only ${page.html.length} bytes - may not be rendering properly`,
        severity: 'warning'
      });
    }
    
    // Check for HTTPS
    if (!page.url.startsWith('https://')) {
      issues.push({
        page: page.url,
        problem: 'not_https',
        details: 'Page is not served over HTTPS',
        severity: 'critical'
      });
    }
  }
  
  const avgTtfb = ttfbValues.length > 0 
    ? Math.round(ttfbValues.reduce((a, b) => a + b, 0) / ttfbValues.length)
    : 0;
  
  return {
    status: avgTtfb > 600 ? 'warning' : 'pass',
    severity: 'warning',
    pages_tested: Math.min(pages.length, 5),
    issues_found: issues.length,
    issues,
    details: { avg_ttfb_ms: avgTtfb, ttfb_values: ttfbValues }
  };
}

async function auditAIReadiness(pages: { url: string; html: string; type: string }[]): Promise<CheckResult> {
  const issues: Issue[] = [];
  
  const qaPages = pages.filter(p => p.type === 'qa');
  
  for (const page of qaPages) {
    const schemas = extractSchemas(page.html);
    const qaSchema = schemas.find(s => s['@type'] === 'QAPage' || s['@type']?.includes('QAPage'));
    
    if (!qaSchema) {
      issues.push({
        page: page.url,
        problem: 'missing_qa_schema',
        details: 'No QAPage schema found',
        severity: 'critical'
      });
      continue;
    }
    
    // Check for mainEntity with acceptedAnswer
    const mainEntity = qaSchema.mainEntity;
    if (!mainEntity) {
      issues.push({
        page: page.url,
        problem: 'missing_main_entity',
        details: 'QAPage schema missing mainEntity',
        severity: 'critical'
      });
      continue;
    }
    
    const answer = mainEntity.acceptedAnswer?.text || mainEntity.suggestedAnswer?.[0]?.text;
    if (!answer) {
      issues.push({
        page: page.url,
        problem: 'missing_answer',
        details: 'Q&A schema missing answer text',
        severity: 'critical'
      });
      continue;
    }
    
    // Check for markdown in answer
    if (answer.includes('```') || answer.includes('**') || answer.match(/^#+\s/m)) {
      issues.push({
        page: page.url,
        problem: 'markdown_in_schema',
        details: 'Answer contains markdown formatting',
        severity: 'warning'
      });
    }
    
    // Check word count
    const wordCount = answer.split(/\s+/).length;
    if (wordCount < 50) {
      issues.push({
        page: page.url,
        problem: 'answer_too_short',
        details: `Answer is only ${wordCount} words (should be 50+)`,
        severity: 'warning'
      });
    }
    
    // Check heading hierarchy
    const h1Count = (page.html.match(/<h1[^>]*>/gi) || []).length;
    if (h1Count === 0) {
      issues.push({
        page: page.url,
        problem: 'missing_h1',
        details: 'Page has no H1 heading',
        severity: 'warning'
      });
    } else if (h1Count > 1) {
      issues.push({
        page: page.url,
        problem: 'multiple_h1',
        details: `Page has ${h1Count} H1 headings (should be 1)`,
        severity: 'info'
      });
    }
  }
  
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  
  return {
    status: criticalCount > 0 ? 'fail' : issues.length > 0 ? 'warning' : 'pass',
    severity: 'critical',
    pages_tested: qaPages.length,
    issues_found: issues.length,
    issues
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting production site audit...');

    // Get sample pages from database
    const { data: blogs } = await supabase
      .from('blog_articles')
      .select('slug, language, canonical_url')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: qas } = await supabase
      .from('qa_pages')
      .select('slug, language, canonical_url')
      .eq('status', 'published')
      .limit(50);

    const { data: locations } = await supabase
      .from('location_pages')
      .select('slug, city_slug, language, canonical_url')
      .eq('status', 'published')
      .limit(50);

    const { data: comparisons } = await supabase
      .from('comparison_pages')
      .select('slug, language, canonical_url')
      .eq('status', 'published')
      .limit(50);

    // Select random samples
    const sampleBlogs = (blogs || []).sort(() => Math.random() - 0.5).slice(0, 5);
    const sampleQAs = (qas || []).sort(() => Math.random() - 0.5).slice(0, 5);
    const sampleLocations = (locations || []).sort(() => Math.random() - 0.5).slice(0, 5);
    const sampleComparisons = (comparisons || []).sort(() => Math.random() - 0.5).slice(0, 5);

    // Build URLs
    const pagesToTest: { url: string; type: string }[] = [];

    for (const blog of sampleBlogs) {
      pagesToTest.push({
        url: `${PRODUCTION_URL}/${blog.language}/blog/${blog.slug}`,
        type: 'blog'
      });
    }

    for (const qa of sampleQAs) {
      pagesToTest.push({
        url: `${PRODUCTION_URL}/${qa.language}/qa/${qa.slug}`,
        type: 'qa'
      });
    }

    for (const loc of sampleLocations) {
      pagesToTest.push({
        url: `${PRODUCTION_URL}/${loc.language}/locations/${loc.city_slug}/${loc.slug}`,
        type: 'location'
      });
    }

    for (const comp of sampleComparisons) {
      pagesToTest.push({
        url: `${PRODUCTION_URL}/${comp.language}/compare/${comp.slug}`,
        type: 'comparison'
      });
    }

    console.log(`Testing ${pagesToTest.length} pages...`);

    // Fetch all pages
    const fetchedPages: { url: string; html: string; type: string; ttfb: number }[] = [];
    
    for (const page of pagesToTest) {
      console.log(`Fetching ${page.url}...`);
      const result = await fetchPageHTML(page.url);
      if (result.status === 200) {
        fetchedPages.push({
          url: page.url,
          html: result.html,
          type: page.type,
          ttfb: result.ttfb
        });
      } else {
        console.log(`Failed to fetch ${page.url}: ${result.status}`);
      }
    }

    console.log(`Successfully fetched ${fetchedPages.length} pages`);

    // Run all audits
    const results: Record<string, CheckResult> = {};

    console.log('Running hreflang audit...');
    results.hreflang = await auditHreflang(fetchedPages);

    console.log('Running canonical audit...');
    results.canonical = await auditCanonical(fetchedPages);

    console.log('Running language consistency audit...');
    results.language_consistency = await auditLanguageConsistency(fetchedPages);

    console.log('Running schema audit...');
    results.schema = await auditSchema(fetchedPages);

    console.log('Running sitemap audit...');
    results.sitemap = await auditSitemap();

    console.log('Running robots audit...');
    results.robots = await auditRobots(fetchedPages);

    console.log('Running internal links audit...');
    results.internal_links = await auditInternalLinks(fetchedPages);

    console.log('Running external citations audit...');
    results.external_citations = await auditExternalCitations(fetchedPages);

    console.log('Running performance audit...');
    results.performance = await auditPerformance(fetchedPages);

    console.log('Running AI readiness audit...');
    results.ai_readiness = await auditAIReadiness(fetchedPages);

    // Calculate overall health
    const checksArray = Object.values(results);
    const passedChecks = checksArray.filter(c => c.status === 'pass').length;
    const warningChecks = checksArray.filter(c => c.status === 'warning').length;
    const failedChecks = checksArray.filter(c => c.status === 'fail').length;
    
    const criticalIssues = checksArray.reduce((sum, c) => 
      sum + c.issues.filter(i => i.severity === 'critical').length, 0);
    const warnings = checksArray.reduce((sum, c) => 
      sum + c.issues.filter(i => i.severity === 'warning').length, 0);

    // Health score: 100 - (critical * 10) - (warning * 2) - (failed checks * 5)
    const healthScore = Math.max(0, Math.min(100, 
      100 - (criticalIssues * 10) - (warnings * 2) - (failedChecks * 5)
    ));

    const launchReady = criticalIssues === 0 && failedChecks === 0;

    // Get sample page analysis
    const perfectPage = fetchedPages.find(p => {
      const issues = Object.values(results).flatMap(r => 
        r.issues.filter(i => i.page === p.url)
      );
      return issues.length === 0;
    });

    const problematicPage = fetchedPages.find(p => {
      const issues = Object.values(results).flatMap(r => 
        r.issues.filter(i => i.page === p.url && i.severity === 'critical')
      );
      return issues.length > 0;
    });

    const response = {
      audit_timestamp: new Date().toISOString(),
      overall_health: healthScore,
      launch_ready: launchReady,
      summary: {
        passed_checks: passedChecks,
        warning_checks: warningChecks,
        failed_checks: failedChecks,
        critical_issues: criticalIssues,
        warnings: warnings,
        pages_tested: fetchedPages.length
      },
      checks: results,
      sample_pages: {
        tested_urls: fetchedPages.map(p => ({ url: p.url, type: p.type })),
        perfect_page: perfectPage ? {
          url: perfectPage.url,
          hreflang_tags: extractHreflangTags(perfectPage.html),
          canonical: extractCanonical(perfectPage.html),
          html_lang: extractHtmlLang(perfectPage.html)
        } : null,
        problematic_page: problematicPage ? {
          url: problematicPage.url,
          issues: Object.values(results).flatMap(r => 
            r.issues.filter(i => i.page === problematicPage.url)
          )
        } : null
      },
      launch_checklist: {
        hreflang_bidirectional: results.hreflang.status !== 'fail',
        canonicals_valid: results.canonical.status !== 'fail',
        language_consistent: results.language_consistency.status === 'pass',
        schema_valid: results.schema.status !== 'fail',
        sitemap_complete: results.sitemap.status !== 'fail',
        no_blocking_robots: results.robots.status !== 'fail',
        internal_links_ok: results.internal_links.status !== 'fail',
        performance_ok: results.performance.status !== 'fail',
        ai_ready: results.ai_readiness.status !== 'fail'
      }
    };

    console.log('Audit complete!', JSON.stringify({
      health: healthScore,
      launch_ready: launchReady,
      critical: criticalIssues,
      warnings: warnings
    }));

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Audit error:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unknown error',
      stack: error?.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
