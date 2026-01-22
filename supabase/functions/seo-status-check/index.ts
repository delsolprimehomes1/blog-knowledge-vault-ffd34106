import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPPORTED_LANGUAGES = ['en', 'nl', 'hu', 'de', 'fr', 'sv', 'pl', 'no', 'fi', 'da']
const BASE_URL = 'https://www.delsolprimehomes.com'

/**
 * Checks if content is empty/placeholder (should trigger 410 Gone)
 */
function isEmptyContent(content: string | null | undefined): boolean {
  if (!content) return true
  
  const stripped = content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  
  return stripped.length === 0
}

interface SEOStatusResult {
  path: string
  expectedStatus: number
  checks: {
    recordExists: boolean
    isPublished: boolean
    languageMatch: boolean
    hasContent: boolean
    inGoneUrls: boolean
    canonicalUrl: string | null
    actualLanguage: string | null
  }
  wreckingBallReason: string | null
  shouldBeInSitemap: boolean
  contentType: string | null
  slug: string | null
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const pathToCheck = url.searchParams.get('path')

  if (!pathToCheck) {
    return new Response(
      JSON.stringify({ error: 'Missing "path" query parameter' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[SEO-STATUS] Checking path: ${pathToCheck}`)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Parse the path: /{lang}/{type}/{slug}
  const pathMatch = pathToCheck.match(/^\/(\w{2})\/(qa|blog|compare|locations)\/(.+)$/)
  
  if (!pathMatch) {
    // Check if it looks like a content pattern
    const contentPattern = /^\/([a-z]{2})\/(qa|blog|compare|locations)\//i
    const partialMatch = pathToCheck.match(contentPattern)
    
    const result: SEOStatusResult = {
      path: pathToCheck,
      expectedStatus: partialMatch ? 410 : 400,
      checks: {
        recordExists: false,
        isPublished: false,
        languageMatch: false,
        hasContent: false,
        inGoneUrls: false,
        canonicalUrl: null,
        actualLanguage: null,
      },
      wreckingBallReason: partialMatch ? 'malformed-path' : null,
      shouldBeInSitemap: false,
      contentType: partialMatch?.[2] || null,
      slug: null,
    }
    
    return new Response(
      JSON.stringify(result, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const [, lang, contentType, rawSlug] = pathMatch
  const slug = decodeURIComponent(rawSlug).replace(/[\r\n\t\x00]/g, '').trim().replace(/\/+$/, '')

  // Initialize result
  const result: SEOStatusResult = {
    path: pathToCheck,
    expectedStatus: 200,
    checks: {
      recordExists: false,
      isPublished: false,
      languageMatch: false,
      hasContent: false,
      inGoneUrls: false,
      canonicalUrl: null,
      actualLanguage: null,
    },
    wreckingBallReason: null,
    shouldBeInSitemap: false,
    contentType,
    slug,
  }

  // Check if this path is in gone_urls table
  const { data: goneData } = await supabase
    .from('gone_urls')
    .select('id')
    .eq('path', pathToCheck)
    .maybeSingle()
  
  result.checks.inGoneUrls = !!goneData

  // Fetch content based on type
  let record: any = null
  let contentField = ''
  let contentValue: string | null = null

  try {
    if (contentType === 'blog') {
      const { data } = await supabase
        .from('blog_articles')
        .select('language, status, detailed_content, canonical_url')
        .eq('slug', slug)
        .maybeSingle()
      record = data
      contentField = 'detailed_content'
      contentValue = data?.detailed_content
    } else if (contentType === 'qa') {
      const { data } = await supabase
        .from('qa_pages')
        .select('language, status, answer_main, canonical_url')
        .eq('slug', slug)
        .maybeSingle()
      record = data
      contentField = 'answer_main'
      contentValue = data?.answer_main
    } else if (contentType === 'compare') {
      const { data } = await supabase
        .from('comparison_pages')
        .select('language, status, detailed_comparison, verdict, canonical_url')
        .eq('slug', slug)
        .maybeSingle()
      record = data
      contentField = 'detailed_comparison/verdict'
      contentValue = data?.detailed_comparison || data?.verdict
    } else if (contentType === 'locations') {
      const slugParts = slug.split('/')
      if (slugParts.length >= 2) {
        const [citySlug, topicSlug] = slugParts
        const { data } = await supabase
          .from('location_pages')
          .select('language, status, location_overview, speakable_answer, canonical_url')
          .eq('city_slug', citySlug)
          .eq('topic_slug', topicSlug)
          .eq('language', lang)
          .maybeSingle()
        record = data
        contentField = 'location_overview/speakable_answer'
        contentValue = data?.location_overview || data?.speakable_answer
      }
    }
  } catch (error) {
    console.error(`[SEO-STATUS] Error fetching ${contentType}:`, error)
  }

  // Evaluate checks
  result.checks.recordExists = !!record
  result.checks.isPublished = record?.status === 'published'
  result.checks.actualLanguage = record?.language || null
  result.checks.languageMatch = record?.language === lang
  result.checks.hasContent = !isEmptyContent(contentValue)
  result.checks.canonicalUrl = record?.canonical_url || null

  // Determine expected status based on checks
  if (!result.checks.recordExists) {
    result.expectedStatus = 410
    result.wreckingBallReason = 'content-not-found'
  } else if (!result.checks.isPublished) {
    result.expectedStatus = 410
    result.wreckingBallReason = 'not-published'
  } else if (!result.checks.languageMatch && record?.language) {
    result.expectedStatus = 410
    result.wreckingBallReason = `language-mismatch:${lang}->${record.language}`
  } else if (!result.checks.hasContent) {
    result.expectedStatus = 410
    result.wreckingBallReason = 'empty-content'
  } else {
    result.expectedStatus = 200
    result.wreckingBallReason = null
  }

  // Determine sitemap eligibility
  result.shouldBeInSitemap = 
    result.expectedStatus === 200 &&
    result.checks.isPublished &&
    result.checks.hasContent &&
    result.checks.languageMatch &&
    !result.checks.inGoneUrls

  console.log(`[SEO-STATUS] Result for ${pathToCheck}:`, JSON.stringify(result))

  return new Response(
    JSON.stringify(result, null, 2),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
