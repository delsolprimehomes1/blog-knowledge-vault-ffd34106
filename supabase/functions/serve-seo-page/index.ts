import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  }
}

async function fetchLocationMetadata(supabase: any, slug: string, lang: string): Promise<PageMetadata | null> {
  const { data, error } = await supabase
    .from('location_pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error || !data) {
    console.error('Error fetching location page:', error)
    return null
  }

  return {
    language: data.language || lang,
    meta_title: data.meta_title,
    meta_description: data.meta_description,
    canonical_url: data.canonical_url || `${BASE_URL}/${data.language}/locations/${slug}`,
    headline: data.headline,
    speakable_answer: data.speakable_answer,
    featured_image_url: data.featured_image_url,
    featured_image_alt: data.featured_image_alt,
    date_published: data.date_published,
    date_modified: data.date_modified,
    hreflang_group_id: data.hreflang_group_id,
    qa_entities: data.qa_entities,
    content_type: 'locations',
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
  
  // Create a map of available languages
  const availableLanguages = new Map<string, HreflangSibling>()
  siblings.forEach(sibling => {
    availableLanguages.set(sibling.language, sibling)
  })

  // Find English version for fallback (required for missing languages)
  const englishVersion = availableLanguages.get('en')
  const currentVersion = siblings.find(s => s.language === currentLang)
  const fallbackVersion = englishVersion || currentVersion || siblings[0]
  
  // Generate tags for ALL 10 supported languages (with fallback to English if missing)
  const tags: string[] = []
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    const sibling = availableLanguages.get(lang)
    if (sibling) {
      // Language version exists - use it
      const url = sibling.canonical_url || `${BASE_URL}/${lang}/${pathPrefix}/${sibling.slug}`
      tags.push(`  <link rel="alternate" hreflang="${lang}" href="${url}" />`)
    } else if (fallbackVersion) {
      // Language version missing - fallback to English/source version
      const fallbackLang = englishVersion ? 'en' : (fallbackVersion.language || 'en')
      const url = fallbackVersion.canonical_url || `${BASE_URL}/${fallbackLang}/${pathPrefix}/${fallbackVersion.slug}`
      tags.push(`  <link rel="alternate" hreflang="${lang}" href="${url}" />`)
    }
  })

  // Add x-default (points to English or fallback)
  const xDefaultLang = englishVersion ? 'en' : (fallbackVersion?.language || 'en')
  const xDefaultUrl = fallbackVersion 
    ? (fallbackVersion.canonical_url || `${BASE_URL}/${xDefaultLang}/${pathPrefix}/${fallbackVersion.slug}`)
    : `${BASE_URL}/en/${pathPrefix}/${siblings[0]?.slug || ''}`
  tags.push(`  <link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />`)

  return tags.join('\n')
}

// Removed FAQPage schema generation - QAPage schema is sufficient for single Q&A pages
// FAQPage was causing redundancy with QAPage

function generateQAPageSchema(metadata: PageMetadata): string {
  // For QA pages, use QAPage schema (not FAQPage)
  // Content must be in the page's language (no hardcoded English)
  const schema = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    "@id": `${metadata.canonical_url}#qapage`,
    "headline": metadata.headline, // This comes from question_main in the DB (in page's language)
    "inLanguage": LOCALE_MAP[metadata.language] || metadata.language,
    "url": metadata.canonical_url,
    "mainEntity": {
      "@type": "Question",
      "name": metadata.headline, // In page's language
      "text": metadata.headline,
      "answerCount": 1,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": metadata.speakable_answer?.replace(/<[^>]*>/g, '').slice(0, 500) || '',
        "inLanguage": LOCALE_MAP[metadata.language] || metadata.language,
      }
    }
  }

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
}

function generateArticleSchema(metadata: PageMetadata): string {
  // Only generate Article schema for blog content, not QA pages (which use QAPage)
  if (metadata.content_type === 'qa') {
    return '' // QA pages use QAPage schema instead
  }
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": metadata.headline,
    "description": metadata.meta_description,
    "image": metadata.featured_image_url || `${BASE_URL}/assets/logo-new.png`,
    "datePublished": metadata.date_published || new Date().toISOString(),
    "dateModified": metadata.date_modified || new Date().toISOString(),
    "inLanguage": LOCALE_MAP[metadata.language] || metadata.language,
    "publisher": {
      "@type": "Organization",
      "name": "Del Sol Prime Homes",
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/assets/logo-new.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": metadata.canonical_url
    }
  }

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
}

// Speakable schema removed - limited practical impact and selectors may not exist
// Keeping function stub for backwards compatibility
function generateSpeakableSchema(_metadata: PageMetadata): string {
  return ''
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

function generateFullHtml(metadata: PageMetadata, hreflangTags: string, baseHtml: string): string {
  const locale = LOCALE_MAP[metadata.language] || 'en_GB'
  const escapedTitle = escapeHtml(metadata.meta_title || metadata.headline || 'Del Sol Prime Homes')
  const escapedDescription = escapeHtml(metadata.meta_description || '')
  
  // Generate schemas - QA pages use QAPage, others use Article
  const qaSchema = metadata.content_type === 'qa' ? generateQAPageSchema(metadata) : ''
  const articleSchema = generateArticleSchema(metadata)
  const speakableSchema = generateSpeakableSchema(metadata)

  // Build the complete head section
  const headContent = `
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- Primary Meta Tags -->
  <title>${escapedTitle}</title>
  <meta name="title" content="${escapedTitle}" />
  <meta name="description" content="${escapedDescription}" />
  
  <!-- Canonical & Hreflang -->
  <link rel="canonical" href="${metadata.canonical_url}" />
${hreflangTags}
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${metadata.canonical_url}" />
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${escapedDescription}" />
  <meta property="og:image" content="${metadata.featured_image_url || `${BASE_URL}/assets/logo-new.png`}" />
  <meta property="og:locale" content="${locale}" />
  <meta property="og:site_name" content="Del Sol Prime Homes" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${metadata.canonical_url}" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${escapedDescription}" />
  <meta name="twitter:image" content="${metadata.featured_image_url || `${BASE_URL}/assets/logo-new.png`}" />
  
  <!-- Article Meta -->
  ${metadata.date_published ? `<meta property="article:published_time" content="${metadata.date_published}" />` : ''}
  ${metadata.date_modified ? `<meta property="article:modified_time" content="${metadata.date_modified}" />` : ''}
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/favicon.png" />
  
  <!-- Schema.org JSON-LD (no duplicates) -->
  ${qaSchema}
  ${articleSchema}
  ${speakableSchema}
`

  // Replace the entire head section and html lang attribute
  let html = baseHtml
    .replace(/<html[^>]*>/, `<html lang="${metadata.language}">`)
    .replace(/<head>[\s\S]*?<\/head>/, `<head>${headContent}</head>`)

  return html
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.searchParams.get('path')
    
    if (!path) {
      return new Response(
        JSON.stringify({ error: 'Missing path parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing path: ${path}`)

    // Parse the path: /{lang}/{type}/{slug}
    const pathMatch = path.match(/^\/(\w{2})\/(qa|blog|compare|locations)\/(.+)$/)
    
    if (!pathMatch) {
      return new Response(
        JSON.stringify({ error: 'Invalid path format. Expected: /{lang}/{type}/{slug}' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const [, lang, contentType, rawSlug] = pathMatch
    
    // Normalize the slug to handle malformed URLs from copy-paste errors
    const slug = normalizeSlug(rawSlug)
    console.log(`Parsed: lang=${lang}, type=${contentType}, slug=${slug}${slug !== rawSlug ? ` (normalized from "${rawSlug}")` : ''}`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch metadata based on content type
    let metadata: PageMetadata | null = null
    
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
        metadata = await fetchLocationMetadata(supabase, slug, lang)
        break
    }

    if (!metadata) {
      return new Response(
        JSON.stringify({ error: 'Page not found', path }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found metadata for: ${metadata.headline}`)

    // Fetch hreflang siblings
    const siblings = await fetchHreflangSiblings(supabase, metadata.hreflang_group_id || '', contentType)
    const hreflangTags = generateHreflangTags(siblings, metadata.language, contentType)

    // Return just the metadata and generated tags (for debugging/API use)
    const returnHtml = url.searchParams.get('html') === 'true'
    
    if (returnHtml) {
      // Use inline HTML template instead of fetching external HTML (avoids fetch errors)
      const baseHtml = `<!DOCTYPE html>
<html lang="en">
<head>
</head>
<body>
  <div id="root"></div>
  <noscript>You need to enable JavaScript to run this app.</noscript>
  <script>
    // Client-side hydration will take over
    window.__SSR_METADATA__ = ${JSON.stringify({
      language: metadata.language,
      title: metadata.meta_title,
      canonical: metadata.canonical_url
    })};
  </script>
</body>
</html>`
      
      // Generate full HTML with injected metadata
      const fullHtml = generateFullHtml(metadata, hreflangTags, baseHtml)
      
      return new Response(fullHtml, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-SEO-Source': 'edge-function',
          'X-Content-Language': metadata.language,
        }
      })
    }

    // Return metadata as JSON (useful for debugging)
    return new Response(
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

  } catch (error: unknown) {
    console.error('Error in serve-seo-page:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
