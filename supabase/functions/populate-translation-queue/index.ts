import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TARGET_LANGUAGES = ['de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];

// Priority tiers based on your existing categorization
const TIER_PRIORITIES: Record<string, number> = {
  tier_1: 100,  // Buying guides, Legal, BOFU
  tier_2: 50,   // Medium priority
  tier_3: 25    // Lower priority
};

const TIER_1_CATEGORIES = [
  'buying-process', 'legal', 'finance', 'golden-visa', 'tax', 'investment'
];

const TIER_2_CATEGORIES = [
  'property-types', 'locations', 'lifestyle', 'market-analysis'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      clusterIds = null, // Specific clusters to populate, or null for all
      tierFilter = null, // 'tier_1', 'tier_2', 'tier_3' or null for all
      limit = 100,       // Max clusters to process
      dryRun = false     // Preview without inserting
    } = await req.json().catch(() => ({}));

    console.log('Populating queue with params:', { clusterIds, tierFilter, limit, dryRun });

    // Get incomplete clusters
    let query = supabase
      .from('blog_articles')
      .select('cluster_id, cluster_theme, category, funnel_stage')
      .eq('status', 'published')
      .eq('language', 'en')
      .not('cluster_id', 'is', null);

    if (clusterIds && clusterIds.length > 0) {
      query = query.in('cluster_id', clusterIds);
    }

    const { data: englishArticles, error: articlesError } = await query;

    if (articlesError) {
      throw new Error(`Failed to fetch articles: ${articlesError.message}`);
    }

    // Group articles by cluster
    const clusterMap = new Map<string, any[]>();
    englishArticles?.forEach(article => {
      if (!clusterMap.has(article.cluster_id)) {
        clusterMap.set(article.cluster_id, []);
      }
      clusterMap.get(article.cluster_id)!.push(article);
    });

    console.log(`Found ${clusterMap.size} clusters with English articles`);

    // Calculate priority for each cluster
    const clustersWithPriority: { 
      clusterId: string; 
      articles: any[];
      theme: string;
      tier: string;
      priority: number;
    }[] = [];

    for (const [clusterId, articles] of clusterMap) {
      const category = articles[0]?.category || '';
      const funnelStage = articles[0]?.funnel_stage || '';
      
      let tier = 'tier_3';
      if (TIER_1_CATEGORIES.some(c => category.includes(c)) || funnelStage === 'BOFU') {
        tier = 'tier_1';
      } else if (TIER_2_CATEGORIES.some(c => category.includes(c)) || funnelStage === 'MOFU') {
        tier = 'tier_2';
      }

      if (tierFilter && tier !== tierFilter) {
        continue;
      }

      clustersWithPriority.push({
        clusterId,
        articles,
        theme: articles[0]?.cluster_theme || 'Unknown',
        tier,
        priority: TIER_PRIORITIES[tier]
      });
    }

    // Sort by priority and apply limit
    clustersWithPriority.sort((a, b) => b.priority - a.priority);
    const selectedClusters = clustersWithPriority.slice(0, limit);

    console.log(`Processing ${selectedClusters.length} clusters`);

    let totalJobsCreated = 0;
    let totalJobsSkipped = 0;
    const progressRecords: any[] = [];
    const queueRecords: any[] = [];

    for (const cluster of selectedClusters) {
      // Get existing translations for this cluster
      const { data: existingTranslations } = await supabase
        .from('blog_articles')
        .select('hreflang_group_id, language')
        .eq('cluster_id', cluster.clusterId)
        .eq('status', 'published')
        .neq('language', 'en');

      // Build a set of existing translations: "articleId-language"
      const existingSet = new Set<string>();
      existingTranslations?.forEach(t => {
        if (t.hreflang_group_id) {
          existingSet.add(`${t.hreflang_group_id}-${t.language}`);
        }
      });

      // For each English article in this cluster
      for (const article of cluster.articles) {
        // Get the English article ID (this will be used as hreflang_group_id)
        const { data: fullArticle } = await supabase
          .from('blog_articles')
          .select('id, hreflang_group_id')
          .eq('cluster_id', cluster.clusterId)
          .eq('language', 'en')
          .eq('headline', article.cluster_theme ? article.cluster_theme : article.headline)
          .limit(1)
          .single();

        const englishArticleId = fullArticle?.id;
        const groupId = fullArticle?.hreflang_group_id || englishArticleId;

        if (!englishArticleId) {
          console.log(`Could not find English article ID for cluster ${cluster.clusterId}`);
          continue;
        }

        // For each target language
        for (const lang of TARGET_LANGUAGES) {
          // Check if translation already exists
          if (existingSet.has(`${groupId}-${lang}`)) {
            totalJobsSkipped++;
            continue;
          }

          // Check if job already in queue
          const { data: existingJob } = await supabase
            .from('cluster_translation_queue')
            .select('id')
            .eq('english_article_id', englishArticleId)
            .eq('target_language', lang)
            .in('status', ['pending', 'processing'])
            .limit(1)
            .single();

          if (existingJob) {
            totalJobsSkipped++;
            continue;
          }

          // Add to queue
          queueRecords.push({
            cluster_id: cluster.clusterId,
            english_article_id: englishArticleId,
            target_language: lang,
            priority: cluster.priority,
            status: 'pending'
          });

          totalJobsCreated++;
        }
      }

      // Create or update progress record
      progressRecords.push({
        cluster_id: cluster.clusterId,
        cluster_theme: cluster.theme,
        total_articles_needed: cluster.articles.length * 10, // articles × languages
        english_articles: cluster.articles.length,
        translations_completed: existingTranslations?.length || 0,
        articles_completed: cluster.articles.length + (existingTranslations?.length || 0),
        status: 'queued',
        priority_score: cluster.priority,
        tier: cluster.tier
      });
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          summary: {
            clustersProcessed: selectedClusters.length,
            jobsToCreate: totalJobsCreated,
            jobsSkipped: totalJobsSkipped,
            estimatedDays: Math.ceil(totalJobsCreated / (120 * 24)) // at 120/hour
          },
          sampleProgress: progressRecords.slice(0, 5),
          sampleQueue: queueRecords.slice(0, 10)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert progress records (upsert to avoid duplicates)
    if (progressRecords.length > 0) {
      const { error: progressError } = await supabase
        .from('cluster_completion_progress')
        .upsert(progressRecords, { 
          onConflict: 'cluster_id',
          ignoreDuplicates: false 
        });

      if (progressError) {
        console.error('Error inserting progress records:', progressError);
      }
    }

    // Insert queue records in batches
    const batchSize = 100;
    for (let i = 0; i < queueRecords.length; i += batchSize) {
      const batch = queueRecords.slice(i, i + batchSize);
      const { error: queueError } = await supabase
        .from('cluster_translation_queue')
        .insert(batch);

      if (queueError) {
        console.error(`Error inserting queue batch ${i / batchSize + 1}:`, queueError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          clustersProcessed: selectedClusters.length,
          jobsCreated: totalJobsCreated,
          jobsSkipped: totalJobsSkipped,
          progressRecordsCreated: progressRecords.length,
          estimatedDaysToComplete: Math.ceil(totalJobsCreated / (120 * 24))
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Queue population error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
