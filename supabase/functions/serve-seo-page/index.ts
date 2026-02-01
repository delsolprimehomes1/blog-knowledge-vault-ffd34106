import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Function re-enabled with timeout protection
const FUNCTION_DISABLED = false

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================
// TIMEOUT & CIRCUIT BREAKER CONFIGURATION
// Prevents 504/524 errors from hanging database queries
// ============================================================
const QUERY_TIMEOUT = 10000 // 10 seconds max per database query
const TOTAL_REQUEST_TIMEOUT = 20000 // 20 seconds max for entire request

// Simple in-memory cache to reduce DB load (5-minute TTL)
const pageCache = new Map<string, { data: any; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Circuit breaker state
let consecutiveFailures = 0
const FAILURE_THRESHOLD = 3
const CIRCUIT_RESET_TIME = 30000 // 30 seconds
let circuitOpenUntil = 0

function getCachedPage(key: string): any | null {
  const cached = pageCache.get(key)
  if (cached && cached.expires > Date.now()) {
    console.log(`[Cache] HIT: ${key}`)
    return cached.data
  }
  if (cached) {
    pageCache.delete(key) // Clean up expired entry
  }
  return null
}

function setCachedPage(key: string, data: any): void {
  pageCache.set(key, { data, expires: Date.now() + CACHE_TTL })
  // Limit cache size to 200 entries to prevent memory issues
  if (pageCache.size > 200) {
    const oldest = pageCache.keys().next().value
    if (oldest) pageCache.delete(oldest)
  }
}

function isCircuitOpen(): boolean {
  if (Date.now() < circuitOpenUntil) {
    console.log('[Circuit] OPEN - returning 503 immediately')
    return true
  }
  return false
}

function recordFailure(): void {
  consecutiveFailures++
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_RESET_TIME
    console.log(`[Circuit] OPENED for ${CIRCUIT_RESET_TIME}ms after ${consecutiveFailures} consecutive failures`)
    consecutiveFailures = 0
  }
}

function recordSuccess(): void {
  consecutiveFailures = 0
}

/**
 * Wraps a promise with a timeout - returns fallback HTML if too slow
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackResponse: Response
): Promise<T | Response> {
  const timeout = new Promise<Response>((resolve) => {
    setTimeout(() => {
      console.warn(`[SEO] Timeout after ${timeoutMs}ms - returning fallback HTML`);
      resolve(fallbackResponse);
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]);
}

/**
 * Generates minimal SEO-friendly fallback HTML when database is slow
 */
function generateFallbackHTML(url: URL): string {
  const baseTitle = 'Del Sol Prime Homes - Luxury Real Estate Costa del Sol';
  const baseDescription = 'Discover premium properties and luxury villas on the Costa del Sol. Expert real estate services for international buyers seeking their dream Mediterranean home.';
  const baseUrl = url.origin;
  const pathname = url.pathname;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${baseTitle}</title>
  <meta name="description" content="${baseDescription}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url.toString()}">
  <meta property="og:title" content="${baseTitle}">
  <meta property="og:description" content="${baseDescription}">
  <meta property="og:site_name" content="Del Sol Prime Homes">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${url.toString()}">
  <meta name="twitter:title" content="${baseTitle}">
  <meta name="twitter:description" content="${baseDescription}">
  
  <!-- Canonical -->
  <link rel="canonical" href="${url.toString()}">
  
  <!-- Auto-redirect to React app for user experience -->
  <meta http-equiv="refresh" content="0;url=${pathname}">
  
  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": "Del Sol Prime Homes",
    "description": "${baseDescription}",
    "url": "${baseUrl}",
    "address": {
      "@type": "PostalAddress",
      "addressRegion": "Costa del Sol",
      "addressCountry": "ES"
    }
  }
  </script>
</head>
<body>
  <!-- Immediate JavaScript redirect -->
  <script>window.location.href='${pathname}';</script>
  
  <!-- Fallback for no-JS -->
  <noscript>
    <p>Redirecting to <a href="${pathname}">${baseTitle}</a>...</p>
  </noscript>
</body>
</html>`;
}

/**
 * Create a Supabase client with timeout handling
 */
function createTimeoutClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      fetch: (url, options = {}) => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          console.log(`[Timeout] Query aborted after ${QUERY_TIMEOUT}ms`)
          controller.abort()
        }, QUERY_TIMEOUT)
        
        return fetch(url, { ...options, signal: controller.signal })
          .finally(() => clearTimeout(timeoutId))
      }
    }
  })
}

// Language to locale mapping - Only 10 supported languages
const LOCALE_MAP: Record<string, string> = {
  en: 'en_GB',
  de: 'de_DE',
  fr: 'fr_FR',
  nl: 'nl_NL',
  sv: 'sv_SE',
  no: 'nb_NO',
  da: 'da_DK',
  fi: 'fi_FI',
  pl: 'pl_PL',
  hu: 'hu_HU',
}

// Only the 10 languages we actually support (no es, ru, it, tr)
const SUPPORTED_LANGUAGES = ['en', 'nl', 'hu', 'de', 'fr', 'sv', 'pl', 'no', 'fi', 'da']
const BASE_URL = 'https://www.delsolprimehomes.com'

/**
 * Normalize a slug by removing hidden characters, URL-encoded garbage, 
 * and accidentally appended domains from copy-paste errors.
 */
function normalizeSlug(rawSlug: string): string {
  if (!rawSlug) return ''
  
  let clean = decodeURIComponent(rawSlug)
  // Remove newlines, carriage returns, tabs, null bytes
  clean = clean.replace(/[\r\n\t\x00]/g, '')
  // Remove accidentally appended domain (common copy-paste error)
  clean = clean.replace(/delsolprimehomes\.com.*$/i, '')
  // Trim whitespace
  clean = clean.trim()
  // Remove trailing slashes
  clean = clean.replace(/\/+$/, '')
  
  return clean
}

/**
 * Checks if content is empty/placeholder (should trigger 410 Gone)
 * Empty content patterns: null, '', '<p></p>', '<p><br></p>', whitespace-only
 * This implements the "Wrecking Ball" policy for ghost pages
 */
function isEmptyContent(content: string | null | undefined): boolean {
  if (!content) return true
  
  const stripped = content
    .replace(/<[^>]*>/g, '')  // Remove HTML tags
    .replace(/&nbsp;/g, ' ')   // Replace &nbsp;
    .trim()
  
  return stripped.length === 0
}

interface PageMetadata {
  language: string
  meta_title: string
  meta_description: string
  canonical_url: string
  headline: string
  speakable_answer: string
  featured_image_url?: string
  featured_image_alt?: string
  date_published?: string
  date_modified?: string
  hreflang_group_id?: string
  qa_entities?: any[]
  content_type: 'qa' | 'blog' | 'compare' | 'locations'
  quick_comparison_table?: any[] // For comparison pages
  // SSR content fields
  detailed_content?: string      // Blog articles
  answer_main?: string           // Q&A pages
  final_verdict?: string         // Comparison pages
  location_overview?: string     // Location pages
  read_time?: number             // For blogs
  author_bio?: string            // Author info
}

interface HreflangSibling {
  language: string
  slug: string
  canonical_url: string
}

async function fetchQAMetadata(supabase: any, slug: string, lang: string): Promise<PageMetadata | null> {
  const { data, error } = await supabase
    .from('qa_pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error || !data) {
    console.error('Error fetching QA page:', error)
    return null
  }

  return {
    language: data.language || lang,
    meta_title: data.meta_title || data.title || '',
    meta_description: data.meta_description || '',
    canonical_url: data.canonical_url || `${BASE_URL}/${data.language}/qa/${slug}`,
    headline: data.question_main || data.title || '',
    speakable_answer: data.answer_main || data.speakable_answer || '',
    featured_image_url: data.featured_image_url,
    featured_image_alt: data.featured_image_alt,
    date_published: data.date_published,
    date_modified: data.date_modified,
    hreflang_group_id: data.hreflang_group_id,
    qa_entities: data.related_qas,
    content_type: 'qa',
    // SSR content
    answer_main: data.answer_main,
  }
}

async function fetchBlogMetadata(supabase: any, slug: string, lang: string): Promise<PageMetadata | null> {
  const { data, error } = await supabase
    .from('blog_articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error || !data) {
    console.error('Error fetching blog article:', error)
    return null
  }

  return {
    language: data.language || lang,
    meta_title: data.meta_title,
    meta_description: data.meta_description,
    canonical_url: data.canonical_url || `${BASE_URL}/${data.language}/blog/${slug}`,
    headline: data.headline,
    speakable_answer: data.speakable_answer,
    featured_image_url: data.featured_image_url,
    featured_image_alt: data.featured_image_alt,
    date_published: data.date_published,
    date_modified: data.date_modified,
    hreflang_group_id: data.hreflang_group_id,
    qa_entities: data.qa_entities,
    content_type: 'blog',
    // SSR content
    detailed_content: data.detailed_content,
    read_time: data.read_time,
    author_bio: data.author_bio_localized,
  }
}

async function fetchComparisonMetadata(supabase: any, slug: string, lang: string): Promise<PageMetadata | null> {
  const { data, error } = await supabase
    .from('comparison_pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error || !data) {
    console.error('Error fetching comparison page:', error)
    return null
  }

  return {
    language: data.language || lang,
    meta_title: data.meta_title,
    meta_description: data.meta_description,
    canonical_url: data.canonical_url || `${BASE_URL}/${data.language}/compare/${slug}`,
    headline: data.headline,
    speakable_answer: data.speakable_answer,
    featured_image_url: data.featured_image_url,
    featured_image_alt: data.featured_image_alt,
    date_published: data.date_published,
    date_modified: data.date_modified,
    hreflang_group_id: data.hreflang_group_id,
    qa_entities: data.qa_entities,
    content_type: 'compare',
    quick_comparison_table: data.quick_comparison_table,
    // SSR content
    final_verdict: data.final_verdict,
  }
}

// Result type for location metadata with potential redirect
interface LocationResult {
  metadata: PageMetadata | null
  redirect?: { to: string; reason: string }
}

async function fetchLocationMetadata(supabase: any, slug: string, lang: string): Promise<LocationResult> {
  // Location pages have compound slugs: city_slug/topic_slug
  // The slug parameter will be "city-slug/topic-slug" or just the topic_slug if parsed separately
  const slugParts = slug.split('/')
  
  let data, error
  let citySlug = ''
  let topicSlug = ''
  
  if (slugParts.length >= 2) {
    // Full path: city_slug/topic_slug
    [citySlug, topicSlug] = slugParts
    console.log(`[Location] Querying by city_slug="${citySlug}" AND topic_slug="${topicSlug}" AND language="${lang}"`)
    
    // CRITICAL: Include language filter to prevent cross-language slug resolution
    const result = await supabase
      .from('location_pages')
      .select('*')
      .eq('city_slug', citySlug)
      .eq('topic_slug', topicSlug)
      .eq('language', lang)  // ← LANGUAGE FILTER
      .eq('status', 'published')
      .maybeSingle()
    
    data = result.data
    error = result.error
    
    // If not found with language match, check if it exists in another language (for redirect)
    if (!data && !error) {
      console.log(`[Location] Not found in ${lang}, checking other languages for redirect...`)
      const anyLangResult = await supabase
        .from('location_pages')
        .select('language, canonical_url, city_slug, topic_slug')
        .eq('city_slug', citySlug)
        .eq('topic_slug', topicSlug)
        .eq('status', 'published')
        .maybeSingle()
      
      if (anyLangResult.data) {
        const foundPage = anyLangResult.data
        console.log(`[Location] Found in ${foundPage.language}, should redirect to: ${foundPage.canonical_url}`)
        return {
          metadata: null,
          redirect: {
            to: foundPage.canonical_url || `${BASE_URL}/${foundPage.language}/locations/${foundPage.city_slug}/${foundPage.topic_slug}`,
            reason: `language_mismatch:${lang}->${foundPage.language}`
          }
        }
      }
    }
  } else {
    // Single slug - try topic_slug first, then city_slug (with language filter)
    console.log(`[Location] Querying by topic_slug="${slug}" AND language="${lang}"`)
    
    let result = await supabase
      .from('location_pages')
      .select('*')
      .eq('topic_slug', slug)
      .eq('language', lang)  // ← LANGUAGE FILTER
      .eq('status', 'published')
      .maybeSingle()
    
    if (!result.data) {
      console.log(`[Location] topic_slug not found in ${lang}, trying city_slug="${slug}"`)
      result = await supabase
        .from('location_pages')
        .select('*')
        .eq('city_slug', slug)
        .eq('language', lang)  // ← LANGUAGE FILTER
        .eq('status', 'published')
        .limit(1)
        .maybeSingle()
    }
    
    data = result.data
    error = result.error
  }

  if (error || !data) {
    console.error('Error fetching location page:', error)
    return { metadata: null }
  }

  const fullSlug = `${data.city_slug}/${data.topic_slug}`
  return {
    metadata: {
      language: data.language || lang,
      meta_title: data.meta_title,
      meta_description: data.meta_description,
      canonical_url: data.canonical_url || `${BASE_URL}/${data.language}/locations/${fullSlug}`,
      headline: data.headline,
      speakable_answer: data.speakable_answer,
      featured_image_url: data.featured_image_url,
      featured_image_alt: data.featured_image_alt,
      date_published: data.date_published,
      date_modified: data.date_modified,
      hreflang_group_id: data.hreflang_group_id,
      qa_entities: data.qa_entities,
      content_type: 'locations',
      // SSR content
      location_overview: data.location_overview,
    }
  }
}

async function fetchHreflangSiblings(supabase: any, hreflangGroupId: string, contentType: string): Promise<HreflangSibling[]> {
  if (!hreflangGroupId) return []

  const tableMap: Record<string, string> = {
    qa: 'qa_pages',
    blog: 'blog_articles',
    compare: 'comparison_pages',
    locations: 'location_pages',
  }

  const tableName = tableMap[contentType]
  if (!tableName) return []

  // Location pages have city_slug + topic_slug instead of slug
  if (contentType === 'locations') {
    const { data, error } = await supabase
      .from(tableName)
      .select('language, city_slug, topic_slug, canonical_url')
      .eq('hreflang_group_id', hreflangGroupId)
      .eq('status', 'published')

    if (error || !data) {
      console.error('Error fetching location hreflang siblings:', error)
      return []
    }

    // Convert to HreflangSibling format with compound slug
    return data.map((item: any) => ({
      language: item.language,
      slug: `${item.city_slug}/${item.topic_slug}`,
      canonical_url: item.canonical_url,
    })) as HreflangSibling[]
  }

  // Standard content types with slug column
  const { data, error } = await supabase
    .from(tableName)
    .select('language, slug, canonical_url')
    .eq('hreflang_group_id', hreflangGroupId)
    .eq('status', 'published')

  if (error || !data) {
    console.error('Error fetching hreflang siblings:', error)
    return []
  }

  return data as HreflangSibling[]
}

function generateHreflangTags(siblings: HreflangSibling[], currentLang: string, contentType: string): string {
  const pathPrefix = contentType === 'blog' ? 'blog' : contentType === 'qa' ? 'qa' : contentType === 'compare' ? 'compare' : 'locations'
  
  // Create a map of available languages from siblings
  const availableLanguages = new Map<string, HreflangSibling>()
  siblings.forEach(sibling => {
    availableLanguages.set(sibling.language, sibling)
  })

  // FIXED: Only generate hreflang tags for languages that ACTUALLY EXIST
  // DO NOT create placeholder URLs for missing translations - this causes 
  // "Duplicate without user-selected canonical" errors in Google Search Console
  const tags: string[] = []
  
  for (const sibling of siblings) {
    // Only include published siblings with valid slugs
    if (sibling.language && sibling.slug) {
      const url = sibling.canonical_url || `${BASE_URL}/${sibling.language}/${pathPrefix}/${sibling.slug}`
      tags.push(`  <link rel="alternate" hreflang="${sibling.language}" href="${url}" />`)
    }
  }

  // Add x-default (points to English if it exists, otherwise current language)
  const englishVersion = availableLanguages.get('en')
  const xDefaultVersion = englishVersion || availableLanguages.get(currentLang) || siblings[0]
  const xDefaultLang = englishVersion ? 'en' : (xDefaultVersion?.language || currentLang)
  const xDefaultUrl = xDefaultVersion 
    ? (xDefaultVersion.canonical_url || `${BASE_URL}/${xDefaultLang}/${pathPrefix}/${xDefaultVersion.slug}`)
    : `${BASE_URL}/${currentLang}/${pathPrefix}/${siblings[0]?.slug || ''}`
  tags.push(`  <link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />`)

  return tags.join('\n')
}

/**
 * Generate full SEO HTML for hub pages (e.g., /{lang}/locations)
 * Includes all metadata, hreflang tags, and JSON-LD schema
 */
function generateHubPageHtml(lang: string, hubType: string): string {
  const locale = LOCALE_MAP[lang] || 'en_GB'
  const canonicalUrl = `${BASE_URL}/${lang}/${hubType}`
  
  // Localized hub content
  const hubContent: Record<string, { title: string; description: string; speakableSummary: string }> = {
    en: {
      title: "Costa del Sol Location Guides | Del Sol Prime Homes",
      description: "Explore comprehensive location guides for the Costa del Sol. Expert insights on property buying, best areas, cost of living, and investment opportunities in Marbella, Estepona, Fuengirola, and more.",
      speakableSummary: "Del Sol Prime Homes Location Intelligence Hub provides comprehensive real estate guides for 11 cities across the Costa del Sol. Explore data-driven insights on property prices, investment yields, school zones, safety ratings, and cost of living analysis."
    },
    nl: {
      title: "Costa del Sol Locatiegidsen | Del Sol Prime Homes",
      description: "Ontdek uitgebreide locatiegidsen voor de Costa del Sol. Expert inzichten over vastgoedaankoop, beste gebieden, kosten van levensonderhoud en investeringsmogelijkheden.",
      speakableSummary: "Del Sol Prime Homes Location Intelligence Hub biedt uitgebreide vastgoedgidsen voor 11 steden aan de Costa del Sol."
    },
    de: {
      title: "Costa del Sol Standortführer | Del Sol Prime Homes",
      description: "Entdecken Sie umfassende Standortführer für die Costa del Sol. Experteneinblicke zu Immobilienkauf, besten Gegenden, Lebenshaltungskosten und Investitionsmöglichkeiten.",
      speakableSummary: "Del Sol Prime Homes Location Intelligence Hub bietet umfassende Immobilienführer für 11 Städte an der Costa del Sol."
    },
    fr: {
      title: "Guides des Emplacements Costa del Sol | Del Sol Prime Homes",
      description: "Explorez des guides d'emplacement complets pour la Costa del Sol. Informations d'experts sur l'achat immobilier, les meilleurs quartiers et les opportunités d'investissement.",
      speakableSummary: "Del Sol Prime Homes Location Intelligence Hub fournit des guides immobiliers complets pour 11 villes de la Costa del Sol."
    },
    sv: {
      title: "Costa del Sol Platsguider | Del Sol Prime Homes",
      description: "Utforska omfattande platsguider för Costa del Sol. Expertinsikter om fastighetsköp, bästa områden och investeringsmöjligheter.",
      speakableSummary: "Del Sol Prime Homes Location Intelligence Hub erbjuder omfattande fastighetsguider för 11 städer på Costa del Sol."
    },
    no: {
      title: "Costa del Sol Stedsguider | Del Sol Prime Homes",
      description: "Utforsk omfattende stedsguider for Costa del Sol. Ekspertinnsikt om eiendomskjøp, beste områder og investeringsmuligheter.",
      speakableSummary: "Del Sol Prime Homes Location Intelligence Hub tilbyr omfattende eiendomsguider for 11 byer på Costa del Sol."
    },
    da: {
      title: "Costa del Sol Stedguider | Del Sol Prime Homes",
      description: "Udforsk omfattende stedguider for Costa del Sol. Ekspertindsigt i ejendomskøb, bedste områder og investeringsmuligheder.",
      speakableSummary: "Del Sol Prime Homes Location Intelligence Hub tilbyder omfattende ejendomsguider til 11 byer på Costa del Sol."
    },
    fi: {
      title: "Costa del Sol Sijaintioppaat | Del Sol Prime Homes",
      description: "Tutustu kattaviin sijaintioppaisiin Costa del Solille. Asiantuntijatietoa kiinteistöjen ostosta ja sijoitusmahdollisuuksista.",
      speakableSummary: "Del Sol Prime Homes Location Intelligence Hub tarjoaa kattavat kiinteistöoppaat 11 kaupungille Costa del Solilla."
    },
    pl: {
      title: "Przewodniki po Lokalizacjach Costa del Sol | Del Sol Prime Homes",
      description: "Odkryj kompleksowe przewodniki po lokalizacjach Costa del Sol. Eksperckie informacje o zakupie nieruchomości i możliwościach inwestycyjnych.",
      speakableSummary: "Del Sol Prime Homes Location Intelligence Hub zapewnia kompleksowe przewodniki po nieruchomościach dla 11 miast na Costa del Sol."
    },
    hu: {
      title: "Costa del Sol Helyszín Útmutatók | Del Sol Prime Homes",
      description: "Fedezze fel a Costa del Sol átfogó helyszín útmutatóit. Szakértői betekintés az ingatlanvásárlásba és befektetési lehetőségekbe.",
      speakableSummary: "A Del Sol Prime Homes Location Intelligence Hub átfogó ingatlanos útmutatókat kínál 11 városhoz a Costa del Sol-on."
    }
  }
  
  const content = hubContent[lang] || hubContent.en
  
  // Generate hreflang tags for all 10 languages + x-default
  const hreflangTags = SUPPORTED_LANGUAGES.map(langCode => 
    `  <link rel="alternate" hreflang="${langCode}" href="${BASE_URL}/${langCode}/${hubType}" />`
  ).join('\n')
  const xDefaultTag = `  <link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/${hubType}" />`
  
  // Generate JSON-LD schema
  const schemaGraph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        "name": "Del Sol Prime Homes",
        "url": BASE_URL,
        "logo": {
          "@type": "ImageObject",
          "url": `${BASE_URL}/assets/logo-new.png`
        }
      },
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        "url": canonicalUrl,
        "name": content.title,
        "description": content.description,
        "inLanguage": locale,
        "speakable": {
          "@type": "SpeakableSpecification",
          "cssSelector": ["#speakable-summary", ".speakable-hub-intro", ".speakable-answer"]
        }
      },
      {
        "@type": "CollectionPage",
        "@id": `${canonicalUrl}#collectionpage`,
        "name": content.title,
        "url": canonicalUrl,
        "inLanguage": locale
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/${lang}` },
          { "@type": "ListItem", "position": 2, "name": "Locations", "item": canonicalUrl }
        ]
      }
    ]
  }
  
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
  <meta name="description" content="${content.description}">
  
  <!-- Canonical -->
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Hreflang tags - 10 languages + x-default -->
${hreflangTags}
${xDefaultTag}
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${content.title}">
  <meta property="og:description" content="${content.description}">
  <meta property="og:locale" content="${locale}">
  <meta property="og:site_name" content="Del Sol Prime Homes">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${content.title}">
  <meta name="twitter:description" content="${content.description}">
  
  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  ${JSON.stringify(schemaGraph, null, 2)}
  </script>
  
  <!-- Redirect to React app for hydration -->
  <meta http-equiv="refresh" content="0;url=/${lang}/${hubType}">
</head>
<body>
  <!-- Speakable summary for AI/voice assistants -->
  <div id="speakable-summary">
    ${content.speakableSummary}
  </div>
  
  <h1>${content.title}</h1>
  <p>${content.description}</p>
  
  <script>window.location.href='/${lang}/${hubType}';</script>
  <noscript>
    <p>Loading <a href="/${lang}/${hubType}">${content.title}</a>...</p>
  </noscript>
</body>
</html>`
}

// ============================================================
// BUYERS GUIDE SEO TRANSLATIONS - All 10 languages
// ============================================================
const BUYERS_GUIDE_META: Record<string, { 
  title: string; 
  description: string;
  headline: string;
  subheadline: string;
}> = {
  en: {
    title: "Complete Buyers Guide to Costa del Sol Property | Del Sol Prime Homes",
    description: "Your comprehensive guide to buying property on the Costa del Sol. Step-by-step process, costs, legal requirements, and expert advice.",
    headline: "The Complete Guide to Buying Property on Costa del Sol",
    subheadline: "Everything you need to know about buying your dream home in Spain's most desirable region."
  },
  nl: {
    title: "Complete Gids voor het Kopen van Vastgoed aan de Costa del Sol | Del Sol Prime Homes",
    description: "Uw uitgebreide gids voor het kopen van onroerend goed aan de Costa del Sol. Stap-voor-stap proces, kosten, juridische vereisten en deskundig advies.",
    headline: "De Complete Gids voor het Kopen van Vastgoed aan de Costa del Sol",
    subheadline: "Alles wat u moet weten over het kopen van uw droomhuis in de meest gewilde regio van Spanje."
  },
  de: {
    title: "Vollständiger Käuferleitfaden für Immobilien an der Costa del Sol | Del Sol Prime Homes",
    description: "Ihr umfassender Leitfaden zum Immobilienkauf an der Costa del Sol. Schritt-für-Schritt-Prozess, Kosten, rechtliche Anforderungen und Expertenberatung.",
    headline: "Der Komplette Leitfaden zum Immobilienkauf an der Costa del Sol",
    subheadline: "Alles, was Sie über den Kauf Ihres Traumhauses in Spaniens begehrtester Region wissen müssen."
  },
  fr: {
    title: "Guide Complet pour Acheter une Propriété sur la Costa del Sol | Del Sol Prime Homes",
    description: "Votre guide complet pour l'achat immobilier sur la Costa del Sol. Processus étape par étape, coûts, exigences légales et conseils d'experts.",
    headline: "Le Guide Complet pour Acheter une Propriété sur la Costa del Sol",
    subheadline: "Tout ce que vous devez savoir sur l'achat de votre maison de rêve dans la région la plus convoitée d'Espagne."
  },
  sv: {
    title: "Komplett Köparguide för Fastigheter på Costa del Sol | Del Sol Prime Homes",
    description: "Din kompletta guide till fastighetsköp på Costa del Sol. Steg-för-steg-process, kostnader, juridiska krav och expertråd.",
    headline: "Den Kompletta Guiden till att Köpa Fastighet på Costa del Sol",
    subheadline: "Allt du behöver veta om att köpa ditt drömhem i Spaniens mest eftertraktade region."
  },
  no: {
    title: "Komplett Kjøperguide for Eiendom på Costa del Sol | Del Sol Prime Homes",
    description: "Din komplette guide til eiendomskjøp på Costa del Sol. Steg-for-steg-prosess, kostnader, juridiske krav og ekspertråd.",
    headline: "Den Komplette Guiden til å Kjøpe Eiendom på Costa del Sol",
    subheadline: "Alt du trenger å vite om å kjøpe drømmeboligen din i Spanias mest ettertraktede region."
  },
  da: {
    title: "Komplet Køberguide til Ejendom på Costa del Sol | Del Sol Prime Homes",
    description: "Din komplette guide til ejendomskøb på Costa del Sol. Trin-for-trin-proces, omkostninger, juridiske krav og ekspertrådgivning.",
    headline: "Den Komplette Guide til at Købe Ejendom på Costa del Sol",
    subheadline: "Alt hvad du behøver at vide om at købe dit drømmehjem i Spaniens mest eftertragtede region."
  },
  fi: {
    title: "Täydellinen Ostajan Opas Costa del Sol Kiinteistöihin | Del Sol Prime Homes",
    description: "Kattava oppaasi kiinteistön ostamiseen Costa del Solilta. Vaiheittainen prosessi, kustannukset, oikeudelliset vaatimukset ja asiantuntijaneuvot.",
    headline: "Täydellinen Opas Kiinteistön Ostamiseen Costa del Solilta",
    subheadline: "Kaikki mitä sinun tarvitsee tietää unelmiesi kodin ostamisesta Espanjan halutuimmalta alueelta."
  },
  pl: {
    title: "Kompletny Przewodnik Kupującego Nieruchomości na Costa del Sol | Del Sol Prime Homes",
    description: "Twój kompleksowy przewodnik po zakupie nieruchomości na Costa del Sol. Proces krok po kroku, koszty, wymogi prawne i porady ekspertów.",
    headline: "Kompletny Przewodnik po Zakupie Nieruchomości na Costa del Sol",
    subheadline: "Wszystko, co musisz wiedzieć o zakupie wymarzonego domu w najbardziej pożądanym regionie Hiszpanii."
  },
  hu: {
    title: "Teljes Vásárlói Útmutató Costa del Sol Ingatlanokhoz | Del Sol Prime Homes",
    description: "Átfogó útmutatója ingatlanvásárláshoz a Costa del Solon. Lépésről lépésre folyamat, költségek, jogi követelmények és szakértői tanácsok.",
    headline: "A Teljes Útmutató Ingatlanvásárláshoz a Costa del Solon",
    subheadline: "Minden, amit tudnia kell álmai otthonának megvásárlásáról Spanyolország legkeresettebb régiójában."
  }
}

/**
 * Generate full SEO HTML for Buyers Guide pages (e.g., /{lang}/buyers-guide)
 * Includes all metadata, hreflang tags, and JSON-LD schema
 */
function generateBuyersGuidePageHtml(lang: string): string {
  const locale = LOCALE_MAP[lang] || 'en_GB'
  const canonicalUrl = `${BASE_URL}/${lang}/buyers-guide`
  const content = BUYERS_GUIDE_META[lang] || BUYERS_GUIDE_META.en
  
  // Generate hreflang tags for all 10 languages + x-default
  const hreflangTags = SUPPORTED_LANGUAGES.map(langCode => 
    `  <link rel="alternate" hreflang="${langCode}" href="${BASE_URL}/${langCode}/buyers-guide" />`
  ).join('\n')
  const xDefaultTag = `  <link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/buyers-guide" />`
  
  // Generate JSON-LD schema with WebPage and HowTo types
  const schemaGraph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        "name": "Del Sol Prime Homes",
        "url": BASE_URL,
        "logo": {
          "@type": "ImageObject",
          "url": `${BASE_URL}/assets/logo-new.png`
        }
      },
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        "url": canonicalUrl,
        "name": content.title,
        "description": content.description,
        "inLanguage": locale,
        "isPartOf": { "@id": `${BASE_URL}/#website` },
        "speakable": {
          "@type": "SpeakableSpecification",
          "cssSelector": ["#speakable-summary", ".speakable-answer"]
        }
      },
      {
        "@type": "HowTo",
        "@id": `${canonicalUrl}#howto`,
        "name": content.headline,
        "description": content.description,
        "inLanguage": locale,
        "totalTime": "P3M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "EUR",
          "value": "10-13%",
          "description": "Additional costs on top of purchase price"
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/${lang}` },
          { "@type": "ListItem", "position": 2, "name": "Buyers Guide", "item": canonicalUrl }
        ]
      }
    ]
  }
  
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
  <meta name="description" content="${content.description}">
  
  <!-- Canonical -->
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Hreflang tags - 10 languages + x-default -->
${hreflangTags}
${xDefaultTag}
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${content.title}">
  <meta property="og:description" content="${content.description}">
  <meta property="og:locale" content="${locale}">
  <meta property="og:site_name" content="Del Sol Prime Homes">
  <meta property="og:image" content="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80">
  <meta property="og:image:alt" content="${content.headline}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${content.title}">
  <meta name="twitter:description" content="${content.description}">
  <meta name="twitter:image" content="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80">
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@400;700&family=Raleway:wght@400;500;600;700&display=swap">
  
  <!-- Critical inline CSS for initial render -->
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Lato', sans-serif; margin: 0; padding: 0; background: #fff; color: #1a1a1a; }
    .seo-content { max-width: 800px; margin: 4rem auto; padding: 0 1.5rem; text-align: center; }
    h1 { font-family: 'Playfair Display', serif; font-size: 2.5rem; line-height: 1.2; margin-bottom: 1rem; color: #1a1a1a; }
    .seo-content p { font-size: 1.125rem; line-height: 1.7; color: #4a4a4a; margin-bottom: 1rem; }
    #speakable-summary { font-size: 1rem; color: #666; max-width: 600px; margin: 0 auto 2rem; }
  </style>
  
  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  ${JSON.stringify(schemaGraph, null, 2)}
  </script>
</head>
<body>
  <div id="root">
    <!-- Static SEO content - React will hydrate this -->
    <main class="seo-content">
      <h1>${content.headline}</h1>
      <p>${content.subheadline}</p>
      <p id="speakable-summary">${content.description}</p>
    </main>
  </div>
  
  <!-- React bootstrap - loads the full app -->
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`
}

// Removed FAQPage schema generation - QAPage schema is sufficient for single Q&A pages
// FAQPage was causing redundancy with QAPage

/**
 * Hans' AEO Rules: Truncate answer at sentence boundary for AI-safe schema
 * - Max 800 characters
 * - Max 150 words
 * - No list formatting allowed
 */
function truncateAtSentence(text: string, maxChars: number = 800): string {
  const MAX_WORDS = 150;
  const MIN_LENGTH = 160;
  
  // Strip HTML tags for clean processing
  let cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Check for list patterns and clean them (Hans' AEO rule: no lists)
  const listPatterns = [
    /^\d+\.\s/m,           // Numbered lists at line start
    /^[-*•]\s/m,           // Bullet points at line start  
    /\n\s*\d+\.\s/,        // Numbered lists mid-text
    /\n\s*[-*•]\s/,        // Bullets mid-text
  ];
  
  for (const pattern of listPatterns) {
    if (pattern.test(cleanText)) {
      // Clean list formatting - convert to flowing prose
      cleanText = cleanText.replace(/^\s*\d+\.\s+/gm, '');
      cleanText = cleanText.replace(/\n\s*\d+\.\s+/g, ' ');
      cleanText = cleanText.replace(/^\s*[-*•]\s+/gm, '');
      cleanText = cleanText.replace(/\n\s*[-*•]\s+/g, ' ');
      cleanText = cleanText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      break;
    }
  }
  
  // Check word count first (Hans' rule: max 150 words)
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  if (words.length > MAX_WORDS) {
    cleanText = words.slice(0, MAX_WORDS).join(' ');
  }
  
  // Now check character limit (Hans' rule: max 800 chars)
  if (cleanText.length <= maxChars) {
    // Ensure proper ending
    if (!cleanText.endsWith('.') && !cleanText.endsWith('!') && !cleanText.endsWith('?')) {
      cleanText = cleanText.trim() + '.';
    }
    return cleanText;
  }
  
  // Need to truncate - find sentence boundary
  const truncated = cleanText.substring(0, maxChars);
  
  // Find last sentence ending
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclamation = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  
  const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
  
  if (lastSentenceEnd >= MIN_LENGTH) {
    return cleanText.substring(0, lastSentenceEnd + 1).trim();
  }
  
  // Fallback: truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace >= MIN_LENGTH) {
    return cleanText.substring(0, lastSpace).trim() + '.';
  }
  
  // Final fallback
  return cleanText.substring(0, MIN_LENGTH).trim() + '...';
}

function generateQAPageSchema(metadata: PageMetadata): string {
  // For QA pages, use QAPage schema with full authority signals (Hans' E-E-A-T requirements)
  // Content must be in the page's language (no hardcoded English)
  const schema = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    "@id": `${metadata.canonical_url}#qapage`,
    "headline": metadata.headline, // This comes from question_main in the DB (in page's language)
    "inLanguage": LOCALE_MAP[metadata.language] || metadata.language,
    "url": metadata.canonical_url,
    "datePublished": metadata.date_published || new Date().toISOString(),
    "dateModified": metadata.date_modified || metadata.date_published || new Date().toISOString(),
    "author": {
      "@type": "Person",
      "@id": `${BASE_URL}/#hans-beeckman`,
      "name": "Hans Beeckman",
      "jobTitle": "Senior Real Estate Advisor"
    },
    "publisher": ORGANIZATION_SCHEMA,
    "mainEntity": {
      "@type": "Question",
      "name": metadata.headline, // In page's language
      "text": metadata.headline,
      "answerCount": 1,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": truncateAtSentence(metadata.speakable_answer?.replace(/<[^>]*>/g, '') || '', 600),
        "inLanguage": LOCALE_MAP[metadata.language] || metadata.language,
        "author": {
          "@type": "Person",
          "@id": `${BASE_URL}/#hans-beeckman`
        }
      }
    }
  }

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
}

// Organization schema for publisher
const ORGANIZATION_SCHEMA = {
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  "name": "Del Sol Prime Homes",
  "url": BASE_URL,
  "logo": {
    "@type": "ImageObject",
    "url": `${BASE_URL}/assets/logo-new.png`,
    "width": 512,
    "height": 512
  },
  "sameAs": [
    "https://www.linkedin.com/company/del-sol-prime-homes"
  ],
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Marbella",
    "addressRegion": "Málaga",
    "addressCountry": "ES"
  },
  "hasCredential": {
    "@type": "EducationalOccupationalCredential",
    "credentialCategory": "license",
    "name": "Agente de la Propiedad Inmobiliaria (API)",
    "recognizedBy": {
      "@type": "Organization",
      "name": "Colegio Oficial de Agentes de la Propiedad Inmobiliaria"
    }
  }
}

// Founder Person schemas with LinkedIn sameAs
const FOUNDERS_SCHEMAS = [
  {
    "@type": "Person",
    "@id": `${BASE_URL}/#steven-roberts`,
    "name": "Steven Roberts",
    "jobTitle": "Managing Director",
    "sameAs": "https://www.linkedin.com/company/delsolprimehomes/",
    "worksFor": { "@id": `${BASE_URL}/#organization` }
  },
  {
    "@type": "Person",
    "@id": `${BASE_URL}/#hans-beeckman`,
    "name": "Hans Beeckman",
    "jobTitle": "Sales Director",
    "sameAs": "https://www.linkedin.com/in/hansbeeckman/",
    "worksFor": { "@id": `${BASE_URL}/#organization` }
  },
  {
    "@type": "Person",
    "@id": `${BASE_URL}/#cedric-van-hecke`,
    "name": "Cédric Van Hecke",
    "jobTitle": "Marketing Director",
    "sameAs": "https://www.linkedin.com/company/delsolprimehomes/",
    "worksFor": { "@id": `${BASE_URL}/#organization` }
  }
]

function generateOrganizationSchema(): string {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      ORGANIZATION_SCHEMA,
      ...FOUNDERS_SCHEMAS
    ]
  }
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
}

function generateBlogPostingSchema(metadata: PageMetadata): string {
  // Only generate BlogPosting schema for blog content
  if (metadata.content_type !== 'blog') {
    return ''
  }
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${metadata.canonical_url}#blogposting`,
    "headline": metadata.headline,
    "description": metadata.meta_description,
    "image": {
      "@type": "ImageObject",
      "url": metadata.featured_image_url || `${BASE_URL}/assets/logo-new.png`,
      "caption": metadata.featured_image_alt || metadata.headline
    },
    "datePublished": metadata.date_published || new Date().toISOString(),
    "dateModified": metadata.date_modified || metadata.date_published || new Date().toISOString(),
    "inLanguage": LOCALE_MAP[metadata.language] || metadata.language,
    "author": {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      "name": "Del Sol Prime Homes"
    },
    "publisher": ORGANIZATION_SCHEMA,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": metadata.canonical_url
    },
    "isPartOf": {
      "@type": "Blog",
      "@id": `${BASE_URL}/${metadata.language}/blog#blog`,
      "name": "Del Sol Prime Homes Blog",
      "publisher": {
        "@id": `${BASE_URL}/#organization`
      }
    }
  }

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
}

function generateBreadcrumbSchema(metadata: PageMetadata): string {
  const pathMap: Record<string, { name: string; path: string }> = {
    blog: { name: 'Blog', path: 'blog' },
    qa: { name: 'Q&A', path: 'qa' },
    compare: { name: 'Comparisons', path: 'compare' },
    locations: { name: 'Locations', path: 'locations' }
  }
  
  const section = pathMap[metadata.content_type] || { name: 'Content', path: '' }
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${BASE_URL}/${metadata.language}`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": section.name,
        "item": `${BASE_URL}/${metadata.language}/${section.path}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": metadata.headline,
        "item": metadata.canonical_url
      }
    ]
  }

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
}

function generateArticleSchema(metadata: PageMetadata): string {
  // Only generate Article schema for comparison/location content
  if (metadata.content_type === 'qa' || metadata.content_type === 'blog') {
    return '' // QA pages use QAPage, blog uses BlogPosting
  }
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${metadata.canonical_url}#article`,
    "headline": metadata.headline,
    "description": metadata.meta_description,
    "image": metadata.featured_image_url || `${BASE_URL}/assets/logo-new.png`,
    "datePublished": metadata.date_published || new Date().toISOString(),
    "dateModified": metadata.date_modified || new Date().toISOString(),
    "inLanguage": LOCALE_MAP[metadata.language] || metadata.language,
    "author": {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      "name": "Del Sol Prime Homes"
    },
    "publisher": ORGANIZATION_SCHEMA,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": metadata.canonical_url
    }
  }

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
}

function generateSpeakableSchema(metadata: PageMetadata): string {
  // Generate SpeakableSpecification for AI/voice assistants
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${metadata.canonical_url}#webpage-speakable`,
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [
        ".speakable-answer",
        ".comparison-summary",
        ".tl-dr-summary",
        ".speakable-box"
      ]
    },
    "url": metadata.canonical_url
  }

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
}

function generateComparisonTableSchema(metadata: PageMetadata, comparisonTable: any[]): string {
  // Only generate Table schema for comparison pages with comparison data
  if (metadata.content_type !== 'compare' || !comparisonTable || comparisonTable.length === 0) {
    return ''
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "Table",
    "@id": `${metadata.canonical_url}#comparison-table`,
    "about": metadata.headline,
    "description": `Comparison table for ${metadata.headline}`,
    "mainEntity": comparisonTable.map((row: any, index: number) => ({
      "@type": "ItemList",
      "position": index + 1,
      "name": row.attribute || row.name,
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "item": { "@type": "Thing", "name": row.option_a || row.optionA } },
        { "@type": "ListItem", "position": 2, "item": { "@type": "Thing", "name": row.option_b || row.optionB } }
      ]
    }))
  }

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Generate SSR styles for server-rendered content
 */
function generateSSRStyles(): string {
  return `
    <style>
      /* Del Sol Prime Homes Brand Design System */
      :root {
        --prime-gold: 43 74% 49%;
        --prime-gold-dark: 43 74% 40%;
        --prime-950: 220 20% 10%;
        --foreground: 220 20% 10%;
        --muted-foreground: 220 10% 45%;
        --background: 0 0% 100%;
        --card-bg: 0 0% 98%;
        --border: 220 13% 91%;
      }
      
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      body { 
        font-family: 'Lato', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        line-height: 1.7;
        color: hsl(var(--foreground));
        background: hsl(var(--background));
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      h1, h2, h3, h4, h5, h6 {
        font-family: 'Playfair Display', Georgia, serif;
        font-weight: 600;
        color: hsl(var(--prime-950));
      }
      
      /* Header - Sticky with Brand Shadow */
      .site-header { 
        background: hsl(var(--background)); 
        border-bottom: 1px solid hsl(var(--border)); 
        padding: 1rem 0;
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }
      .nav-container { 
        max-width: 1280px; 
        margin: 0 auto; 
        padding: 0 1.5rem; 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
      }
      .logo { height: 44px; width: auto; }
      .logo-link { display: flex; align-items: center; }
      .nav-links { display: flex; gap: 2rem; list-style: none; }
      .nav-links a { 
        color: hsl(var(--muted-foreground)); 
        text-decoration: none; 
        font-weight: 500;
        font-size: 0.95rem;
        transition: color 0.2s ease;
      }
      .nav-links a:hover { color: hsl(var(--prime-gold)); }
      
      /* Article Container */
      .article-container { 
        max-width: 800px; 
        margin: 0 auto; 
        padding: clamp(1.5rem, 5vw, 3rem) 1.5rem; 
      }
      .article-header { margin-bottom: 2rem; }
      
      h1 { 
        font-size: clamp(1.75rem, 4vw, 2.75rem); 
        font-weight: 700; 
        line-height: 1.15; 
        margin-bottom: 1rem;
        letter-spacing: -0.02em;
      }
      
      .article-meta { 
        color: hsl(var(--muted-foreground)); 
        font-size: 0.875rem; 
        display: flex; 
        gap: 1rem;
        flex-wrap: wrap;
        align-items: center;
      }
      .read-time { 
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
      }
      .read-time::before {
        content: '•';
        margin-right: 0.5rem;
      }
      
      /* Featured Image */
      .featured-image { 
        margin: 2rem 0; 
        border-radius: 16px; 
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      }
      .featured-image img { 
        width: 100%; 
        height: auto; 
        display: block;
        aspect-ratio: 16/9;
        object-fit: cover;
      }
      
      /* Speakable Summary Box - Brand Gold Gradient */
      .speakable-summary { 
        background: linear-gradient(135deg, hsl(48 100% 96%) 0%, hsl(48 96% 89%) 100%);
        padding: 1.75rem; 
        border-radius: 12px; 
        margin: 2rem 0;
        border-left: 5px solid hsl(var(--prime-gold));
        position: relative;
        box-shadow: 0 2px 12px rgba(201, 162, 39, 0.1);
      }
      .speakable-summary::before {
        content: 'Quick Answer';
        display: block;
        font-family: 'Lato', sans-serif;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: hsl(var(--prime-gold-dark));
        margin-bottom: 0.75rem;
      }
      .speakable-summary p { 
        font-size: 1.1rem; 
        line-height: 1.75;
        color: hsl(35 60% 20%); 
        font-weight: 500; 
      }
      
      /* Content Styling */
      .article-content { 
        font-size: clamp(1rem, 2vw, 1.125rem);
        line-height: 1.8;
      }
      .article-content h2 { 
        font-size: clamp(1.5rem, 3vw, 1.875rem); 
        margin: 3rem 0 1.25rem;
        padding-top: 1rem;
      }
      .article-content h3 { 
        font-size: clamp(1.25rem, 2.5vw, 1.5rem); 
        margin: 2.5rem 0 1rem; 
      }
      .article-content p { margin: 1.25rem 0; }
      .article-content ul, .article-content ol { 
        margin: 1.25rem 0; 
        padding-left: 1.75rem; 
      }
      .article-content li { 
        margin: 0.625rem 0;
        padding-left: 0.25rem;
      }
      .article-content a { 
        color: hsl(var(--prime-gold-dark)); 
        text-decoration: underline;
        text-underline-offset: 2px;
        transition: color 0.2s ease;
      }
      .article-content a:hover {
        color: hsl(var(--prime-gold));
      }
      .article-content blockquote { 
        border-left: 4px solid hsl(var(--prime-gold)); 
        padding: 1rem 1.5rem; 
        margin: 2rem 0; 
        font-style: italic;
        background: hsl(var(--card-bg));
        border-radius: 0 8px 8px 0;
        color: hsl(var(--muted-foreground)); 
      }
      .article-content img { 
        max-width: 100%; 
        height: auto; 
        border-radius: 12px; 
        margin: 2rem 0;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
      }
      .article-content table {
        width: 100%;
        border-collapse: collapse;
        margin: 2rem 0;
        font-size: 0.95rem;
      }
      .article-content th {
        background: hsl(var(--prime-950));
        color: white;
        padding: 0.875rem 1rem;
        text-align: left;
        font-weight: 600;
      }
      .article-content td {
        padding: 0.875rem 1rem;
        border-bottom: 1px solid hsl(var(--border));
      }
      .article-content tr:nth-child(even) td {
        background: hsl(var(--card-bg));
      }
      
      /* FAQ Section */
      .faq-section { 
        margin: 3rem 0; 
        padding: 2rem; 
        background: hsl(var(--card-bg)); 
        border-radius: 16px;
        border: 1px solid hsl(var(--border));
      }
      .faq-section h2 { 
        margin-bottom: 1.5rem;
        font-size: 1.5rem;
      }
      .faq-item { 
        background: hsl(var(--background));
        border: 1px solid hsl(var(--border));
        border-left: 4px solid hsl(var(--prime-gold));
        border-radius: 8px;
        margin-bottom: 1rem;
        overflow: hidden;
      }
      .faq-item summary { 
        font-weight: 600; 
        cursor: pointer; 
        color: hsl(var(--prime-950));
        padding: 1rem 1.25rem;
        list-style: none;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .faq-item summary::-webkit-details-marker { display: none; }
      .faq-item summary::after {
        content: '+';
        font-size: 1.25rem;
        color: hsl(var(--prime-gold));
        font-weight: 400;
      }
      .faq-item[open] summary::after { content: '−'; }
      .faq-item p { 
        padding: 0 1.25rem 1rem;
        color: hsl(var(--muted-foreground));
        line-height: 1.7;
      }
      
      /* CTA Section */
      .cta-section { 
        background: linear-gradient(135deg, hsl(var(--prime-950)) 0%, hsl(220 25% 15%) 100%);
        color: white;
        padding: clamp(2rem, 5vw, 3rem);
        border-radius: 16px;
        margin: 3rem 0;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      }
      .cta-section h3 { 
        font-size: clamp(1.25rem, 3vw, 1.625rem); 
        margin-bottom: 0.875rem;
        color: white;
      }
      .cta-section p { 
        margin-bottom: 1.5rem; 
        opacity: 0.9;
        font-size: 1.05rem;
        max-width: 500px;
        margin-left: auto;
        margin-right: auto;
      }
      .cta-button { 
        display: inline-block;
        background: linear-gradient(135deg, hsl(var(--prime-gold)) 0%, hsl(var(--prime-gold-dark)) 100%);
        color: hsl(var(--prime-950));
        padding: 1rem 2.5rem;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 700;
        font-size: 1rem;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        box-shadow: 0 4px 16px rgba(201, 162, 39, 0.25);
      }
      .cta-button:hover { 
        transform: translateY(-3px); 
        box-shadow: 0 8px 24px rgba(201, 162, 39, 0.35);
      }
      
      /* Footer */
      .site-footer { 
        background: hsl(var(--prime-950)); 
        color: hsl(220 10% 65%); 
        padding: 2.5rem 0; 
        margin-top: 4rem;
        border-top: 4px solid hsl(var(--prime-gold));
      }
      .footer-content { 
        max-width: 1280px; 
        margin: 0 auto; 
        padding: 0 1.5rem; 
        display: flex; 
        justify-content: space-between; 
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
      }
      .footer-content p {
        font-size: 0.875rem;
      }
      .footer-nav { display: flex; gap: 1.5rem; }
      .footer-nav a { 
        color: hsl(220 10% 65%); 
        text-decoration: none;
        font-size: 0.875rem;
        transition: color 0.2s ease;
      }
      .footer-nav a:hover { color: hsl(var(--prime-gold)); }
      
      /* Location/Area Cards */
      .area-card {
        background: hsl(var(--background));
        border: 1px solid hsl(var(--border));
        border-radius: 12px;
        padding: 1.5rem;
        margin: 1rem 0;
        transition: box-shadow 0.2s ease;
      }
      .area-card:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      }
      
      /* Responsive Design */
      @media (max-width: 768px) {
        .nav-links { display: none; }
        .cta-section { padding: 1.75rem; }
        .footer-content { 
          flex-direction: column; 
          text-align: center; 
        }
        .footer-nav { justify-content: center; }
        .speakable-summary { padding: 1.25rem; }
        .faq-section { padding: 1.5rem; }
      }
      
      /* Print Styles */
      @media print {
        .site-header, .site-footer, .cta-section { display: none; }
        .article-container { max-width: 100%; padding: 0; }
      }
    </style>
  `
}

/**
 * Generate the article body HTML for SSR
 */
function generateArticleBody(metadata: PageMetadata): string {
  const lang = metadata.language
  const langPrefix = `/${lang}`
  
  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString(lang === 'de' ? 'de-DE' : lang === 'nl' ? 'nl-NL' : lang === 'fr' ? 'fr-FR' : 'en-GB', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }
  
  // Generate FAQ section if qa_entities exist
  const faqSection = metadata.qa_entities?.length ? `
    <section class="faq-section">
      <h2>Frequently Asked Questions</h2>
      ${metadata.qa_entities.map((faq: any) => `
        <details class="faq-item">
          <summary>${escapeHtml(faq.question)}</summary>
          <p>${escapeHtml(faq.answer)}</p>
        </details>
      `).join('')}
    </section>
  ` : ''
  
  // Main content based on content type
  let mainContent = ''
  
  if (metadata.content_type === 'blog' && metadata.detailed_content) {
    mainContent = metadata.detailed_content
  } else if (metadata.content_type === 'qa' && metadata.answer_main) {
    mainContent = metadata.answer_main
  } else if (metadata.content_type === 'compare' && metadata.final_verdict) {
    mainContent = metadata.final_verdict
  } else if (metadata.content_type === 'locations' && metadata.location_overview) {
    mainContent = metadata.location_overview
  }
  
  // CTA text based on language
  const ctaTexts: Record<string, { title: string; text: string; button: string }> = {
    en: { title: "Ready to Find Your Dream Property in Costa del Sol?", text: "Contact Del Sol Prime Homes for expert guidance on luxury real estate.", button: "Get in Touch" },
    nl: { title: "Klaar om Uw Droomwoning aan de Costa del Sol te Vinden?", text: "Neem contact op met Del Sol Prime Homes voor deskundige begeleiding.", button: "Neem Contact Op" },
    de: { title: "Bereit, Ihre Traumimmobilie an der Costa del Sol zu Finden?", text: "Kontaktieren Sie Del Sol Prime Homes für kompetente Beratung.", button: "Kontakt Aufnehmen" },
    fr: { title: "Prêt à Trouver Votre Propriété de Rêve sur la Costa del Sol?", text: "Contactez Del Sol Prime Homes pour des conseils d'experts.", button: "Nous Contacter" },
  }
  const cta = ctaTexts[lang] || ctaTexts.en
  
  // Nav labels based on language
  const navTexts: Record<string, { properties: string; blog: string; contact: string; locations: string }> = {
    en: { properties: 'Properties', blog: 'Blog', contact: 'Contact', locations: 'Locations' },
    nl: { properties: 'Vastgoed', blog: 'Blog', contact: 'Contact', locations: 'Locaties' },
    de: { properties: 'Immobilien', blog: 'Blog', contact: 'Kontakt', locations: 'Standorte' },
    fr: { properties: 'Propriétés', blog: 'Blog', contact: 'Contact', locations: 'Emplacements' },
    sv: { properties: 'Fastigheter', blog: 'Blogg', contact: 'Kontakt', locations: 'Platser' },
    no: { properties: 'Eiendommer', blog: 'Blogg', contact: 'Kontakt', locations: 'Steder' },
    da: { properties: 'Ejendomme', blog: 'Blog', contact: 'Kontakt', locations: 'Steder' },
    fi: { properties: 'Kiinteistöt', blog: 'Blogi', contact: 'Yhteystiedot', locations: 'Sijainnit' },
    pl: { properties: 'Nieruchomości', blog: 'Blog', contact: 'Kontakt', locations: 'Lokalizacje' },
    hu: { properties: 'Ingatlanok', blog: 'Blog', contact: 'Kapcsolat', locations: 'Helyszínek' },
  }
  const nav = navTexts[lang] || navTexts.en

  return `
    <header class="site-header">
      <nav class="nav-container">
        <a href="${langPrefix}/" class="logo-link">
          <img src="https://ghhzfxtchlwmwibtkuds.supabase.co/storage/v1/object/public/site-assets/logo.png" alt="Del Sol Prime Homes" class="logo">
        </a>
        <div class="nav-links">
          <a href="${langPrefix}/properties">${nav.properties}</a>
          <a href="${langPrefix}/locations">${nav.locations}</a>
          <a href="${langPrefix}/blog">${nav.blog}</a>
          <a href="${langPrefix}/contact">${nav.contact}</a>
        </div>
      </nav>
    </header>
    
    <main class="article-container">
      <article itemscope itemtype="https://schema.org/${metadata.content_type === 'qa' ? 'QAPage' : 'BlogPosting'}">
        <header class="article-header">
          <h1 itemprop="headline">${escapeHtml(metadata.headline)}</h1>
          ${metadata.date_published ? `
            <div class="article-meta">
              <time datetime="${metadata.date_published}" itemprop="datePublished">
                ${formatDate(metadata.date_published)}
              </time>
              ${metadata.read_time ? `<span class="read-time">${metadata.read_time} min read</span>` : ''}
            </div>
          ` : ''}
        </header>
        
        ${metadata.featured_image_url ? `
          <figure class="featured-image">
            <img 
              src="${metadata.featured_image_url}" 
              alt="${escapeHtml(metadata.featured_image_alt || metadata.headline)}"
              itemprop="image"
              loading="eager"
              fetchpriority="high"
            >
          </figure>
        ` : ''}
        
        ${metadata.speakable_answer ? `
          <div class="speakable-summary speakable-answer" id="speakable-summary" itemprop="description">
            <p>${escapeHtml(metadata.speakable_answer)}</p>
          </div>
        ` : ''}
        
        <div class="article-content" itemprop="articleBody">
          ${mainContent || '<p>Content loading...</p>'}
        </div>
        
        ${faqSection}
        
        <div class="cta-section">
          <h3>${cta.title}</h3>
          <p>${cta.text}</p>
          <a href="${langPrefix}/contact" class="cta-button">${cta.button}</a>
        </div>
      </article>
    </main>
    
    <footer class="site-footer">
      <div class="footer-content">
        <p>&copy; ${new Date().getFullYear()} Del Sol Prime Homes. All rights reserved.</p>
        <nav class="footer-nav">
          <a href="${langPrefix}/privacy">Privacy</a>
          <a href="${langPrefix}/terms">Terms</a>
          <a href="${langPrefix}/contact">${nav.contact}</a>
        </nav>
      </div>
    </footer>
  `
}

function generateFullHtml(metadata: PageMetadata, hreflangTags: string, _baseHtml: string): string {
  const locale = LOCALE_MAP[metadata.language] || 'en_GB'
  const escapedTitle = escapeHtml(metadata.meta_title || metadata.headline || 'Del Sol Prime Homes')
  const escapedDescription = escapeHtml(metadata.meta_description || '')
  
  // Generate schemas based on content type
  const qaSchema = metadata.content_type === 'qa' ? generateQAPageSchema(metadata) : ''
  const blogPostingSchema = generateBlogPostingSchema(metadata)
  const articleSchema = generateArticleSchema(metadata)
  const breadcrumbSchema = generateBreadcrumbSchema(metadata)
  const speakableSchema = metadata.speakable_answer ? generateSpeakableSchema(metadata) : ''
  const comparisonTableSchema = generateComparisonTableSchema(metadata, metadata.quick_comparison_table || [])

  // Generate SSR styles and body content
  const ssrStyles = generateSSRStyles()
  const articleBody = generateArticleBody(metadata)

  const headContent = `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Google Fonts: Playfair Display + Lato -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Primary Meta Tags -->
  <title>${escapedTitle}</title>
  <meta name="title" content="${escapedTitle}" />
  <meta name="description" content="${escapedDescription}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  
  <!-- Canonical & Hreflang -->
  <link rel="canonical" href="${metadata.canonical_url}" />
${hreflangTags}
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="${metadata.content_type === 'blog' ? 'article' : 'website'}" />
  <meta property="og:url" content="${metadata.canonical_url}" />
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${escapedDescription}" />
  <meta property="og:image" content="${metadata.featured_image_url || `${BASE_URL}/assets/logo-new.png`}" />
  <meta property="og:image:alt" content="${escapeHtml(metadata.featured_image_alt) || escapedTitle}" />
  <meta property="og:locale" content="${locale}" />
  <meta property="og:site_name" content="Del Sol Prime Homes" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${metadata.canonical_url}" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${escapedDescription}" />
  <meta name="twitter:image" content="${metadata.featured_image_url || `${BASE_URL}/assets/logo-new.png`}" />
  <meta name="twitter:image:alt" content="${escapeHtml(metadata.featured_image_alt) || escapedTitle}" />
  
  <!-- Article Meta -->
  ${metadata.date_published ? `<meta property="article:published_time" content="${metadata.date_published}" />` : ''}
  ${metadata.date_modified ? `<meta property="article:modified_time" content="${metadata.date_modified}" />` : ''}
  
  <!-- Schema.org JSON-LD -->
  ${qaSchema}
  ${blogPostingSchema}
  ${articleSchema}
  ${breadcrumbSchema}
  ${speakableSchema}
  ${comparisonTableSchema}
  
  <!-- SSR Styles -->
  ${ssrStyles}
`

  // Build complete HTML with full SSR body content
  return `<!DOCTYPE html>
<html lang="${metadata.language}">
<head>${headContent}</head>
<body>
  ${articleBody}
</body>
</html>`
}

// Localized messages for 410 page
const GONE_PAGE_MESSAGES: Record<string, { title: string; subtitle: string; message: string; browseProperties: string; readBlog: string; home: string }> = {
  en: {
    title: 'Content Removed',
    subtitle: 'Page No Longer Available',
    message: 'This page has been permanently removed and is no longer available. We apologize for any inconvenience.',
    browseProperties: 'Browse Properties',
    readBlog: 'Read Our Blog',
    home: 'Go Home'
  },
  de: {
    title: 'Inhalt Entfernt',
    subtitle: 'Seite Nicht Mehr Verfügbar',
    message: 'Diese Seite wurde dauerhaft entfernt und ist nicht mehr verfügbar. Wir entschuldigen uns für etwaige Unannehmlichkeiten.',
    browseProperties: 'Immobilien Durchsuchen',
    readBlog: 'Blog Lesen',
    home: 'Startseite'
  },
  nl: {
    title: 'Inhoud Verwijderd',
    subtitle: 'Pagina Niet Meer Beschikbaar',
    message: 'Deze pagina is permanent verwijderd en is niet meer beschikbaar. Onze excuses voor het ongemak.',
    browseProperties: 'Vastgoed Bekijken',
    readBlog: 'Blog Lezen',
    home: 'Home'
  },
  fr: {
    title: 'Contenu Supprimé',
    subtitle: 'Page Non Disponible',
    message: 'Cette page a été définitivement supprimée et n\'est plus disponible. Nous nous excusons pour tout inconvénient.',
    browseProperties: 'Parcourir les Propriétés',
    readBlog: 'Lire le Blog',
    home: 'Accueil'
  },
  sv: {
    title: 'Innehåll Borttaget',
    subtitle: 'Sidan Inte Längre Tillgänglig',
    message: 'Den här sidan har tagits bort permanent och är inte längre tillgänglig. Vi ber om ursäkt för eventuella olägenheter.',
    browseProperties: 'Bläddra Fastigheter',
    readBlog: 'Läs Bloggen',
    home: 'Hem'
  },
  no: {
    title: 'Innhold Fjernet',
    subtitle: 'Siden Ikke Lenger Tilgjengelig',
    message: 'Denne siden er permanent fjernet og er ikke lenger tilgjengelig. Vi beklager eventuelle ulemper.',
    browseProperties: 'Bla Gjennom Eiendommer',
    readBlog: 'Les Bloggen',
    home: 'Hjem'
  },
  da: {
    title: 'Indhold Fjernet',
    subtitle: 'Siden Ikke Længere Tilgængelig',
    message: 'Denne side er blevet permanent fjernet og er ikke længere tilgængelig. Vi beklager eventuelle ulejligheder.',
    browseProperties: 'Gennemse Ejendomme',
    readBlog: 'Læs Bloggen',
    home: 'Hjem'
  },
  fi: {
    title: 'Sisältö Poistettu',
    subtitle: 'Sivu Ei Enää Saatavilla',
    message: 'Tämä sivu on poistettu pysyvästi eikä ole enää saatavilla. Pahoittelemme mahdollisia haittoja.',
    browseProperties: 'Selaa Kiinteistöjä',
    readBlog: 'Lue Blogia',
    home: 'Etusivu'
  },
  pl: {
    title: 'Treść Usunięta',
    subtitle: 'Strona Niedostępna',
    message: 'Ta strona została trwale usunięta i nie jest już dostępna. Przepraszamy za wszelkie niedogodności.',
    browseProperties: 'Przeglądaj Nieruchomości',
    readBlog: 'Czytaj Blog',
    home: 'Strona Główna'
  },
  hu: {
    title: 'Tartalom Eltávolítva',
    subtitle: 'Az Oldal Már Nem Elérhető',
    message: 'Ez az oldal véglegesen eltávolításra került és már nem érhető el. Elnézést kérünk a kellemetlenségért.',
    browseProperties: 'Ingatlanok Böngészése',
    readBlog: 'Blog Olvasása',
    home: 'Főoldal'
  }
}

/**
 * Generate 410 Gone HTML for deleted/ghost content
 * Enhanced with branding, navigation, and localized messaging
 */
function generate410GoneHtml(lang: string = 'en'): string {
  const messages = GONE_PAGE_MESSAGES[lang] || GONE_PAGE_MESSAGES.en
  const langPrefix = `/${lang}`
  
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="googlebot" content="noindex, nofollow">
  <title>410 - ${messages.title} | Del Sol Prime Homes</title>
  <link rel="icon" type="image/png" href="${BASE_URL}/favicon.png">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      display: flex; 
      flex-direction: column;
      justify-content: center; 
      align-items: center; 
      min-height: 100vh; 
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      color: #374151;
      padding: 1rem;
    }
    .logo-container {
      margin-bottom: 2rem;
    }
    .logo {
      height: 60px;
      width: auto;
    }
    .container { 
      text-align: center; 
      padding: 2.5rem; 
      max-width: 500px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.08);
    }
    .status-code {
      font-size: 5rem;
      font-weight: 800;
      color: #c9a227;
      line-height: 1;
      margin-bottom: 0.5rem;
    }
    h1 { 
      font-size: 1.75rem; 
      font-weight: 700;
      margin-bottom: 0.5rem; 
      color: #1f2937; 
    }
    .subtitle {
      font-size: 1rem;
      color: #6b7280;
      margin-bottom: 1.5rem;
    }
    p { 
      font-size: 1rem; 
      color: #4b5563; 
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .nav-links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
    }
    .nav-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    .nav-link.primary {
      background: linear-gradient(135deg, #c9a227 0%, #b8941f 100%);
      color: white;
    }
    .nav-link.primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(201, 162, 39, 0.35);
    }
    .nav-link.secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #e5e7eb;
    }
    .nav-link.secondary:hover {
      background: #e5e7eb;
    }
    .footer {
      margin-top: 2rem;
      font-size: 0.75rem;
      color: #9ca3af;
    }
    .footer a {
      color: #c9a227;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    @media (max-width: 480px) {
      .status-code { font-size: 4rem; }
      h1 { font-size: 1.5rem; }
      .nav-links { flex-direction: column; }
      .nav-link { width: 100%; justify-content: center; }
    }
  </style>
</head>
<body>
  <div class="logo-container">
    <a href="${langPrefix}/">
      <img src="${BASE_URL}/assets/logo-new.png" alt="Del Sol Prime Homes" class="logo">
    </a>
  </div>
  <div class="container">
    <div class="status-code">410</div>
    <h1>${messages.title}</h1>
    <p class="subtitle">${messages.subtitle}</p>
    <p>${messages.message}</p>
    <div class="nav-links">
      <a href="${langPrefix}/properties" class="nav-link primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        ${messages.browseProperties}
      </a>
      <a href="${langPrefix}/blog" class="nav-link secondary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
        ${messages.readBlog}
      </a>
      <a href="${langPrefix}/" class="nav-link secondary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        ${messages.home}
      </a>
    </div>
  </div>
  <div class="footer">
    © ${new Date().getFullYear()} <a href="${BASE_URL}">Del Sol Prime Homes</a> • Costa del Sol, Spain
  </div>
</body>
</html>`
}

/**
 * Check if a path looks like a content URL pattern
 * Returns the detected language if it matches, null otherwise
 */
function isContentPathPattern(path: string): { lang: string; type: string } | null {
  // Match patterns like: /en/blog/*, /es/qa/*, /de/locations/*, /fr/compare/*
  const contentPattern = /^\/([a-z]{2})\/(qa|blog|compare|locations)\//i
  const match = path.match(contentPattern)
  if (match) {
    return { lang: match[1].toLowerCase(), type: match[2].toLowerCase() }
  }
  return null
}

/**
 * Main request handler with timeout protection
 */
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const path = url.searchParams.get('path')
  
  // If no path parameter, check if this looks like a missing path error
  if (!path) {
    return new Response(
      JSON.stringify({ error: 'Missing path parameter' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[SEO] Processing path: ${path}`)

  // ============================================================
  // HUB PAGE DETECTION: Handle /{lang}/locations hub page
  // Must come BEFORE the content slug parsing
  // ============================================================
  const hubMatch = path.match(/^\/(\w{2})\/(locations)\/?$/)
  if (hubMatch) {
    const [, lang, hubType] = hubMatch
    console.log(`[SEO] Detected hub page: lang=${lang}, type=${hubType}`)
    
    // Generate full SEO HTML for hub page
    const hubHtml = generateHubPageHtml(lang, hubType)
    
    return new Response(hubHtml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-SEO-Source': 'edge-function-hub'
      }
    })
  }

  // ============================================================
  // BUYERS GUIDE PAGE DETECTION: Handle /{lang}/buyers-guide
  // Must come BEFORE the content slug parsing
  // ============================================================
  const buyersGuideMatch = path.match(/^\/(\w{2})\/buyers-guide\/?$/)
  if (buyersGuideMatch) {
    const [, lang] = buyersGuideMatch
    console.log(`[SEO] Detected Buyers Guide page: lang=${lang}`)
    
    // Generate full SEO HTML for buyers guide page
    const buyersGuideHtml = generateBuyersGuidePageHtml(lang)
    
    return new Response(buyersGuideHtml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-SEO-Source': 'edge-function-buyers-guide'
      }
    })
  }

  // Parse the path: /{lang}/{type}/{slug}
  const pathMatch = path.match(/^\/(\w{2})\/(qa|blog|compare|locations)\/(.+)$/)
  
  // If parsing fails, check if it LOOKS like a content pattern
  // If yes → assume deleted content → return 410 Gone
  // If no → return 400 Bad Request
  if (!pathMatch) {
    const contentCheck = isContentPathPattern(path)
    
    if (contentCheck) {
      // This looks like a content URL but we couldn't parse the slug
      // Treat as deleted/ghost content → 410 Gone
      console.log(`[SEO] WRECKING BALL: Malformed content path "${path}" → returning 410 Gone`)
      return new Response(
        generate410GoneHtml(contentCheck.lang),
        { 
          status: 410, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/html; charset=utf-8',
            'X-Robots-Tag': 'noindex',
            'X-Wrecking-Ball': 'malformed-path'
          } 
        }
      )
    }
    
    // Not a content pattern at all → 400 Bad Request
    return new Response(
      JSON.stringify({ error: 'Invalid path format. Expected: /{lang}/{type}/{slug}' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const [, lang, contentType, rawSlug] = pathMatch
  
  // Normalize the slug to handle malformed URLs from copy-paste errors
  const slug = normalizeSlug(rawSlug)
  console.log(`[SEO] Parsed: lang=${lang}, type=${contentType}, slug=${slug}${slug !== rawSlug ? ` (normalized from "${rawSlug}")` : ''}`)

  // Check cache first (before any DB calls)
  const cacheKey = `${contentType}:${lang}:${slug}`
  const cachedResponse = getCachedPage(cacheKey)
  if (cachedResponse) {
    console.log(`[SEO] Returning cached response for ${cacheKey}`)
    return cachedResponse
  }

  // Initialize Supabase client WITH timeout handling
  const supabase = createTimeoutClient()

  // Fetch metadata based on content type
  let metadata: PageMetadata | null = null
  let redirectInfo: { to: string; reason: string } | undefined
  
  switch (contentType) {
    case 'qa':
      metadata = await fetchQAMetadata(supabase, slug, lang)
      break
    case 'blog':
      metadata = await fetchBlogMetadata(supabase, slug, lang)
      break
    case 'compare':
      metadata = await fetchComparisonMetadata(supabase, slug, lang)
      break
    case 'locations':
      const locationResult = await fetchLocationMetadata(supabase, slug, lang)
      metadata = locationResult.metadata
      redirectInfo = locationResult.redirect
      break
  }

  // If location page exists but in wrong language, return redirect info
  if (redirectInfo) {
    console.log(`[SEO] Language mismatch - redirecting to: ${redirectInfo.to}`)
    return new Response(
      JSON.stringify({ 
        error: 'language_mismatch', 
        redirectTo: redirectInfo.to,
        reason: redirectInfo.reason,
        path 
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ============================================================
  // WRECKING BALL POLICY: Content not found → 410 Gone
  // This is a ghost page that should be de-indexed immediately
  // ============================================================
  if (!metadata) {
    console.log(`[SEO] WRECKING BALL: Content not found "${path}" → returning 410 Gone`)
    return new Response(
      generate410GoneHtml(lang),
      { 
        status: 410, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html; charset=utf-8',
          'X-Robots-Tag': 'noindex',
          'X-Wrecking-Ball': 'content-not-found'
        } 
      }
    )
  }

  // ============================================================
  // WRECKING BALL POLICY: Language Mismatch Check → 410 Gone
  // If the URL's language prefix doesn't match the content's actual language
  // ============================================================
  if (metadata.language && metadata.language !== lang) {
    console.log(`[SEO] WRECKING BALL: Language mismatch ${lang} vs ${metadata.language} for ${path} → returning 410 Gone`)
    return new Response(
      generate410GoneHtml(lang),
      { 
        status: 410, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html; charset=utf-8',
          'X-Robots-Tag': 'noindex',
          'X-Wrecking-Ball': `language-mismatch:${lang}->${metadata.language}`
        } 
      }
    )
  }

  // ============================================================
  // WRECKING BALL POLICY: Check for empty content → 410 Gone
  // Prevents indexing of "ghost pages" with null/placeholder content
  // Extended to cover ALL content types (blog, qa, compare, locations)
  // ============================================================
  let hasEmptyContent = false
  let contentField = ''
  
  if (contentType === 'blog') {
    const { data } = await supabase
      .from('blog_articles')
      .select('detailed_content')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    hasEmptyContent = isEmptyContent(data?.detailed_content)
    contentField = 'detailed_content'
  } else if (contentType === 'qa') {
    const { data } = await supabase
      .from('qa_pages')
      .select('answer_main')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    hasEmptyContent = isEmptyContent(data?.answer_main)
    contentField = 'answer_main'
  } else if (contentType === 'compare') {
    const { data } = await supabase
      .from('comparison_pages')
      .select('final_verdict, speakable_answer, side_by_side_breakdown')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    hasEmptyContent = isEmptyContent(data?.final_verdict) && isEmptyContent(data?.speakable_answer) && isEmptyContent(data?.side_by_side_breakdown)
    contentField = 'final_verdict/speakable_answer/side_by_side_breakdown'
  } else if (contentType === 'locations') {
    // Location pages use city_slug/topic_slug format
    const slugParts = slug.split('/')
    if (slugParts.length >= 2) {
      const [citySlug, topicSlug] = slugParts
      const { data } = await supabase
        .from('location_pages')
        .select('location_overview, speakable_answer')
        .eq('city_slug', citySlug)
        .eq('topic_slug', topicSlug)
        .eq('language', lang)
        .eq('status', 'published')
        .maybeSingle()
      hasEmptyContent = isEmptyContent(data?.location_overview) && isEmptyContent(data?.speakable_answer)
      contentField = 'location_overview/speakable_answer'
    }
  }
  
  if (hasEmptyContent) {
    console.log(`[SEO] WRECKING BALL: Empty ${contentField} for ${contentType}/${slug} → returning 410 Gone`)
    return new Response(
      generate410GoneHtml(lang), 
      { 
        status: 410, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html; charset=utf-8',
          'X-Robots-Tag': 'noindex',
          'X-Wrecking-Ball': 'empty-content'
        } 
      }
    )
  }

  console.log(`[SEO] Found metadata for: ${metadata.headline}`)

  // Fetch hreflang siblings
  const siblings = await fetchHreflangSiblings(supabase, metadata.hreflang_group_id || '', contentType)
  const hreflangTags = generateHreflangTags(siblings, metadata.language, contentType)

  // Return full SSR HTML or JSON based on query param
  const returnHtml = url.searchParams.get('html') === 'true'
  
  if (returnHtml) {
    // Generate full SSR HTML with actual content (not empty React shell)
    const fullHtml = generateFullHtml(metadata, hreflangTags, '')
    
    const response = new Response(fullHtml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-SEO-Source': 'edge-function-ssr',
        'X-Content-Language': metadata.language,
      }
    })
    
    // Cache the successful HTML response
    setCachedPage(cacheKey, response.clone())
    return response
  }

  // Return metadata as JSON (useful for debugging)
  const jsonResponse = new Response(
    JSON.stringify({
      success: true,
      metadata: {
        language: metadata.language,
        locale: LOCALE_MAP[metadata.language] || 'en_GB',
        title: metadata.meta_title,
        description: metadata.meta_description,
        canonical: metadata.canonical_url,
        headline: metadata.headline,
        image: metadata.featured_image_url,
        datePublished: metadata.date_published,
        dateModified: metadata.date_modified,
        contentType,
      },
      hreflangTags: hreflangTags.split('\n').map(t => t.trim()).filter(Boolean),
      schemas: {
        faq: metadata.qa_entities?.length || 0,
        article: true,
        speakable: !!metadata.speakable_answer,
      },
      siblings: siblings.map(s => ({
        language: s.language,
        url: s.canonical_url || `${BASE_URL}/${s.language}/${contentType}/${s.slug}`
      }))
    }, null, 2),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
  
  // Cache the successful JSON response
  setCachedPage(cacheKey, jsonResponse.clone())
  return jsonResponse
}

// ============================================================
// MAIN ENTRY POINT with timeout protection and fallback HTML
// Always returns 200 OK with HTML - never 503/524 errors
// ============================================================
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)

  // Create fallback response for timeouts/errors
  const fallbackResponse = new Response(
    generateFallbackHTML(url),
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-SEO-Fallback': 'timeout',
        ...corsHeaders
      }
    }
  )

  // Circuit breaker check - return fallback HTML instead of 503
  if (isCircuitOpen()) {
    console.log('[SEO] Circuit breaker open - returning fallback HTML')
    return new Response(
      generateFallbackHTML(url),
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
          'X-SEO-Fallback': 'circuit-breaker',
          ...corsHeaders
        }
      }
    )
  }

  try {
    // Wrap the request with 8-second timeout protection
    const result = await withTimeout(
      handleRequest(req),
      8000, // 8 second timeout
      fallbackResponse
    )

    // Success - reset circuit breaker
    recordSuccess()
    return result

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[SEO] Error: ${errorMessage}`)
    recordFailure()
    
    // Always return fallback HTML on any error - never 500/503
    return new Response(
      generateFallbackHTML(url),
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
          'X-SEO-Fallback': 'error',
          ...corsHeaders
        }
      }
    )
  }
})
