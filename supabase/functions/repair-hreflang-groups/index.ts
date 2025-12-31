import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QAPageWithBlog {
  id: string
  cluster_id: string | null
  language: string
  qa_type: string | null
  slug: string
  hreflang_group_id: string | null
  source_article_id: string | null
  created_at: string
  question_main: string | null
  source_article: {
    hreflang_group_id: string | null
  } | null
}

/**
 * Repairs hreflang_group_id assignments for QA pages.
 * 
 * v5 STRATEGY - Proper Cross-Language Grouping:
 * Group Q&As by their source blog's hreflang_group_id + qa_type
 * 
 * WHY THIS WORKS:
 * - Blog articles already have proper hreflang_group_id linking translations
 * - EN blog (hreflang: abc-123), DE blog (hreflang: abc-123), FR blog (hreflang: abc-123)
 * - Q&As generated from these blogs with same qa_type should share a group
 * - EN "core" Q&A + DE "core" Q&A + FR "core" Q&A → same hreflang_group
 * 
 * This means:
 * - Each Q&A topic (blog_hreflang + qa_type) gets ONE shared hreflang_group_id
 * - All 10 language versions of the same question link to each other
 * - Google/AI can discover Q&A translations properly
 * 
 * Expected result:
 * - Cluster with 240 Q&As → ~24 hreflang groups (24 topics × 10 languages each)
 * - Instead of 240 groups (v4 broken behavior)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { dryRun = true, clusterId, contentType } = await req.json().catch(() => ({ dryRun: true }))

    console.log(`[Repair v5] Starting hreflang group repair (dryRun: ${dryRun}, clusterId: ${clusterId || 'all'}, contentType: ${contentType || 'qa'})`)

    // Step 1: Fetch all published Q&A pages WITH their source blog's hreflang_group_id
    let query = supabase
      .from('qa_pages')
      .select(`
        id, 
        cluster_id, 
        language, 
        qa_type, 
        slug, 
        hreflang_group_id, 
        source_article_id, 
        created_at, 
        question_main,
        source_article:blog_articles!source_article_id(
          hreflang_group_id
        )
      `)
      .eq('status', 'published')
      .order('created_at')

    if (clusterId) {
      query = query.eq('cluster_id', clusterId)
    }

    const { data: qaPages, error: fetchError } = await query as { 
      data: QAPageWithBlog[] | null
      error: unknown 
    }

    if (fetchError) {
      console.error('[Repair v5] Error fetching Q&A pages:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Q&A pages', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!qaPages || qaPages.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No Q&A pages found to repair', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Repair v5] Found ${qaPages.length} Q&A pages to process`)

    // ========== v5 STRATEGY: Group Q&As by blog's hreflang_group + qa_type ==========
    
    // Map: groupKey → array of Q&As in that group
    const groups = new Map<string, QAPageWithBlog[]>()
    let standaloneCount = 0
    let linkedCount = 0

    for (const qa of qaPages) {
      const blogHreflang = qa.source_article?.hreflang_group_id

      if (!blogHreflang) {
        // Q&A without linked blog or blog without hreflang → standalone group
        const groupKey = `standalone::${qa.id}`
        groups.set(groupKey, [qa])
        standaloneCount++
        continue
      }

      // Group by blog's hreflang_group_id + qa_type
      const qaType = qa.qa_type || 'unknown'
      const groupKey = `${blogHreflang}::${qaType}`

      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(qa)
      linkedCount++
    }

    console.log(`[Repair v5] Grouped Q&As: ${linkedCount} linked, ${standaloneCount} standalone`)
    console.log(`[Repair v5] Total unique groups: ${groups.size}`)

    // Step 3: Build updates - same hreflang_group_id for all Q&As in each group
    const updates: { id: string; hreflang_group_id: string; translations: Record<string, string> }[] = []
    const stats = {
      totalQAs: qaPages.length,
      linkedGroups: 0,
      standaloneGroups: 0,
      multiLanguageGroups: 0,
      singleLanguageGroups: 0,
      groupSizeDistribution: {} as Record<number, number>,
    }

    for (const [groupKey, qas] of groups) {
      const isStandalone = groupKey.startsWith('standalone::')
      const newHreflangGroupId = crypto.randomUUID()

      // Build translations map from all Q&As in this group
      const translations: Record<string, string> = {}
      for (const qa of qas) {
        translations[qa.language] = qa.slug
      }

      // Track stats
      const groupSize = qas.length
      stats.groupSizeDistribution[groupSize] = (stats.groupSizeDistribution[groupSize] || 0) + 1

      if (isStandalone) {
        stats.standaloneGroups++
        stats.singleLanguageGroups++
      } else {
        stats.linkedGroups++
        if (groupSize > 1) {
          stats.multiLanguageGroups++
        } else {
          stats.singleLanguageGroups++
        }
      }

      // All Q&As in this group get the SAME hreflang_group_id and translations
      for (const qa of qas) {
        updates.push({
          id: qa.id,
          hreflang_group_id: newHreflangGroupId,
          translations
        })
      }
    }

    console.log(`[Repair v5] Stats:`, stats)
    console.log(`[Repair v5] Total updates queued: ${updates.length}`)

    if (dryRun) {
      // Return preview of changes without applying
      const preview = updates.slice(0, 30).map(u => ({
        id: u.id,
        new_hreflang_group_id: u.hreflang_group_id.slice(0, 8) + '...',
        languages_linked: Object.keys(u.translations),
        language_count: Object.keys(u.translations).length,
      }))

      // Show example of multi-language groups
      const multiLangExamples: { group_key: string; languages: string[]; qa_count: number }[] = []
      for (const [groupKey, qas] of groups) {
        if (qas.length > 1 && !groupKey.startsWith('standalone::')) {
          multiLangExamples.push({
            group_key: groupKey.slice(0, 50) + (groupKey.length > 50 ? '...' : ''),
            languages: qas.map(q => q.language).sort(),
            qa_count: qas.length
          })
          if (multiLangExamples.length >= 5) break
        }
      }

      return new Response(
        JSON.stringify({
          dryRun: true,
          message: `Would update ${updates.length} Q&A pages across ${groups.size} hreflang groups`,
          stats,
          strategy: 'v5 - Group by blog hreflang_group + qa_type',
          expected_improvement: `${stats.linkedGroups} properly linked groups vs ${stats.standaloneGroups} standalone`,
          multiLanguageExamples: multiLangExamples,
          preview,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Apply updates in batches
    let successCount = 0
    let errorCount = 0
    const batchSize = 50

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      
      for (const update of batch) {
        const { error: updateError } = await supabase
          .from('qa_pages')
          .update({
            hreflang_group_id: update.hreflang_group_id,
            translations: update.translations,
          })
          .eq('id', update.id)

        if (updateError) {
          console.error(`[Repair v5] Error updating Q&A ${update.id}:`, updateError)
          errorCount++
        } else {
          successCount++
        }
      }

      console.log(`[Repair v5] Processed batch ${Math.floor(i / batchSize) + 1}, success: ${successCount}, errors: ${errorCount}`)
    }

    return new Response(
      JSON.stringify({
        dryRun: false,
        message: `Updated ${successCount} Q&A pages across ${groups.size} hreflang groups (${errorCount} errors)`,
        stats: {
          ...stats,
          successCount,
          errorCount,
        },
        strategy: 'v5 - Group by blog hreflang_group + qa_type',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Repair v5] Error in repair-hreflang-groups:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
