import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BASE_URL = 'https://www.delsolprimehomes.com'

type ContentType = 'blog' | 'qa' | 'location' | 'comparison' | 'all'

interface FixResult {
  contentType: string
  updated: number
  errors: number
  preview?: { id: string; language: string; slug: string; canonical_url: string }[]
}

/**
 * Batch fix missing canonical URLs for all content types.
 * 
 * Patterns:
 * - Blog: https://www.delsolprimehomes.com/{lang}/blog/{slug}
 * - Q&A:  https://www.delsolprimehomes.com/{lang}/qa/{slug}
 * - Location: https://www.delsolprimehomes.com/{lang}/locations/{city_slug}/{topic_slug}
 * - Comparison: https://www.delsolprimehomes.com/{lang}/compare/{slug}
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { 
      dryRun = true, 
      contentType = 'all',
      clusterId 
    } = await req.json().catch(() => ({ dryRun: true, contentType: 'all' })) as {
      dryRun?: boolean
      contentType?: ContentType
      clusterId?: string
    }

    console.log(`[Fix Canonicals] Starting (dryRun: ${dryRun}, contentType: ${contentType}, clusterId: ${clusterId || 'all'})`)

    const results: FixResult[] = []

    // Fix blog articles
    if (contentType === 'all' || contentType === 'blog') {
      const result = await fixBlogCanonicals(supabase, dryRun, clusterId)
      results.push(result)
    }

    // Fix Q&A pages
    if (contentType === 'all' || contentType === 'qa') {
      const result = await fixQACanonicals(supabase, dryRun, clusterId)
      results.push(result)
    }

    // Fix location pages
    if (contentType === 'all' || contentType === 'location') {
      const result = await fixLocationCanonicals(supabase, dryRun)
      results.push(result)
    }

    // Fix comparison pages
    if (contentType === 'all' || contentType === 'comparison') {
      const result = await fixComparisonCanonicals(supabase, dryRun)
      results.push(result)
    }

    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0)

    return new Response(
      JSON.stringify({
        dryRun,
        message: dryRun 
          ? `Would update ${totalUpdated} canonical URLs`
          : `Updated ${totalUpdated} canonical URLs (${totalErrors} errors)`,
        results,
        totalUpdated,
        totalErrors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Fix Canonicals] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// deno-lint-ignore no-explicit-any
async function fixBlogCanonicals(supabase: any, dryRun: boolean, clusterId?: string): Promise<FixResult> {
  console.log('[Fix Canonicals] Checking blog articles...')

  let query = supabase
    .from('blog_articles')
    .select('id, language, slug')
    .is('canonical_url', null)

  if (clusterId) {
    query = query.eq('cluster_id', clusterId)
  }

  const { data: articles, error } = await query

  if (error) {
    console.error('[Fix Canonicals] Error fetching blog articles:', error)
    return { contentType: 'blog', updated: 0, errors: 1 }
  }

  if (!articles || articles.length === 0) {
    console.log('[Fix Canonicals] No blog articles need canonical URLs')
    return { contentType: 'blog', updated: 0, errors: 0 }
  }

  console.log(`[Fix Canonicals] Found ${articles.length} blog articles missing canonical URLs`)

  if (dryRun) {
    const preview = articles.slice(0, 5).map((a: { id: string; language: string; slug: string }) => ({
      id: a.id,
      language: a.language,
      slug: a.slug,
      canonical_url: `${BASE_URL}/${a.language}/blog/${a.slug}`
    }))
    return { contentType: 'blog', updated: articles.length, errors: 0, preview }
  }

  let updated = 0
  let errors = 0

  for (const article of articles) {
    const canonical_url = `${BASE_URL}/${article.language}/blog/${article.slug}`
    const { error: updateError } = await supabase
      .from('blog_articles')
      .update({ canonical_url })
      .eq('id', article.id)

    if (updateError) {
      console.error(`[Fix Canonicals] Error updating blog ${article.id}:`, updateError)
      errors++
    } else {
      updated++
    }
  }

  return { contentType: 'blog', updated, errors }
}

// deno-lint-ignore no-explicit-any
async function fixQACanonicals(supabase: any, dryRun: boolean, clusterId?: string): Promise<FixResult> {
  console.log('[Fix Canonicals] Checking Q&A pages...')

  let query = supabase
    .from('qa_pages')
    .select('id, language, slug')
    .is('canonical_url', null)

  if (clusterId) {
    query = query.eq('cluster_id', clusterId)
  }

  const { data: pages, error } = await query

  if (error) {
    console.error('[Fix Canonicals] Error fetching Q&A pages:', error)
    return { contentType: 'qa', updated: 0, errors: 1 }
  }

  if (!pages || pages.length === 0) {
    console.log('[Fix Canonicals] No Q&A pages need canonical URLs')
    return { contentType: 'qa', updated: 0, errors: 0 }
  }

  console.log(`[Fix Canonicals] Found ${pages.length} Q&A pages missing canonical URLs`)

  if (dryRun) {
    const preview = pages.slice(0, 5).map((p: { id: string; language: string; slug: string }) => ({
      id: p.id,
      language: p.language,
      slug: p.slug,
      canonical_url: `${BASE_URL}/${p.language}/qa/${p.slug}`
    }))
    return { contentType: 'qa', updated: pages.length, errors: 0, preview }
  }

  let updated = 0
  let errors = 0

  for (const page of pages) {
    const canonical_url = `${BASE_URL}/${page.language}/qa/${page.slug}`
    const { error: updateError } = await supabase
      .from('qa_pages')
      .update({ canonical_url })
      .eq('id', page.id)

    if (updateError) {
      console.error(`[Fix Canonicals] Error updating Q&A ${page.id}:`, updateError)
      errors++
    } else {
      updated++
    }
  }

  return { contentType: 'qa', updated, errors }
}

// deno-lint-ignore no-explicit-any
async function fixLocationCanonicals(supabase: any, dryRun: boolean): Promise<FixResult> {
  console.log('[Fix Canonicals] Checking location pages...')

  const { data: pages, error } = await supabase
    .from('location_pages')
    .select('id, language, city_slug, topic_slug')
    .is('canonical_url', null)

  if (error) {
    console.error('[Fix Canonicals] Error fetching location pages:', error)
    return { contentType: 'location', updated: 0, errors: 1 }
  }

  if (!pages || pages.length === 0) {
    console.log('[Fix Canonicals] No location pages need canonical URLs')
    return { contentType: 'location', updated: 0, errors: 0 }
  }

  console.log(`[Fix Canonicals] Found ${pages.length} location pages missing canonical URLs`)

  if (dryRun) {
    const preview = pages.slice(0, 5).map((p: { id: string; language: string; city_slug: string; topic_slug: string }) => ({
      id: p.id,
      language: p.language,
      slug: `${p.city_slug}/${p.topic_slug}`,
      canonical_url: `${BASE_URL}/${p.language}/locations/${p.city_slug}/${p.topic_slug}`
    }))
    return { contentType: 'location', updated: pages.length, errors: 0, preview }
  }

  let updated = 0
  let errors = 0

  for (const page of pages) {
    const canonical_url = `${BASE_URL}/${page.language}/locations/${page.city_slug}/${page.topic_slug}`
    const { error: updateError } = await supabase
      .from('location_pages')
      .update({ canonical_url })
      .eq('id', page.id)

    if (updateError) {
      console.error(`[Fix Canonicals] Error updating location ${page.id}:`, updateError)
      errors++
    } else {
      updated++
    }
  }

  return { contentType: 'location', updated, errors }
}

// deno-lint-ignore no-explicit-any
async function fixComparisonCanonicals(supabase: any, dryRun: boolean): Promise<FixResult> {
  console.log('[Fix Canonicals] Checking comparison pages...')

  const { data: pages, error } = await supabase
    .from('comparison_pages')
    .select('id, language, slug')
    .is('canonical_url', null)

  if (error) {
    console.error('[Fix Canonicals] Error fetching comparison pages:', error)
    return { contentType: 'comparison', updated: 0, errors: 1 }
  }

  if (!pages || pages.length === 0) {
    console.log('[Fix Canonicals] No comparison pages need canonical URLs')
    return { contentType: 'comparison', updated: 0, errors: 0 }
  }

  console.log(`[Fix Canonicals] Found ${pages.length} comparison pages missing canonical URLs`)

  if (dryRun) {
    const preview = pages.slice(0, 5).map((p: { id: string; language: string; slug: string }) => ({
      id: p.id,
      language: p.language,
      slug: p.slug,
      canonical_url: `${BASE_URL}/${p.language}/compare/${p.slug}`
    }))
    return { contentType: 'comparison', updated: pages.length, errors: 0, preview }
  }

  let updated = 0
  let errors = 0

  for (const page of pages) {
    const canonical_url = `${BASE_URL}/${page.language}/compare/${page.slug}`
    const { error: updateError } = await supabase
      .from('comparison_pages')
      .update({ canonical_url })
      .eq('id', page.id)

    if (updateError) {
      console.error(`[Fix Canonicals] Error updating comparison ${page.id}:`, updateError)
      errors++
    } else {
      updated++
    }
  }

  return { contentType: 'comparison', updated, errors }
}
