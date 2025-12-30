import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QAPageWithArticle {
  id: string
  cluster_id: string | null
  language: string
  qa_type: string | null
  slug: string
  hreflang_group_id: string | null
  source_article_id: string | null
  created_at: string
  question_main: string | null
  source_article?: {
    id: string
    hreflang_group_id: string | null
  } | null
}

/**
 * Repairs hreflang_group_id assignments for QA pages.
 * 
 * FIXED STRATEGY (v4):
 * Each Q&A gets its OWN unique hreflang_group_id.
 * 
 * WHY: We cannot reliably match Q&As across languages because:
 * - Different language articles generate DIFFERENT questions
 * - Same qa_type does NOT mean same question
 * - Example: Polish "Main challenges..." ≠ German "Luxury living..."
 * 
 * This means:
 * - Each Q&A has a single-language hreflang group
 * - Hreflang tags only include that one language (self-referencing)
 * - No incorrect cross-language linking
 * - Safe and predictable behavior
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

    console.log(`[Repair v4] Starting hreflang group repair (dryRun: ${dryRun}, clusterId: ${clusterId || 'all'}, contentType: ${contentType || 'qa'})`)

    // Fetch all published Q&A pages
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
        question_main
      `)
      .eq('status', 'published')
      .order('created_at')

    if (clusterId) {
      query = query.eq('cluster_id', clusterId)
    }

    const { data: qaPages, error: fetchError } = await query as { 
      data: QAPageWithArticle[] | null
      error: any 
    }

    if (fetchError) {
      console.error('[Repair v4] Error fetching Q&A pages:', fetchError)
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

    console.log(`[Repair v4] Found ${qaPages.length} Q&A pages to process`)

    // ========== NEW STRATEGY (v4): Each Q&A gets its own unique hreflang_group_id ==========
    // This prevents incorrect cross-language linking since we cannot reliably match Q&As
    
    const updates: { id: string; hreflang_group_id: string; translations: Record<string, string> }[] = []
    const stats = {
      totalQAs: qaPages.length,
      groupsCreated: 0,
      singleLanguageGroups: 0,
    }

    for (const qa of qaPages) {
      // Each Q&A gets its own unique hreflang_group_id
      const hreflangGroupId = crypto.randomUUID()
      
      // Translations only contains self (single language)
      const translations: Record<string, string> = {
        [qa.language]: qa.slug
      }
      
      updates.push({
        id: qa.id,
        hreflang_group_id: hreflangGroupId,
        translations
      })
      
      stats.groupsCreated++
      stats.singleLanguageGroups++
    }

    console.log(`[Repair v4] Stats:`, stats)
    console.log(`[Repair v4] Total updates queued: ${updates.length}`)

    if (dryRun) {
      // Return preview of changes without applying
      const preview = updates.slice(0, 20).map(u => ({
        id: u.id,
        new_hreflang_group_id: u.hreflang_group_id,
        languages_linked: Object.keys(u.translations),
      }))

      return new Response(
        JSON.stringify({
          dryRun: true,
          message: `Would update ${updates.length} Q&A pages, each with its own unique hreflang_group_id`,
          stats,
          strategy: 'v4 - Each Q&A gets its own hreflang group (no cross-language linking)',
          reason: 'Cannot reliably match Q&As across languages - different articles generate different questions',
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
          console.error(`[Repair v4] Error updating Q&A ${update.id}:`, updateError)
          errorCount++
        } else {
          successCount++
        }
      }

      console.log(`[Repair v4] Processed batch ${Math.floor(i / batchSize) + 1}, success: ${successCount}, errors: ${errorCount}`)
    }

    return new Response(
      JSON.stringify({
        dryRun: false,
        message: `Updated ${successCount} Q&A pages with unique hreflang_group_ids (${errorCount} errors)`,
        stats: {
          ...stats,
          successCount,
          errorCount,
        },
        strategy: 'v4 - Each Q&A gets its own hreflang group (no cross-language linking)',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Repair v4] Error in repair-hreflang-groups:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
