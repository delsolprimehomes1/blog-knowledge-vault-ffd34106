import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALL_LANGUAGES = ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];
const MAX_QA_PER_LANGUAGE = 24;

interface ClusterLanguageStatus {
  language: string;
  count: number;
  missing: number;
  status: 'complete' | 'partial' | 'missing';
}

interface ClusterStatus {
  cluster_id: string;
  cluster_theme: string | null;
  total_qa_pages: number;
  expected_total: number; // 24 * 10 = 240
  languages: ClusterLanguageStatus[];
  incomplete_languages: string[];
  completeness_percent: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clusterId, action, targetLanguages, dryRun } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Action: analyze - Get cluster completeness status
    if (action === 'analyze' || action === 'analyze-all') {
      console.log(`[Backfill] Analyzing ${clusterId ? `cluster ${clusterId}` : 'all clusters'}...`);
      
      // Get all clusters with Q&A pages
      let query = supabase
        .from('qa_pages')
        .select('cluster_id, language')
        .not('cluster_id', 'is', null);
      
      if (clusterId) {
        query = query.eq('cluster_id', clusterId);
      }
      
      const { data: qaPages, error: qaError } = await query;
      if (qaError) throw qaError;

      // Group by cluster and language
      const clusterMap = new Map<string, Map<string, number>>();
      const clusterThemes = new Map<string, string>();
      
      for (const page of qaPages || []) {
        if (!page.cluster_id) continue;
        
        if (!clusterMap.has(page.cluster_id)) {
          clusterMap.set(page.cluster_id, new Map());
        }
        
        const langMap = clusterMap.get(page.cluster_id)!;
        langMap.set(page.language, (langMap.get(page.language) || 0) + 1);
      }

      // Get cluster themes
      const clusterIds = Array.from(clusterMap.keys());
      if (clusterIds.length > 0) {
        const { data: articles } = await supabase
          .from('blog_articles')
          .select('cluster_id, cluster_theme')
          .in('cluster_id', clusterIds)
          .not('cluster_theme', 'is', null)
          .limit(1000);
        
        for (const article of articles || []) {
          if (article.cluster_id && article.cluster_theme) {
            clusterThemes.set(article.cluster_id, article.cluster_theme);
          }
        }
      }

      // Build cluster status array
      const clusterStatuses: ClusterStatus[] = [];
      
      for (const [cId, langMap] of clusterMap) {
        const languages: ClusterLanguageStatus[] = ALL_LANGUAGES.map(lang => {
          const count = langMap.get(lang) || 0;
          const missing = Math.max(0, MAX_QA_PER_LANGUAGE - count);
          return {
            language: lang,
            count,
            missing,
            status: count >= MAX_QA_PER_LANGUAGE ? 'complete' : (count > 0 ? 'partial' : 'missing'),
          };
        });
        
        const totalQaPages = Array.from(langMap.values()).reduce((a, b) => a + b, 0);
        const expectedTotal = MAX_QA_PER_LANGUAGE * ALL_LANGUAGES.length;
        const incompleteLanguages = languages.filter(l => l.status !== 'complete').map(l => l.language);
        
        clusterStatuses.push({
          cluster_id: cId,
          cluster_theme: clusterThemes.get(cId) || null,
          total_qa_pages: totalQaPages,
          expected_total: expectedTotal,
          languages,
          incomplete_languages: incompleteLanguages,
          completeness_percent: Math.round((totalQaPages / expectedTotal) * 100),
        });
      }

      // Sort by completeness (least complete first)
      clusterStatuses.sort((a, b) => a.completeness_percent - b.completeness_percent);

      const incompleteCount = clusterStatuses.filter(c => c.completeness_percent < 100).length;
      const totalMissingQAs = clusterStatuses.reduce((sum, c) => sum + (c.expected_total - c.total_qa_pages), 0);

      return new Response(JSON.stringify({
        success: true,
        clusters: clusterStatuses,
        summary: {
          total_clusters: clusterStatuses.length,
          incomplete_clusters: incompleteCount,
          complete_clusters: clusterStatuses.length - incompleteCount,
          total_missing_qa_pages: totalMissingQAs,
          languages_analyzed: ALL_LANGUAGES,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: backfill - Generate missing Q&As for a cluster
    if (action === 'backfill') {
      if (!clusterId) {
        throw new Error('clusterId is required for backfill action');
      }

      console.log(`[Backfill] Starting backfill for cluster ${clusterId}...`);
      
      // Get current Q&A count per language for this cluster
      const { data: existingQAs } = await supabase
        .from('qa_pages')
        .select('language, source_article_id')
        .eq('cluster_id', clusterId);

      const languageCounts = new Map<string, number>();
      for (const qa of existingQAs || []) {
        languageCounts.set(qa.language, (languageCounts.get(qa.language) || 0) + 1);
      }

      // Determine which languages need backfill
      const languagesToBackfill = (targetLanguages || ALL_LANGUAGES).filter((lang: string) => {
        const count = languageCounts.get(lang) || 0;
        return count < MAX_QA_PER_LANGUAGE;
      });

      if (languagesToBackfill.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Cluster is already complete',
          cluster_id: clusterId,
          languages_checked: targetLanguages || ALL_LANGUAGES,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[Backfill] Languages needing backfill: ${languagesToBackfill.join(', ')}`);

      // Get articles for this cluster (one per language that needs backfill)
      const articlesToProcess: { id: string; language: string; headline: string }[] = [];
      
      for (const lang of languagesToBackfill) {
        const neededQAs = MAX_QA_PER_LANGUAGE - (languageCounts.get(lang) || 0);
        
        // Get articles in this language for this cluster
        const { data: articles } = await supabase
          .from('blog_articles')
          .select('id, language, headline')
          .eq('cluster_id', clusterId)
          .eq('language', lang)
          .eq('status', 'published')
          .limit(6); // Max 6 articles per cluster per language
        
        if (articles && articles.length > 0) {
          // Add all articles - the generate function will determine which need Q&As
          for (const article of articles) {
            articlesToProcess.push(article);
          }
        } else {
          console.log(`[Backfill] No published articles found for language ${lang} in cluster ${clusterId}`);
        }
      }

      if (articlesToProcess.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No articles found to generate Q&As for',
          cluster_id: clusterId,
          languages_checked: languagesToBackfill,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      if (dryRun) {
        const estimatedQAs = articlesToProcess.length * 4; // 4 Q&A types per article
        return new Response(JSON.stringify({
          success: true,
          dry_run: true,
          cluster_id: clusterId,
          articles_to_process: articlesToProcess.length,
          languages_to_backfill: languagesToBackfill,
          estimated_qa_pages: estimatedQAs,
          articles: articlesToProcess.map(a => ({ id: a.id, language: a.language, headline: a.headline })),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create a job to track progress
      const { data: job, error: jobError } = await supabase
        .from('qa_generation_jobs')
        .insert({
          mode: 'bulk',
          status: 'pending',
          article_ids: articlesToProcess.map(a => a.id),
          languages: languagesToBackfill,
          total_articles: articlesToProcess.length,
          processed_articles: 0,
          generated_faq_pages: 0,
        })
        .select()
        .single();

      if (jobError) {
        console.error('[Backfill] Failed to create job:', jobError);
        throw jobError;
      }

      console.log(`[Backfill] Created job ${job.id} for ${articlesToProcess.length} articles`);

      // Invoke generate-qa-pages with completeMissing mode
      const { error: invokeError } = await supabase.functions.invoke('generate-qa-pages', {
        body: {
          jobId: job.id,
          articleIds: articlesToProcess.map(a => a.id),
          languages: languagesToBackfill,
          completeMissing: true,
          clusterId,
        },
      });

      if (invokeError) {
        console.error('[Backfill] Failed to invoke generate-qa-pages:', invokeError);
        // Don't throw - job was created and can be resumed
      }

      return new Response(JSON.stringify({
        success: true,
        job_id: job.id,
        cluster_id: clusterId,
        articles_queued: articlesToProcess.length,
        languages_to_backfill: languagesToBackfill,
        message: 'Backfill job started. Check job status for progress.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: backfill-priority - Quick backfill for specific clusters
    if (action === 'backfill-priority') {
      const priorityClusterIds = ['862c73fe-c10e-4c71-a4dd-a2af65ead62d', 'b2999c87-c9ef-4c9a-a9a1-d4aa86d1eb1e'];
      const targetClusters = clusterId ? [clusterId] : priorityClusterIds;
      
      const results = [];
      
      for (const cId of targetClusters) {
        console.log(`[Backfill] Processing priority cluster ${cId}...`);
        
        // Get current status
        const { data: existingQAs } = await supabase
          .from('qa_pages')
          .select('language')
          .eq('cluster_id', cId);

        const languageCounts = new Map<string, number>();
        for (const qa of existingQAs || []) {
          languageCounts.set(qa.language, (languageCounts.get(qa.language) || 0) + 1);
        }

        const missingLanguages = ALL_LANGUAGES.filter(lang => 
          (languageCounts.get(lang) || 0) < MAX_QA_PER_LANGUAGE
        );

        results.push({
          cluster_id: cId,
          existing_qa_count: existingQAs?.length || 0,
          missing_languages: missingLanguages,
          language_counts: Object.fromEntries(languageCounts),
        });
      }

      return new Response(JSON.stringify({
        success: true,
        priority_clusters: results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}. Valid actions: analyze, analyze-all, backfill, backfill-priority`);

  } catch (error) {
    console.error('[Backfill] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
