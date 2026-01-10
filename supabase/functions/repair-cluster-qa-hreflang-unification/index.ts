import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * repair-cluster-qa-hreflang-unification
 * 
 * Purpose: Unify "orphaned" non-English Q&As that have isolated hreflang_group_id values
 * with their correct English counterparts based on:
 * 1. Same qa_type (process, costs, legal, pitfalls)
 * 2. Source article's hreflang_group_id matches (linking translated articles together)
 * 
 * This fixes the issue where non-English Q&As were created with NEW hreflang_group_ids
 * instead of inheriting from the English source Q&A, causing them to appear as "orphaned"
 * and counting incorrectly in the UI.
 */

interface QAPage {
  id: string;
  language: string;
  slug: string;
  qa_type: string;
  source_article_id: string;
  hreflang_group_id: string | null;
  translations: Record<string, string> | null;
}

interface Article {
  id: string;
  language: string;
  slug: string;
  hreflang_group_id: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clusterId, dryRun = false } = await req.json();

    if (!clusterId) {
      throw new Error('clusterId is required');
    }

    console.log(`[QAUnification] Starting for cluster ${clusterId} (dryRun: ${dryRun})`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all Q&As for this cluster
    const { data: allQAs, error: qaError } = await supabase
      .from('qa_pages')
      .select('id, language, slug, qa_type, source_article_id, hreflang_group_id, translations')
      .eq('cluster_id', clusterId);

    if (qaError) {
      throw new Error(`Failed to fetch Q&As: ${qaError.message}`);
    }

    if (!allQAs || allQAs.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No Q&As found in cluster',
        orphansFound: 0,
        unified: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[QAUnification] Found ${allQAs.length} Q&As`);

    // Fetch all articles to get their hreflang mappings
    const { data: allArticles, error: articleError } = await supabase
      .from('blog_articles')
      .select('id, language, slug, hreflang_group_id')
      .eq('cluster_id', clusterId)
      .eq('status', 'published');

    if (articleError) {
      throw new Error(`Failed to fetch articles: ${articleError.message}`);
    }

    // Build article lookup by ID
    const articlesById = new Map<string, Article>();
    const articlesByHreflangGroup = new Map<string, Article[]>();
    
    for (const article of (allArticles || [])) {
      articlesById.set(article.id, article as Article);
      
      if (article.hreflang_group_id) {
        if (!articlesByHreflangGroup.has(article.hreflang_group_id)) {
          articlesByHreflangGroup.set(article.hreflang_group_id, []);
        }
        articlesByHreflangGroup.get(article.hreflang_group_id)!.push(article as Article);
      }
    }

    // Separate English and non-English Q&As
    const englishQAs = allQAs.filter(qa => qa.language === 'en') as QAPage[];
    const nonEnglishQAs = allQAs.filter(qa => qa.language !== 'en') as QAPage[];

    console.log(`[QAUnification] ${englishQAs.length} English Q&As, ${nonEnglishQAs.length} non-English Q&As`);

    // Build lookup for English Q&As by article_hreflang_group + qa_type
    // This is the canonical source of truth for hreflang_group_id
    const englishQAByArticleGroupAndType = new Map<string, QAPage>();
    
    for (const enQA of englishQAs) {
      const sourceArticle = articlesById.get(enQA.source_article_id);
      if (sourceArticle?.hreflang_group_id) {
        const key = `${sourceArticle.hreflang_group_id}:${enQA.qa_type}`;
        englishQAByArticleGroupAndType.set(key, enQA);
      }
    }

    // Find orphaned non-English Q&As and determine their correct English counterpart
    const orphans: { qa: QAPage; correctEnglishQA: QAPage; correctGroupId: string }[] = [];
    const alreadyCorrect: QAPage[] = [];
    const noMatchFound: QAPage[] = [];

    for (const nonEnQA of nonEnglishQAs) {
      // Get the article this Q&A is linked to
      const sourceArticle = articlesById.get(nonEnQA.source_article_id);
      
      if (!sourceArticle?.hreflang_group_id) {
        console.log(`[QAUnification] Q&A ${nonEnQA.id} (${nonEnQA.language}): Source article has no hreflang_group_id`);
        noMatchFound.push(nonEnQA);
        continue;
      }

      // Find the English Q&A that should be this Q&A's counterpart
      // The English Q&A should have:
      // 1. Same qa_type
      // 2. Source article that shares the same hreflang_group_id
      const key = `${sourceArticle.hreflang_group_id}:${nonEnQA.qa_type}`;
      const correctEnglishQA = englishQAByArticleGroupAndType.get(key);

      if (!correctEnglishQA) {
        console.log(`[QAUnification] Q&A ${nonEnQA.id} (${nonEnQA.language}, ${nonEnQA.qa_type}): No matching English Q&A found`);
        noMatchFound.push(nonEnQA);
        continue;
      }

      if (!correctEnglishQA.hreflang_group_id) {
        console.log(`[QAUnification] Q&A ${nonEnQA.id} (${nonEnQA.language}): English Q&A has no hreflang_group_id`);
        noMatchFound.push(nonEnQA);
        continue;
      }

      // Check if this Q&A is already correctly linked
      if (nonEnQA.hreflang_group_id === correctEnglishQA.hreflang_group_id) {
        alreadyCorrect.push(nonEnQA);
      } else {
        // This Q&A has a wrong hreflang_group_id - it's orphaned
        orphans.push({
          qa: nonEnQA,
          correctEnglishQA,
          correctGroupId: correctEnglishQA.hreflang_group_id,
        });
      }
    }

    console.log(`[QAUnification] Found ${orphans.length} orphaned Q&As, ${alreadyCorrect.length} already correct, ${noMatchFound.length} no match`);

    if (dryRun) {
      // Group orphans by their correct group for preview
      const orphansByGroup = new Map<string, typeof orphans>();
      for (const orphan of orphans) {
        if (!orphansByGroup.has(orphan.correctGroupId)) {
          orphansByGroup.set(orphan.correctGroupId, []);
        }
        orphansByGroup.get(orphan.correctGroupId)!.push(orphan);
      }

      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        message: `Found ${orphans.length} orphaned Q&As to unify`,
        totalQAs: allQAs.length,
        englishQAs: englishQAs.length,
        nonEnglishQAs: nonEnglishQAs.length,
        orphansFound: orphans.length,
        alreadyCorrect: alreadyCorrect.length,
        noMatchFound: noMatchFound.length,
        groupsAffected: orphansByGroup.size,
        preview: orphans.slice(0, 20).map(o => ({
          qaId: o.qa.id,
          language: o.qa.language,
          qaType: o.qa.qa_type,
          currentGroupId: o.qa.hreflang_group_id,
          correctGroupId: o.correctGroupId,
          englishQAId: o.correctEnglishQA.id,
        })),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Apply fixes: Update orphaned Q&As with correct hreflang_group_id
    let unified = 0;
    const errors: string[] = [];

    for (const orphan of orphans) {
      const { error: updateError } = await supabase
        .from('qa_pages')
        .update({
          hreflang_group_id: orphan.correctGroupId,
        })
        .eq('id', orphan.qa.id);

      if (updateError) {
        console.error(`[QAUnification] Error updating Q&A ${orphan.qa.id}:`, updateError);
        errors.push(`${orphan.qa.id}: ${updateError.message}`);
      } else {
        unified++;
      }
    }

    console.log(`[QAUnification] Unified ${unified} orphaned Q&As`);

    // Step 2: Rebuild translations JSONB for all affected groups
    // Collect all unique group IDs that were modified
    const affectedGroupIds = new Set(orphans.map(o => o.correctGroupId));
    
    let translationsRebuilt = 0;
    for (const groupId of affectedGroupIds) {
      // Fetch all Q&As in this group now
      const { data: groupQAs, error: groupError } = await supabase
        .from('qa_pages')
        .select('id, language, slug')
        .eq('hreflang_group_id', groupId);

      if (groupError || !groupQAs) {
        console.error(`[QAUnification] Error fetching group ${groupId}:`, groupError);
        continue;
      }

      // Build translations map
      const translations: Record<string, string> = {};
      for (const qa of groupQAs) {
        translations[qa.language] = qa.slug;
      }

      // Update all Q&As in this group with the complete translations map
      for (const qa of groupQAs) {
        const { error: updateError } = await supabase
          .from('qa_pages')
          .update({ translations })
          .eq('id', qa.id);

        if (updateError) {
          console.error(`[QAUnification] Error updating translations for ${qa.id}:`, updateError);
        } else {
          translationsRebuilt++;
        }
      }
    }

    console.log(`[QAUnification] Rebuilt translations for ${translationsRebuilt} Q&As across ${affectedGroupIds.size} groups`);

    return new Response(JSON.stringify({
      success: errors.length === 0,
      message: `Unified ${unified} orphaned Q&As across ${affectedGroupIds.size} groups`,
      totalQAs: allQAs.length,
      orphansFound: orphans.length,
      unified,
      translationsRebuilt,
      groupsAffected: affectedGroupIds.size,
      alreadyCorrect: alreadyCorrect.length,
      noMatchFound: noMatchFound.length,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[QAUnification] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
