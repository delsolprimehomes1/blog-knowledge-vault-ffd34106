import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClusterStats {
  cluster_id: string;
  theme: string;
  category: string;
  total_articles: number;
  english_count: number;
  has_english: boolean;
  languages: string[];
  priority: 'english_only' | 'non_english' | 'partial' | 'complete';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      action = 'status', 
      batchSize = 5,
      priorityFilter,
      specificClusterIds = []
    } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ACTION: Get current status of all clusters
    if (action === 'status') {
      // Get all published articles grouped by cluster
      const { data: articles, error: fetchError } = await supabase
        .from('blog_articles')
        .select('cluster_id, cluster_theme, category, language')
        .eq('status', 'published')
        .not('cluster_id', 'is', null);

      if (fetchError) {
        throw new Error(`Failed to fetch articles: ${fetchError.message}`);
      }

      // Aggregate by cluster
      const clusterMap = new Map<string, ClusterStats>();
      
      for (const article of articles || []) {
        if (!article.cluster_id) continue;
        
        const existing = clusterMap.get(article.cluster_id);
        if (existing) {
          existing.total_articles++;
          if (article.language === 'en') existing.english_count++;
          if (!existing.languages.includes(article.language)) {
            existing.languages.push(article.language);
          }
        } else {
          clusterMap.set(article.cluster_id, {
            cluster_id: article.cluster_id,
            theme: article.cluster_theme || 'Unknown',
            category: article.category || 'Unknown',
            total_articles: 1,
            english_count: article.language === 'en' ? 1 : 0,
            has_english: article.language === 'en',
            languages: [article.language],
            priority: 'complete'
          });
        }
      }

      // Calculate priority for each cluster
      const clusters: ClusterStats[] = [];
      for (const [_, cluster] of clusterMap) {
        cluster.has_english = cluster.english_count > 0;
        
        // Determine priority
        if (cluster.total_articles >= 60) {
          cluster.priority = 'complete';
        } else if (cluster.has_english && cluster.languages.length === 1) {
          cluster.priority = 'english_only'; // Easiest to complete
        } else if (!cluster.has_english) {
          cluster.priority = 'non_english'; // Need translation to English first
        } else {
          cluster.priority = 'partial'; // Has some translations
        }
        
        clusters.push(cluster);
      }

      // Group by priority
      const summary = {
        english_only: clusters.filter(c => c.priority === 'english_only'),
        non_english: clusters.filter(c => c.priority === 'non_english'),
        partial: clusters.filter(c => c.priority === 'partial'),
        complete: clusters.filter(c => c.priority === 'complete')
      };

      return new Response(
        JSON.stringify({ 
          success: true,
          summary: {
            english_only_count: summary.english_only.length,
            non_english_count: summary.non_english.length,
            partial_count: summary.partial.length,
            complete_count: summary.complete.length,
            total_clusters: clusters.length
          },
          clusters: {
            english_only: summary.english_only.slice(0, 50),
            non_english: summary.non_english.slice(0, 50),
            partial: summary.partial.slice(0, 50),
            complete: summary.complete.slice(0, 10)
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTION: Start batch processing
    if (action === 'start_batch') {
      // Get clusters to process based on priority
      let clustersToProcess: string[] = [];

      if (specificClusterIds && specificClusterIds.length > 0) {
        clustersToProcess = specificClusterIds;
      } else {
        // Get incomplete clusters
        const { data: articles } = await supabase
          .from('blog_articles')
          .select('cluster_id, language')
          .eq('status', 'published')
          .not('cluster_id', 'is', null);

        // Group by cluster
        const clusterCounts = new Map<string, { total: number; hasEnglish: boolean }>();
        for (const article of articles || []) {
          if (!article.cluster_id) continue;
          const existing = clusterCounts.get(article.cluster_id);
          if (existing) {
            existing.total++;
            if (article.language === 'en') existing.hasEnglish = true;
          } else {
            clusterCounts.set(article.cluster_id, {
              total: 1,
              hasEnglish: article.language === 'en'
            });
          }
        }

        // Filter based on priority
        for (const [clusterId, counts] of clusterCounts) {
          if (counts.total >= 60) continue; // Already complete

          if (priorityFilter === 'english_only' && counts.hasEnglish && counts.total < 10) {
            clustersToProcess.push(clusterId);
          } else if (priorityFilter === 'non_english' && !counts.hasEnglish) {
            clustersToProcess.push(clusterId);
          } else if (priorityFilter === 'partial' && counts.hasEnglish && counts.total >= 10 && counts.total < 60) {
            clustersToProcess.push(clusterId);
          } else if (!priorityFilter) {
            // Process English-only first, then non-English, then partial
            if (counts.hasEnglish && counts.total < 10) {
              clustersToProcess.push(clusterId);
            }
          }
        }
      }

      // Limit to batch size
      const batch = clustersToProcess.slice(0, batchSize);
      
      if (batch.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'No clusters need processing',
            processed: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[batch-complete-clusters] Processing ${batch.length} clusters`);

      // Process each cluster
      const results = [];
      for (const clusterId of batch) {
        try {
          console.log(`[batch-complete-clusters] Processing cluster: ${clusterId}`);
          
          const response = await fetch(`${supabaseUrl}/functions/v1/complete-incomplete-cluster`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ clusterId, dryRun: false })
          });

          const result = await response.json();
          results.push({
            clusterId,
            success: response.ok,
            result: response.ok ? result : null,
            error: !response.ok ? result.error : null
          });
        } catch (error: unknown) {
          console.error(`[batch-complete-clusters] Error processing ${clusterId}:`, error);
          results.push({
            clusterId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          batchSize: batch.length,
          results,
          remainingClusters: clustersToProcess.length - batch.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTION: Get dry run preview for specific clusters
    if (action === 'preview') {
      const previews = [];
      
      for (const clusterId of specificClusterIds.slice(0, 10)) {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/complete-incomplete-cluster`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ clusterId, dryRun: true })
          });

          const result = await response.json();
          previews.push({
            clusterId,
            ...result
          });
        } catch (error: unknown) {
          previews.push({
            clusterId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, previews }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: status, start_batch, or preview' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[batch-complete-clusters] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
