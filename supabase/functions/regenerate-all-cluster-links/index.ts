import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Strategic funnel-based linking rules (max 3 links per article)
const FUNNEL_LINK_STRATEGY = {
  TOFU: {
    maxWithinCluster: 3,
    targetStages: ['MOFU', 'TOFU'],
    description: '1-2 MOFU (funnel progression), 1 sibling TOFU (related topic)'
  },
  MOFU: {
    maxWithinCluster: 3,
    targetStages: ['TOFU', 'BOFU', 'MOFU'],
    description: '1 TOFU (context), 1 BOFU (conversion), 1 sibling MOFU (comparison)'
  },
  BOFU: {
    maxWithinCluster: 3,
    targetStages: ['MOFU', 'TOFU'],
    description: '2 MOFU (evidence), 1 TOFU (foundation)'
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchSize = 50, dryRun = false, clusterLimit = 0 } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Bulk Regenerate] Starting with batchSize=${batchSize}, dryRun=${dryRun}, clusterLimit=${clusterLimit}`);

    // Unique cluster IDs will be derived from the full article fetch below
    console.log(`[Bulk Regenerate] Fetching all published articles...`);

    // Fetch ALL published articles with pagination (bypass 1000-row default limit)
    let allArticles: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: page, error: pageError } = await supabase
        .from('blog_articles')
        .select('id, headline, slug, funnel_stage, language, cluster_id, cluster_number')
        .eq('status', 'published')
        .not('cluster_id', 'is', null)
        .range(from, from + pageSize - 1);
      if (pageError) throw pageError;
      if (!page || page.length === 0) break;
      allArticles = allArticles.concat(page);
      if (page.length < pageSize) break;
      from += pageSize;
    }


    // Get unique cluster IDs from fetched articles
    let uniqueClusterIds = [...new Set(allArticles.map(c => c.cluster_id).filter(Boolean))];
    // Apply cluster limit if specified (for testing)
    if (clusterLimit > 0) {
      uniqueClusterIds = uniqueClusterIds.slice(0, clusterLimit);
    }
    console.log(`[Bulk Regenerate] Processing ${uniqueClusterIds.length} clusters`);

    // Group articles by cluster and language
    const articlesByCluster: Record<string, Record<string, any[]>> = {};
    for (const article of allArticles || []) {
      const clusterId = article.cluster_id;
      const lang = article.language || 'en';
      
      if (!articlesByCluster[clusterId]) articlesByCluster[clusterId] = {};
      if (!articlesByCluster[clusterId][lang]) articlesByCluster[clusterId][lang] = [];
      articlesByCluster[clusterId][lang].push(article);
    }

    // Process all articles and collect updates
    const updates: { id: string; internal_links: any[] }[] = [];
    const results = {
      totalClusters: uniqueClusterIds.length,
      totalArticles: 0,
      byFunnelStage: { TOFU: { count: 0, totalLinks: 0 }, MOFU: { count: 0, totalLinks: 0 }, BOFU: { count: 0, totalLinks: 0 } } as Record<string, { count: number; totalLinks: number }>,
      processed: 0,
      errors: [] as string[]
    };

    // Process each cluster
    for (const clusterId of uniqueClusterIds) {
      const clusterArticles = articlesByCluster[clusterId];
      if (!clusterArticles) continue;

      // Process each language within the cluster
      for (const [lang, langArticles] of Object.entries(clusterArticles)) {
        for (const article of langArticles) {
          try {
            const funnelStage = article.funnel_stage || 'TOFU';
            const strategy = FUNNEL_LINK_STRATEGY[funnelStage as keyof typeof FUNNEL_LINK_STRATEGY] || FUNNEL_LINK_STRATEGY.TOFU;
            
            // Get other articles in same language within same cluster (excluding self)
            const otherArticles = langArticles.filter((a: any) => a.id !== article.id);
            
            // Generate strategic links based on funnel stage
            const strategicLinks = generateStrategicLinks(article, otherArticles, strategy, funnelStage);

            updates.push({
              id: article.id,
              internal_links: strategicLinks
            });

            // Track stats
            if (!results.byFunnelStage[funnelStage]) {
              results.byFunnelStage[funnelStage] = { count: 0, totalLinks: 0 };
            }
            results.byFunnelStage[funnelStage].count++;
            results.byFunnelStage[funnelStage].totalLinks += strategicLinks.length;
            results.totalArticles++;

          } catch (err: any) {
            results.errors.push(`${article.id}: ${err.message}`);
          }
        }
      }
      results.processed++;
    }

    console.log(`[Bulk Regenerate] Generated links for ${results.totalArticles} articles`);

    // Apply updates in batches if not dry run
    let updatesApplied = 0;
    if (!dryRun && updates.length > 0) {
      console.log(`[Bulk Regenerate] Applying ${updates.length} updates in batches of ${batchSize}...`);
      
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(update => 
          supabase
            .from('blog_articles')
            .update({ internal_links: update.internal_links })
            .eq('id', update.id)
        );

        const batchResults = await Promise.all(batchPromises);
        
        const batchErrors = batchResults.filter(r => r.error);
        if (batchErrors.length > 0) {
          console.error(`[Bulk Regenerate] Batch errors:`, batchErrors.length);
        }
        
        updatesApplied += batch.length - batchErrors.length;
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < updates.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`[Bulk Regenerate] ✅ Applied ${updatesApplied}/${updates.length} updates`);
    }

    // Calculate averages
    const summary = {
      ...results,
      byFunnelStage: Object.fromEntries(
        Object.entries(results.byFunnelStage).map(([stage, data]) => [
          stage,
          {
            count: data.count,
            avgLinks: data.count > 0 ? (data.totalLinks / data.count).toFixed(2) : 0
          }
        ])
      ),
      updatesApplied: dryRun ? 0 : updatesApplied,
      dryRun
    };

    console.log(`[Bulk Regenerate] Complete:`, JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify({ 
      success: true, 
      summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[Bulk Regenerate] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function generateStrategicLinks(
  article: any,
  otherArticles: any[],
  strategy: any,
  funnelStage: string
): any[] {
  const links: any[] = [];

  // Categorize available articles by funnel stage
  const tofuArticles = otherArticles.filter(a => a.funnel_stage === 'TOFU');
  const mofuArticles = otherArticles.filter(a => a.funnel_stage === 'MOFU');
  const bofuArticles = otherArticles.filter(a => a.funnel_stage === 'BOFU');

  if (funnelStage === 'TOFU') {
    // TOFU strategy: 1-2 MOFU (funnel progression), 1 sibling TOFU
    // NO direct links to BOFU (user isn't ready for conversion yet)
    
    // Add up to 2 MOFU links (funnel progression)
    for (let i = 0; i < Math.min(2, mofuArticles.length); i++) {
      const target = mofuArticles[i];
      links.push(createLink(target, 'funnel_progression', 9 - i));
    }

    // Add 1 sibling TOFU if we have room
    if (links.length < 3 && tofuArticles.length > 0) {
      links.push(createLink(tofuArticles[0], 'related_topic', 7));
    }

  } else if (funnelStage === 'MOFU') {
    // MOFU strategy: 1 TOFU (context), 1 BOFU (conversion), 1 sibling MOFU
    
    // Add 1 TOFU link (context)
    if (tofuArticles.length > 0) {
      links.push(createLink(tofuArticles[0], 'context', 8));
    }

    // Add 1 BOFU link (conversion - CRITICAL for funnel!)
    if (bofuArticles.length > 0) {
      links.push(createLink(bofuArticles[0], 'conversion', 9));
    }

    // Add 1 sibling MOFU if we have room
    if (links.length < 3 && mofuArticles.length > 0) {
      links.push(createLink(mofuArticles[0], 'related_topic', 7));
    }

  } else if (funnelStage === 'BOFU') {
    // BOFU strategy: 2 MOFU (evidence), 1 TOFU (foundation)
    
    // Add up to 2 MOFU links (evidence/comparison)
    for (let i = 0; i < Math.min(2, mofuArticles.length); i++) {
      const target = mofuArticles[i];
      links.push(createLink(target, 'evidence', 9 - i));
    }

    // Add 1 TOFU link (foundation)
    if (links.length < 3 && tofuArticles.length > 0) {
      links.push(createLink(tofuArticles[0], 'context', 7));
    }
  }

  // Enforce max 3 links
  return links.slice(0, strategy.maxWithinCluster);
}

function createLink(target: any, purpose: string, relevanceScore: number): any {
  return {
    text: target.headline.toLowerCase(),
    url: `/${target.language}/blog/${target.slug}`,
    title: target.headline,
    funnelStage: target.funnel_stage,
    purpose,
    relevanceScore
  };
}
