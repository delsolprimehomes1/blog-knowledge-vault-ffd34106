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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { stalledThresholdMinutes = 10, autoResume = true, dryRun = false } = body;

    console.log(`[AutoResume] Checking for stalled jobs (threshold: ${stalledThresholdMinutes} mins, autoResume: ${autoResume}, dryRun: ${dryRun})`);

    // Find jobs that are "running" but haven't been updated in stalledThresholdMinutes
    const thresholdTime = new Date(Date.now() - stalledThresholdMinutes * 60 * 1000).toISOString();
    
    const { data: stalledJobs, error: fetchError } = await supabase
      .from('qa_generation_jobs')
      .select('id, cluster_id, article_ids, languages, resume_from_article_index, resume_from_language, generated_faq_pages, total_faq_pages, status, updated_at, current_article_headline, current_article_index, articles_completed')
      .eq('status', 'running')
      .lt('updated_at', thresholdTime);

    if (fetchError) {
      console.error('[AutoResume] Error fetching stalled jobs:', fetchError);
      throw fetchError;
    }

    // Also check for jobs that were marked as stalled but never resumed
    const { data: previouslyStalledJobs, error: stalledFetchError } = await supabase
      .from('qa_generation_jobs')
      .select('id, cluster_id, article_ids, languages, resume_from_article_index, resume_from_language, generated_faq_pages, total_faq_pages, status, updated_at, current_article_headline, current_article_index, articles_completed')
      .eq('status', 'stalled')
      .lt('updated_at', thresholdTime);

    if (stalledFetchError) {
      console.error('[AutoResume] Error fetching previously stalled jobs:', stalledFetchError);
    }

    const allStalledJobs = [...(stalledJobs || []), ...(previouslyStalledJobs || [])];

    if (allStalledJobs.length === 0) {
      console.log('[AutoResume] No stalled jobs found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No stalled jobs found',
        stalledJobsFound: 0,
        resumedJobs: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[AutoResume] Found ${allStalledJobs.length} stalled job(s)`);

    const results = [];

    for (const job of allStalledJobs) {
      console.log(`[AutoResume] Processing stalled job ${job.id}:`);
      console.log(`  - Cluster: ${job.cluster_id}`);
      console.log(`  - Progress: ${job.generated_faq_pages}/${job.total_faq_pages}`);
      console.log(`  - Last update: ${job.updated_at}`);
      console.log(`  - Resume from: article ${job.resume_from_article_index}, lang ${job.resume_from_language}`);

      // Mark as stalled if it was still "running"
      if (job.status === 'running') {
        await supabase
          .from('qa_generation_jobs')
          .update({
            status: 'stalled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        
        console.log(`[AutoResume] Marked job ${job.id} as stalled`);
      }

      // Log the error
      await supabase
        .from('qa_generation_errors')
        .insert({
          job_id: job.id,
          cluster_id: job.cluster_id,
          error_type: 'timeout',
          error_message: `Job stalled after ${stalledThresholdMinutes}+ minutes of inactivity. Last seen: ${job.current_article_headline || 'unknown'}`,
        });

      if (autoResume && !dryRun) {
        try {
          console.log(`[AutoResume] Auto-resuming job ${job.id}...`);
          
          // Get article_ids and current index from job
          const articleIds = job.article_ids || [];
          const resumeFromIndex = job.resume_from_article_index ?? job.current_article_index ?? 0;
          const nextArticleId = articleIds[resumeFromIndex];
          
          if (!nextArticleId) {
            console.error(`[AutoResume] No article at index ${resumeFromIndex} for job ${job.id}`);
            results.push({
              jobId: job.id,
              clusterId: job.cluster_id,
              status: 'resume_failed',
              error: `No article at index ${resumeFromIndex}`,
            });
            continue;
          }
          
          // Call the correct function: generate-article-qas (not generate-qa-pages)
          const { data: resumeData, error: resumeError } = await supabase.functions.invoke('generate-article-qas', {
            body: { 
              englishArticleId: nextArticleId,
              jobId: job.id,
              articleIndex: resumeFromIndex,
            },
          });

          if (resumeError) {
            console.error(`[AutoResume] Failed to resume job ${job.id}:`, resumeError);
            results.push({
              jobId: job.id,
              clusterId: job.cluster_id,
              status: 'resume_failed',
              error: resumeError.message,
            });
          } else {
            console.log(`[AutoResume] Successfully resumed job ${job.id} at article index ${resumeFromIndex}`);
            results.push({
              jobId: job.id,
              clusterId: job.cluster_id,
              status: 'resumed',
              resumedFromArticle: resumeFromIndex,
              articleId: nextArticleId,
            });
          }
        } catch (err) {
          console.error(`[AutoResume] Exception resuming job ${job.id}:`, err);
          results.push({
            jobId: job.id,
            clusterId: job.cluster_id,
            status: 'resume_exception',
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      } else {
        results.push({
          jobId: job.id,
          clusterId: job.cluster_id,
          status: dryRun ? 'dry_run' : 'stalled_marked',
          progress: `${job.generated_faq_pages}/${job.total_faq_pages}`,
        });
      }
    }

    const resumedCount = results.filter(r => r.status === 'resumed').length;
    const failedCount = results.filter(r => r.status === 'resume_failed' || r.status === 'resume_exception').length;

    console.log(`[AutoResume] Complete. Resumed: ${resumedCount}, Failed: ${failedCount}, Total stalled: ${allStalledJobs.length}`);

    return new Response(JSON.stringify({
      success: true,
      stalledJobsFound: allStalledJobs.length,
      resumedJobs: resumedCount,
      failedResumes: failedCount,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[AutoResume] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
