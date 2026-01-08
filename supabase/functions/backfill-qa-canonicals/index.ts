import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'https://www.delsolprimehomes.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to true for safety
    const clusterId = body.clusterId; // Optional: limit to specific cluster
    
    console.log(`[Backfill Canonicals] Starting (dryRun: ${dryRun}, clusterId: ${clusterId || 'all'})...`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query Q&A pages missing canonical URLs
    let query = supabase
      .from('qa_pages')
      .select('id, slug, language')
      .is('canonical_url', null);
    
    if (clusterId) {
      query = query.eq('cluster_id', clusterId);
    }

    const { data: missingCanonicals, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    const count = missingCanonicals?.length || 0;
    console.log(`[Backfill Canonicals] Found ${count} Q&A pages missing canonical URLs`);

    if (count === 0) {
      return new Response(JSON.stringify({
        dryRun,
        message: 'All Q&A pages already have canonical URLs',
        updated: 0,
        total: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Group by language for reporting
    const byLanguage: Record<string, number> = {};
    missingCanonicals?.forEach(qa => {
      byLanguage[qa.language] = (byLanguage[qa.language] || 0) + 1;
    });

    if (dryRun) {
      return new Response(JSON.stringify({
        dryRun: true,
        message: `Would update ${count} Q&A pages with canonical URLs`,
        total: count,
        byLanguage,
        sampleUpdates: missingCanonicals?.slice(0, 5).map(qa => ({
          id: qa.id,
          language: qa.language,
          slug: qa.slug,
          canonical_url: `${BASE_URL}/${qa.language}/qa/${qa.slug}`
        }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Execute updates in batches
    const BATCH_SIZE = 50;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < missingCanonicals!.length; i += BATCH_SIZE) {
      const batch = missingCanonicals!.slice(i, i + BATCH_SIZE);
      
      for (const qa of batch) {
        const canonicalUrl = `${BASE_URL}/${qa.language}/qa/${qa.slug}`;
        
        const { error: updateError } = await supabase
          .from('qa_pages')
          .update({ canonical_url: canonicalUrl })
          .eq('id', qa.id);

        if (updateError) {
          console.error(`[Backfill] Error updating ${qa.id}:`, updateError);
          errors.push(`${qa.id}: ${updateError.message}`);
          errorCount++;
        } else {
          updatedCount++;
        }
      }
      
      console.log(`[Backfill] Processed batch ${Math.floor(i / BATCH_SIZE) + 1}: ${updatedCount} updated, ${errorCount} errors`);
    }

    return new Response(JSON.stringify({
      dryRun: false,
      message: `Successfully updated ${updatedCount} Q&A pages with canonical URLs`,
      updated: updatedCount,
      total: count,
      byLanguage,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      errorCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('[Backfill Canonicals] Error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
