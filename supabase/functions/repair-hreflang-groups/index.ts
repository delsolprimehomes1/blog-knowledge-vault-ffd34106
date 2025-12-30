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
 * FIXED STRATEGY (v3):
 * 1. Join Q&As with their source blog_articles
 * 2. Group Q&As by the BLOG ARTICLE'S hreflang_group_id + qa_type
 *    - This ensures Q&As from translated articles (EN/DE/FR/NL/PL) are grouped together
 *    - Because translated blog articles share the same hreflang_group_id
 * 3. Fallback to source_article_id for articles without hreflang_group
 * 4. Fallback to slug-based grouping for Q&As without source_article_id
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

    console.log(`[Repair v3] Starting hreflang group repair (dryRun: ${dryRun}, clusterId: ${clusterId || 'all'}, contentType: ${contentType || 'qa'})`)

    // Fetch all published Q&A pages with their source article's hreflang_group_id
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
          id,
          hreflang_group_id
        )
      `)
      .eq('status', 'published')
      .order('source_article_id')
      .order('qa_type')
      .order('created_at')

    if (clusterId) {
      query = query.eq('cluster_id', clusterId)
    }

    const { data: qaPages, error: fetchError } = await query as { 
      data: QAPageWithArticle[] | null
      error: any 
    }

    if (fetchError) {
      console.error('[Repair v3] Error fetching Q&A pages:', fetchError)
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

    console.log(`[Repair v3] Found ${qaPages.length} Q&A pages to process`)

    // Log how many have source_article with hreflang_group_id
    const withArticleHreflang = qaPages.filter(q => q.source_article?.hreflang_group_id).length
    const withArticle = qaPages.filter(q => q.source_article_id).length
    console.log(`[Repair v3] ${withArticleHreflang}/${withArticle} Q&As have source article with hreflang_group_id`)

    // ========== FIXED GROUPING LOGIC (v3) ==========
    // Group by blog article's hreflang_group_id + qa_type
    // This links Q&As from translated articles together!
    const groupedQAs = new Map<string, QAPageWithArticle[]>()
    
    for (const qa of qaPages) {
      let groupKey: string
      
      // PRIMARY: Use the blog article's hreflang_group_id
      // This links Q&As from translated articles together
      if (qa.source_article?.hreflang_group_id) {
        groupKey = `article-hreflang::${qa.source_article.hreflang_group_id}::${qa.qa_type || 'default'}`
      } 
      // FALLBACK 1: Article exists but no hreflang_group
      else if (qa.source_article_id) {
        groupKey = `article::${qa.source_article_id}::${qa.qa_type || 'default'}`
      } 
      // FALLBACK 2: No source article (standalone Q&A)
      else {
        const baseSlug = qa.slug.replace(/-[a-z]{2}-[a-z0-9]+$/i, '')
        groupKey = `slug::${baseSlug}::${qa.qa_type || 'default'}`
      }
      
      if (!groupedQAs.has(groupKey)) {
        groupedQAs.set(groupKey, [])
      }
      groupedQAs.get(groupKey)!.push(qa)
    }

    console.log(`[Repair v3] Created ${groupedQAs.size} potential hreflang groups`)
    
    // Log sample group to verify correct linking
    const sampleGroup = Array.from(groupedQAs.entries())[0]
    if (sampleGroup) {
      const [key, qas] = sampleGroup
      console.log(`[Repair v3] Sample group key: ${key}`)
      console.log(`[Repair v3] Sample languages: ${qas.map(q => q.language).sort().join(', ')}`)
      console.log(`[Repair v3] Sample slugs: ${qas.map(q => q.slug.substring(0, 40)).join(', ')}`)
    }
    
    // Log group size distribution
    const groupSizes = Array.from(groupedQAs.values()).map(g => g.length)
    console.log(`[Repair v3] Group sizes: min=${Math.min(...groupSizes)}, max=${Math.max(...groupSizes)}, avg=${(groupSizes.reduce((a,b) => a+b, 0) / groupSizes.length).toFixed(1)}`)

    const updates: { id: string; hreflang_group_id: string; translations: Record<string, string> }[] = []
    const stats = {
      groupsProcessed: 0,
      validGroups: 0,
      groupsWithDuplicateLanguages: 0,
      groupsOver10Pages: 0,
      englishAnchors: 0,
      translationsLinked: 0,
      noEnglishAnchor: 0,
      groupedByArticleHreflang: 0,
      groupedByArticleId: 0,
      groupedBySlug: 0,
    }

    const warnings: string[] = []

    for (const [groupKey, qas] of groupedQAs) {
      stats.groupsProcessed++
      
      // Track grouping method
      if (groupKey.startsWith('article-hreflang::')) {
        stats.groupedByArticleHreflang++
      } else if (groupKey.startsWith('article::')) {
        stats.groupedByArticleId++
      } else {
        stats.groupedBySlug++
      }
      
      // ========== VALIDATION ==========
      // Check for duplicate languages within this group
      const languages = qas.map(q => q.language)
      const uniqueLanguages = new Set(languages)
      
      if (languages.length !== uniqueLanguages.size) {
        stats.groupsWithDuplicateLanguages++
        const duplicateLangs = languages.filter((l, i) => languages.indexOf(l) !== i)
        warnings.push(`Group ${groupKey.substring(0, 60)} has duplicate languages: ${duplicateLangs.join(', ')} (${qas.length} total pages)`)
        console.warn(`[Repair v3] ⚠️ Group has ${qas.length} pages but only ${uniqueLanguages.size} unique languages`)
        
        // For groups with duplicates, we need to split them further
        // Strategy: Group by (language + position-in-creation-order)
        
        // Sort all Q&As by creation time
        const sortedQAs = [...qas].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        
        // Group by language first to determine max number of Q&As per language
        const byLang = new Map<string, QAPageWithArticle[]>()
        for (const qa of sortedQAs) {
          if (!byLang.has(qa.language)) {
            byLang.set(qa.language, [])
          }
          byLang.get(qa.language)!.push(qa)
        }
        
        // Find max count per language
        const maxPerLang = Math.max(...Array.from(byLang.values()).map(arr => arr.length))
        
        // Create sub-groups by position
        for (let pos = 0; pos < maxPerLang; pos++) {
          const subGroup: QAPageWithArticle[] = []
          for (const [lang, langQAs] of byLang) {
            if (pos < langQAs.length) {
              subGroup.push(langQAs[pos])
            }
          }
          
          if (subGroup.length > 0) {
            // Process this sub-group with a unique hreflang_group_id
            const hreflangGroupId = crypto.randomUUID()
            
            const translations: Record<string, string> = {}
            for (const qa of subGroup) {
              translations[qa.language] = qa.slug
            }
            
            for (const qa of subGroup) {
              updates.push({ id: qa.id, hreflang_group_id: hreflangGroupId, translations })
            }
            
            stats.translationsLinked += subGroup.length
          }
        }
        
        continue // Skip normal processing for this group
      }
      
      if (qas.length > 10) {
        stats.groupsOver10Pages++
        warnings.push(`Group ${groupKey.substring(0, 60)} has ${qas.length} pages (expected max 10)`)
        console.warn(`[Repair v3] ⚠️ Group ${groupKey} has ${qas.length} pages (expected max 10)`)
      }
      
      stats.validGroups++
      
      // ========== NORMAL PROCESSING ==========
      // Separate English Q&As from other languages
      const englishQAs = qas.filter(q => q.language === 'en').sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      
      if (englishQAs.length === 0) {
        // No English anchor - use the first Q&A of any language as anchor
        stats.noEnglishAnchor++
        const sortedQAs = qas.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        
        if (sortedQAs.length > 0) {
          // Generate new UUID for clean groups
          const hreflangGroupId = crypto.randomUUID()
          
          // Build translations map
          const translations: Record<string, string> = {}
          for (const qa of sortedQAs) {
            translations[qa.language] = qa.slug
          }
          
          for (const qa of sortedQAs) {
            updates.push({ id: qa.id, hreflang_group_id: hreflangGroupId, translations })
          }
          
          stats.translationsLinked += sortedQAs.length
        }
        continue
      }

      stats.englishAnchors += englishQAs.length

      // For valid groups with English anchor
      // Generate new hreflang_group_id to ensure clean state
      const hreflangGroupId = crypto.randomUUID()
      
      // Build translations map
      const translations: Record<string, string> = {}
      for (const qa of qas) {
        translations[qa.language] = qa.slug
      }

      // Queue updates for all Q&As in this group
      for (const qa of qas) {
        updates.push({ id: qa.id, hreflang_group_id: hreflangGroupId, translations })
      }
      
      stats.translationsLinked += qas.length
    }

    console.log(`[Repair v3] Stats:`, stats)
    console.log(`[Repair v3] Total updates queued: ${updates.length}`)
    if (warnings.length > 0) {
      console.log(`[Repair v3] Warnings (${warnings.length}):`, warnings.slice(0, 5))
    }

    if (dryRun) {
      // Return preview of changes without applying
      const preview = updates.slice(0, 20).map(u => ({
        id: u.id,
        new_hreflang_group_id: u.hreflang_group_id,
        languages_linked: Object.keys(u.translations),
      }))

      // Calculate expected group distribution after fix
      const newGroupIds = new Set(updates.map(u => u.hreflang_group_id))
      const groupDistribution = new Map<number, number>()
      for (const groupId of newGroupIds) {
        const count = updates.filter(u => u.hreflang_group_id === groupId).length
        groupDistribution.set(count, (groupDistribution.get(count) || 0) + 1)
      }

      return new Response(
        JSON.stringify({
          dryRun: true,
          message: `Would update ${updates.length} Q&A pages across ${newGroupIds.size} hreflang groups`,
          stats,
          warnings: warnings.slice(0, 10),
          expectedGroupSizes: Object.fromEntries(groupDistribution),
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
          console.error(`[Repair v3] Error updating Q&A ${update.id}:`, updateError)
          errorCount++
        } else {
          successCount++
        }
      }

      console.log(`[Repair v3] Processed batch ${Math.floor(i / batchSize) + 1}, success: ${successCount}, errors: ${errorCount}`)
    }

    // Calculate final group distribution
    const newGroupIds = new Set(updates.map(u => u.hreflang_group_id))

    return new Response(
      JSON.stringify({
        dryRun: false,
        message: `Updated ${successCount} Q&A pages across ${newGroupIds.size} hreflang groups (${errorCount} errors)`,
        stats: {
          ...stats,
          successCount,
          errorCount,
          totalHreflangGroups: newGroupIds.size,
        },
        warnings: warnings.slice(0, 10),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Repair v3] Error in repair-hreflang-groups:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
