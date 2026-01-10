import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dryRun = false } = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[sync-all-translations-jsonb] Starting GLOBAL sync for all articles and Q&As...`);

    const results = {
      articles: { updated: 0, skipped: 0, totalGroups: 0 },
      qas: { updated: 0, skipped: 0, totalGroups: 0 },
    };

    // ========== PHASE 1: SYNC BLOG ARTICLES ==========
    console.log(`[sync-all-translations-jsonb] Phase 1: Syncing blog articles...`);

    const { data: articles, error: articleFetchError } = await supabase
      .from('blog_articles')
      .select('id, slug, language, hreflang_group_id, translations, cluster_id')
      .not('hreflang_group_id', 'is', null)
      .in('status', ['draft', 'published']);

    if (articleFetchError) {
      throw new Error(`Failed to fetch articles: ${articleFetchError.message}`);
    }

    if (articles && articles.length > 0) {
      console.log(`[sync-all-translations-jsonb] Found ${articles.length} articles with hreflang_group_id`);

      // Group articles by hreflang_group_id
      const groupedArticles: Record<string, typeof articles> = {};
      for (const article of articles) {
        const groupId = article.hreflang_group_id;
        if (!groupedArticles[groupId]) {
          groupedArticles[groupId] = [];
        }
        groupedArticles[groupId].push(article);
      }

      results.articles.totalGroups = Object.keys(groupedArticles).length;
      console.log(`[sync-all-translations-jsonb] Found ${results.articles.totalGroups} article hreflang groups`);

      const articleUpdates: { id: string; translations: Record<string, { id: string; slug: string }> }[] = [];

      for (const [groupId, groupArticles] of Object.entries(groupedArticles)) {
        for (const article of groupArticles) {
          const newTranslations: Record<string, { id: string; slug: string }> = {};
          
          // Add ALL languages in the group as translations (including self-reference)
          for (const sibling of groupArticles) {
            newTranslations[sibling.language] = {
              id: sibling.id,
              slug: sibling.slug
            };
          }

          // Check if we need to update
          const currentTranslations = article.translations as Record<string, { id: string; slug: string }> | null;
          const currentKeys = currentTranslations ? Object.keys(currentTranslations).sort().join(',') : '';
          const newKeys = Object.keys(newTranslations).sort().join(',');

          if (currentKeys !== newKeys || !currentTranslations) {
            articleUpdates.push({ id: article.id, translations: newTranslations });
          } else {
            results.articles.skipped++;
          }
        }
      }

      console.log(`[sync-all-translations-jsonb] ${articleUpdates.length} articles need updates`);

      if (!dryRun) {
        // Apply updates in batches
        const batchSize = 50;
        for (let i = 0; i < articleUpdates.length; i += batchSize) {
          const batch = articleUpdates.slice(i, i + batchSize);
          
          for (const update of batch) {
            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({ translations: update.translations })
              .eq('id', update.id);

            if (updateError) {
              console.error(`[sync-all-translations-jsonb] Failed to update article ${update.id}: ${updateError.message}`);
            } else {
              results.articles.updated++;
            }
          }
        }
      } else {
        results.articles.updated = articleUpdates.length;
      }
    }

    // ========== PHASE 2: SYNC Q&A PAGES ==========
    console.log(`[sync-all-translations-jsonb] Phase 2: Syncing Q&A pages...`);

    const { data: qaPages, error: qaFetchError } = await supabase
      .from('qa_pages')
      .select('id, slug, language, hreflang_group_id, translations')
      .not('hreflang_group_id', 'is', null)
      .eq('status', 'published');

    if (qaFetchError) {
      throw new Error(`Failed to fetch Q&A pages: ${qaFetchError.message}`);
    }

    if (qaPages && qaPages.length > 0) {
      console.log(`[sync-all-translations-jsonb] Found ${qaPages.length} Q&A pages with hreflang_group_id`);

      // Group Q&A pages by hreflang_group_id
      const groupedQAs: Record<string, typeof qaPages> = {};
      for (const page of qaPages) {
        const groupId = page.hreflang_group_id;
        if (!groupedQAs[groupId]) {
          groupedQAs[groupId] = [];
        }
        groupedQAs[groupId].push(page);
      }

      results.qas.totalGroups = Object.keys(groupedQAs).length;
      console.log(`[sync-all-translations-jsonb] Found ${results.qas.totalGroups} Q&A hreflang groups`);

      const qaUpdates: { id: string; translations: Record<string, string> }[] = [];

      for (const [groupId, groupPages] of Object.entries(groupedQAs)) {
        for (const page of groupPages) {
          const newTranslations: Record<string, string> = {};
          
          // Add ALL languages in the group as translations (including self-reference)
          for (const sibling of groupPages) {
            newTranslations[sibling.language] = sibling.slug;
          }

          // Check if we need to update
          const currentTranslations = page.translations as Record<string, string> | null;
          const currentKeys = currentTranslations ? Object.keys(currentTranslations).sort().join(',') : '';
          const newKeys = Object.keys(newTranslations).sort().join(',');

          if (currentKeys !== newKeys || !currentTranslations) {
            qaUpdates.push({ id: page.id, translations: newTranslations });
          } else {
            results.qas.skipped++;
          }
        }
      }

      console.log(`[sync-all-translations-jsonb] ${qaUpdates.length} Q&A pages need updates`);

      if (!dryRun) {
        // Apply updates in batches
        const batchSize = 50;
        for (let i = 0; i < qaUpdates.length; i += batchSize) {
          const batch = qaUpdates.slice(i, i + batchSize);
          
          for (const update of batch) {
            const { error: updateError } = await supabase
              .from('qa_pages')
              .update({ translations: update.translations })
              .eq('id', update.id);

            if (updateError) {
              console.error(`[sync-all-translations-jsonb] Failed to update Q&A page ${update.id}: ${updateError.message}`);
            } else {
              results.qas.updated++;
            }
          }
        }
      } else {
        results.qas.updated = qaUpdates.length;
      }
    }

    console.log(`[sync-all-translations-jsonb] Complete!`);
    console.log(`  Articles: ${results.articles.updated} updated, ${results.articles.skipped} skipped`);
    console.log(`  Q&As: ${results.qas.updated} updated, ${results.qas.skipped} skipped`);

    return new Response(
      JSON.stringify({ 
        success: true,
        dryRun,
        articles: results.articles,
        qas: results.qas,
        totalUpdated: results.articles.updated + results.qas.updated,
        totalSkipped: results.articles.skipped + results.qas.skipped,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[sync-all-translations-jsonb] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
