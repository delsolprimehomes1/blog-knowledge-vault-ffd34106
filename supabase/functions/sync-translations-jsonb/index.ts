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
    const { clusterId, dryRun = false } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[sync-translations-jsonb] Starting sync${clusterId ? ` for cluster ${clusterId}` : ' for all clusters'}`);

    // Build query
    let query = supabase
      .from('blog_articles')
      .select('id, slug, language, hreflang_group_id, translations, cluster_id')
      .not('hreflang_group_id', 'is', null)
      .in('status', ['draft', 'published']);

    if (clusterId) {
      query = query.eq('cluster_id', clusterId);
    }

    const { data: articles, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No articles found', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-translations-jsonb] Found ${articles.length} articles with hreflang_group_id`);

    // Group articles by hreflang_group_id
    const groupedByHreflang: Record<string, typeof articles> = {};
    for (const article of articles) {
      const groupId = article.hreflang_group_id;
      if (!groupedByHreflang[groupId]) {
        groupedByHreflang[groupId] = [];
      }
      groupedByHreflang[groupId].push(article);
    }

    console.log(`[sync-translations-jsonb] Found ${Object.keys(groupedByHreflang).length} hreflang groups`);

    let updatedCount = 0;
    let skippedCount = 0;
    const updates: { id: string; translations: Record<string, { id: string; slug: string }> }[] = [];

    // For each group, build the complete translations JSONB for all articles
    for (const [groupId, groupArticles] of Object.entries(groupedByHreflang)) {
      if (groupArticles.length < 2) {
        // Single article, no translations to link
        skippedCount++;
        continue;
      }

      // For each article in the group, create its translations object
      for (const article of groupArticles) {
        const newTranslations: Record<string, { id: string; slug: string }> = {};
        
        // Add all OTHER languages in the group as translations
        for (const sibling of groupArticles) {
          if (sibling.id !== article.id && sibling.language !== article.language) {
            newTranslations[sibling.language] = {
              id: sibling.id,
              slug: sibling.slug
            };
          }
        }

        // Check if we need to update
        const currentTranslations = article.translations as Record<string, { id: string; slug: string }> | null;
        const currentKeys = currentTranslations ? Object.keys(currentTranslations).sort().join(',') : '';
        const newKeys = Object.keys(newTranslations).sort().join(',');

        if (currentKeys !== newKeys || !currentTranslations) {
          updates.push({ id: article.id, translations: newTranslations });
        } else {
          skippedCount++;
        }
      }
    }

    console.log(`[sync-translations-jsonb] ${updates.length} articles need updates, ${skippedCount} already correct`);

    if (dryRun) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          dryRun: true,
          toUpdate: updates.length,
          skipped: skippedCount,
          preview: updates.slice(0, 10).map(u => ({
            id: u.id,
            languageCount: Object.keys(u.translations).length
          }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply updates in batches
    const batchSize = 50;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const update of batch) {
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({ translations: update.translations })
          .eq('id', update.id);

        if (updateError) {
          console.error(`[sync-translations-jsonb] Failed to update article ${update.id}: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      }

      console.log(`[sync-translations-jsonb] Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)}`);
    }

    console.log(`[sync-translations-jsonb] Complete! Updated ${updatedCount} articles`);

    return new Response(
      JSON.stringify({ 
        success: true,
        updated: updatedCount,
        skipped: skippedCount,
        totalGroups: Object.keys(groupedByHreflang).length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[sync-translations-jsonb] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
