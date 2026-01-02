import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Orchestrator function - generates ALL Q&As for an entire cluster
 * Uses SELF-CONTINUATION pattern to avoid HTTP timeout issues:
 * - Creates job, stores article list
 * - Fires first article (fire-and-forget)
 * - Each article completion triggers the next via generate-article-qas
 * 
 * For a cluster with 6 English articles:
 * - Each article generates 40 Q&As (4 types × 10 languages)
 * - Total: 6 × 40 = 240 Q&As per cluster
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clusterId, dryRun = false, singleArticleId } = await req.json();
    
    if (!clusterId) {
      return new Response(JSON.stringify({ error: 'clusterId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`[Orchestrator] Starting Q&A generation for cluster: ${clusterId}`);

    // Get all English articles in the cluster
    const { data: englishArticles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, headline, slug')
      .eq('cluster_id', clusterId)
      .eq('language', 'en')
      .eq('status', 'published')
      .order('created_at', { ascending: true });

    if (articlesError || !englishArticles || englishArticles.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No English articles found in cluster',
        clusterId 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Orchestrator] Found ${englishArticles.length} English articles`);

    // If single article mode, filter to just that article
    const articlesToProcess = singleArticleId 
      ? englishArticles.filter(a => a.id === singleArticleId)
      : englishArticles;

    if (articlesToProcess.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Article not found in cluster',
        clusterId,
        singleArticleId 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a job record for tracking progress with article IDs for self-continuation
    const { data: job, error: jobError } = await supabase
      .from('qa_generation_jobs')
      .insert({
        cluster_id: clusterId,
        status: 'running',
        mode: 'background',
        total_articles: articlesToProcess.length,
        articles_completed: 0,
        total_qas_created: 0,
        total_qas_failed: 0,
        current_article_index: 0,
        current_article_headline: articlesToProcess[0].headline,
        article_ids: articlesToProcess.map(a => a.id), // Store IDs for continuation
        article_results: [],
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('[Orchestrator] Failed to create job:', jobError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create tracking job',
        details: jobError?.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Orchestrator] Created job ${job.id}, firing first article...`);

    // Fire-and-forget: Start first article processing
    // The article handler will trigger subsequent articles
    const firstArticle = articlesToProcess[0];
    
    fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-article-qas`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          englishArticleId: firstArticle.id,
          jobId: job.id, // Pass job ID for self-continuation
          articleIndex: 0,
          dryRun,
        }),
      }
    ).catch(err => {
      console.error('[Orchestrator] Fire-and-forget error (ignored):', err);
    });

    console.log(`[Orchestrator] Fired article 1/${articlesToProcess.length}: ${firstArticle.headline}`);

    // Return immediately with job ID
    return new Response(JSON.stringify({
      success: true,
      jobId: job.id,
      clusterId,
      status: 'started',
      totalArticles: articlesToProcess.length,
      message: 'Q&A generation started. Articles will self-chain for reliable processing.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Orchestrator] Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
