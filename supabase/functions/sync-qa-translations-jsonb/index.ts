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
    const { hreflangGroupId, clusterId, dryRun = false } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const filterDesc = hreflangGroupId 
      ? `for group ${hreflangGroupId}` 
      : clusterId 
        ? `for cluster ${clusterId}` 
        : 'for all groups (paginated)';
    console.log(`[sync-qa-translations-jsonb] Starting sync ${filterDesc}`);

    // Fetch Q&A pages with pagination to avoid 1000-row limit
    const allQaPages: Array<{
      id: string;
      slug: string;
      language: string;
      hreflang_group_id: string;
      translations: Record<string, string> | null;
    }> = [];
    
    const fetchBatchSize = 1000;
    let offset = 0;
    
    while (true) {
      let query = supabase
        .from('qa_pages')
        .select('id, slug, language, hreflang_group_id, translations')
        .not('hreflang_group_id', 'is', null)
        .eq('status', 'published')
        .range(offset, offset + fetchBatchSize - 1);

      // Apply filters
      if (hreflangGroupId) {
        query = query.eq('hreflang_group_id', hreflangGroupId);
      }
      if (clusterId) {
        query = query.eq('cluster_id', clusterId);
      }

      const { data: batch, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(`Failed to fetch Q&A pages: ${fetchError.message}`);
      }

      if (!batch || batch.length === 0) break;
      
      allQaPages.push(...batch);
      console.log(`[sync-qa-translations-jsonb] Fetched batch: ${batch.length} rows (total: ${allQaPages.length})`);
      
      if (batch.length < fetchBatchSize) break;
      offset += fetchBatchSize;
    }

    const qaPages = allQaPages;

    if (qaPages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No Q&A pages found', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-qa-translations-jsonb] Found ${qaPages.length} Q&A pages with hreflang_group_id`);

    // Group Q&A pages by hreflang_group_id
    const groupedByHreflang: Record<string, typeof qaPages> = {};
    for (const page of qaPages) {
      const groupId = page.hreflang_group_id;
      if (!groupedByHreflang[groupId]) {
        groupedByHreflang[groupId] = [];
      }
      groupedByHreflang[groupId].push(page);
    }

    console.log(`[sync-qa-translations-jsonb] Found ${Object.keys(groupedByHreflang).length} hreflang groups`);

    let updatedCount = 0;
    let skippedCount = 0;
    const updates: { id: string; translations: Record<string, string> }[] = [];

    // For each group, build the complete translations JSONB for all Q&A pages
    for (const [groupId, groupPages] of Object.entries(groupedByHreflang)) {
      if (groupPages.length < 2) {
        // Single page, no translations to link (but we still add self-reference)
        const page = groupPages[0];
        const newTranslations: Record<string, string> = {
          [page.language]: page.slug
        };
        
        const currentTranslations = page.translations as Record<string, string> | null;
        if (!currentTranslations || Object.keys(currentTranslations).length === 0) {
          updates.push({ id: page.id, translations: newTranslations });
        } else {
          skippedCount++;
        }
        continue;
      }

      // For each page in the group, create its translations object
      for (const page of groupPages) {
        const newTranslations: Record<string, string> = {};
        
        // Add ALL languages in the group as translations (including self-reference for hreflang compliance)
        for (const sibling of groupPages) {
          newTranslations[sibling.language] = sibling.slug;
        }

        // Check if we need to update
        const currentTranslations = page.translations as Record<string, string> | null;
        const currentKeys = currentTranslations ? Object.keys(currentTranslations).sort().join(',') : '';
        const newKeys = Object.keys(newTranslations).sort().join(',');

        if (currentKeys !== newKeys || !currentTranslations) {
          updates.push({ id: page.id, translations: newTranslations });
        } else {
          skippedCount++;
        }
      }
    }

    console.log(`[sync-qa-translations-jsonb] ${updates.length} Q&A pages need updates, ${skippedCount} already correct`);

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
          .from('qa_pages')
          .update({ translations: update.translations })
          .eq('id', update.id);

        if (updateError) {
          console.error(`[sync-qa-translations-jsonb] Failed to update Q&A page ${update.id}: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      }

      console.log(`[sync-qa-translations-jsonb] Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)}`);
    }

    console.log(`[sync-qa-translations-jsonb] Complete! Updated ${updatedCount} Q&A pages`);

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
    console.error('[sync-qa-translations-jsonb] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
