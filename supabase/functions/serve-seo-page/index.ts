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
  quick_comparison_table?: any[] // For comparison pages
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
    quick_comparison_table: data.quick_comparison_table,
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

  // Generate tags for ALL 10 supported languages (not just existing siblings)
  // This ensures complete hreflang coverage even when translations don't exist yet
  const tags: string[] = []
  
  for (const lang of SUPPORTED_LANGUAGES) {
    const sibling = availableLanguages.get(lang)
    if (sibling) {
      // Use existing sibling's canonical URL or construct from slug
      const url = sibling.canonical_url || `${BASE_URL}/${lang}/${pathPrefix}/${sibling.slug}`
      tags.push(`  <link rel="alternate" hreflang="${lang}" href="${url}" />`)
    } else {
      // For missing languages, use the current page's slug pattern
      // This creates placeholder hreflang tags that can be used when translations are created
      const currentSibling = availableLanguages.get(currentLang)
      if (currentSibling) {
        // Construct URL using the same slug pattern but different language
        const url = `${BASE_URL}/${lang}/${pathPrefix}/${currentSibling.slug}`
        tags.push(`  <link rel="alternate" hreflang="${lang}" href="${url}" />`)
      }
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

// Removed FAQPage schema generation - QAPage schema is sufficient for single Q&A pages
// FAQPage was causing redundancy with QAPage

/**
 * Truncate answer at sentence boundary for AI-safe schema
 */
function truncateAtSentence(text: string, maxLength: number = 600): string {
  const MIN_LENGTH = 160;
  
  if (text.length <= maxLength) {
    return text;
  }
  
  const truncated = text.substring(0, maxLength);
  
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclamation = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  
  const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
  
  if (lastSentenceEnd >= MIN_LENGTH) {
    return text.substring(0, lastSentenceEnd + 1).trim();
  }
  
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace >= MIN_LENGTH) {
    return text.substring(0, lastSpace).trim() + '.';
  }
  
  return text.substring(0, MIN_LENGTH).trim() + '...';
}

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
        "text": truncateAtSentence(metadata.speakable_answer?.replace(/<[^>]*>/g, '') || '', 600),
        "inLanguage": LOCALE_MAP[metadata.language] || metadata.language,
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
    "sameAs": "https://www.linkedin.com/in/steven-roberts-delsolprimehomes/",
    "worksFor": { "@id": `${BASE_URL}/#organization` }
  },
  {
    "@type": "Person",
    "@id": `${BASE_URL}/#hans-beeckman`,
    "name": "Hans Beeckman",
    "jobTitle": "Sales Director",
    "sameAs": "https://www.linkedin.com/in/hans-beeckman-delsolprimehomes/",
    "worksFor": { "@id": `${BASE_URL}/#organization` }
  },
  {
    "@type": "Person",
    "@id": `${BASE_URL}/#cedric-van-hecke`,
    "name": "Cédric Van Hecke",
    "jobTitle": "Marketing Director",
    "sameAs": "https://www.linkedin.com/in/cedric-van-hecke-delsolprimehomes/",
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

function generateFullHtml(metadata: PageMetadata, hreflangTags: string, baseHtml: string): string {
  const locale = LOCALE_MAP[metadata.language] || 'en_GB'
  const escapedTitle = escapeHtml(metadata.meta_title || metadata.headline || 'Del Sol Prime Homes')
  const escapedDescription = escapeHtml(metadata.meta_description || '')
  
  // Generate schemas based on content type
  const qaSchema = metadata.content_type === 'qa' ? generateQAPageSchema(metadata) : ''
  const blogPostingSchema = generateBlogPostingSchema(metadata)
  const articleSchema = generateArticleSchema(metadata)
  const breadcrumbSchema = generateBreadcrumbSchema(metadata)
  const orgSchema = generateOrganizationSchema()
  
  // Generate speakable schema for all page types with speakable content
  const speakableSchema = metadata.speakable_answer ? generateSpeakableSchema(metadata) : ''
  
  // Generate comparison table schema for comparison pages
  const comparisonTableSchema = generateComparisonTableSchema(metadata, metadata.quick_comparison_table || [])

  // Build the complete head section (no charset/viewport - those are in index.html)
  const headContent = `
  <!-- Primary Meta Tags (dynamic, not in index.html) -->
  <title>${escapedTitle}</title>
  <meta name="title" content="${escapedTitle}" />
  <meta name="description" content="${escapedDescription}" />
  
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
  ${orgSchema}
  ${speakableSchema}
  ${comparisonTableSchema}
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
