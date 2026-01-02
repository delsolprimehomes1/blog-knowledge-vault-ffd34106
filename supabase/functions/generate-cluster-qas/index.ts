import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Orchestrator function - generates ALL Q&As for an entire cluster
 * Uses background processing to avoid HTTP timeout issues
 * 
 * For a cluster with 6 English articles:
 * - Calls generate-article-qas for each article
 * - Each call generates 40 Q&As (4 types × 10 languages)
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

    // Create a job record for tracking progress
    const { data: job, error: jobError } = await supabase
      .from('qa_generation_jobs')
      .insert({
        cluster_id: clusterId,
        status: 'running',
        total_articles: articlesToProcess.length,
        articles_completed: 0,
        total_qas_created: 0,
        total_qas_failed: 0,
        current_article_index: 0,
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

    console.log(`[Orchestrator] Created job ${job.id}, returning immediately`);

    // Return immediately with job ID - process in background
    const response = new Response(JSON.stringify({
      success: true,
      jobId: job.id,
      clusterId,
      status: 'started',
      totalArticles: articlesToProcess.length,
      message: 'Q&A generation started in background. Poll job status for updates.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    // Process articles in background using EdgeRuntime.waitUntil
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil((async () => {
      console.log(`[Orchestrator Background] Starting background processing for job ${job.id}`);
      
      const results = {
        totalArticles: articlesToProcess.length,
        completedArticles: 0,
        totalQAsCreated: 0,
        totalQAsFailed: 0,
        articleResults: [] as any[],
      };

      try {
        // Process each article sequentially
        for (let i = 0; i < articlesToProcess.length; i++) {
          const article = articlesToProcess[i];
          console.log(`[Orchestrator Background] Processing article ${i + 1}/${articlesToProcess.length}: ${article.headline}`);

          // Update job progress
          await supabase
            .from('qa_generation_jobs')
            .update({
              current_article_index: i,
              current_article_headline: article.headline,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);

          try {
            // Call generate-article-qas edge function
            const response = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-article-qas`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  englishArticleId: article.id,
                  dryRun,
                }),
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[Orchestrator Background] Failed for ${article.headline}:`, errorText);
              results.articleResults.push({
                articleId: article.id,
                headline: article.headline,
                success: false,
                error: errorText,
              });
              results.totalQAsFailed += 40; // Assume all 40 Q&As failed
              continue;
            }

            const result = await response.json();
            
            results.completedArticles++;
            results.totalQAsCreated += result.created || 0;
            results.totalQAsFailed += result.failed || 0;
            
            results.articleResults.push({
              articleId: article.id,
              headline: article.headline,
              success: true,
              created: result.created,
              failed: result.failed,
              hreflangGroups: result.hreflangGroups,
            });

            console.log(`[Orchestrator Background] ✅ Completed ${article.headline}: ${result.created} Q&As created`);

            // Update job with progress
            await supabase
              .from('qa_generation_jobs')
              .update({
                articles_completed: results.completedArticles,
                total_qas_created: results.totalQAsCreated,
                total_qas_failed: results.totalQAsFailed,
                article_results: results.articleResults,
                updated_at: new Date().toISOString(),
              })
              .eq('id', job.id);

            // Delay between articles to avoid rate limits (5 seconds)
            if (i < articlesToProcess.length - 1) {
              console.log(`[Orchestrator Background] Waiting 5 seconds before next article...`);
              await new Promise(r => setTimeout(r, 5000));
            }

          } catch (error) {
            console.error(`[Orchestrator Background] Error processing ${article.headline}:`, error);
            results.articleResults.push({
              articleId: article.id,
              headline: article.headline,
              success: false,
              error: String(error),
            });
          }
        }

        // Mark job as completed
        const expectedTotal = articlesToProcess.length * 40;
        await supabase
          .from('qa_generation_jobs')
          .update({
            status: 'completed',
            articles_completed: results.completedArticles,
            total_qas_created: results.totalQAsCreated,
            total_qas_failed: results.totalQAsFailed,
            article_results: results.articleResults,
            completed_at: new Date().toISOString(),
            completion_percent: Math.round((results.totalQAsCreated / expectedTotal) * 100),
          })
          .eq('id', job.id);

        console.log(`[Orchestrator Background] Job ${job.id} completed!`);
        console.log(`[Orchestrator Background] Articles: ${results.completedArticles}/${results.totalArticles}`);
        console.log(`[Orchestrator Background] Q&As: ${results.totalQAsCreated}/${expectedTotal}`);

      } catch (error) {
        console.error(`[Orchestrator Background] Fatal error:`, error);
        
        // Mark job as failed
        await supabase
          .from('qa_generation_jobs')
          .update({
            status: 'failed',
            error: String(error),
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      }
    })());

    return response;

  } catch (error) {
    console.error('[Orchestrator] Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
