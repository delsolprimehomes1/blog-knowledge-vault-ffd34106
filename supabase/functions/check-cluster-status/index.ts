import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    
    if (!jobId) {
      throw new Error('jobId is required');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log(`Checking status for job: ${jobId}`);

    const { data: job, error } = await supabase
      .from('cluster_generations')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching job:', error);
      throw error;
    }

    if (!job) {
      // Job doesn't exist - return not_found status so frontend can stop polling
      return new Response(
        JSON.stringify({
          success: true,
          status: 'not_found',
          error: 'Job not found or was deleted'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Job ${jobId} status: ${job.status}`);

    // Count existing articles for progress tracking
    const { data: existingArticles } = await supabase
      .from('blog_articles')
      .select('id')
      .eq('cluster_id', jobId);
    
    const generatedCount = existingArticles?.length || 0;
    const totalTarget = job.total_articles || 6;

    // Fetch full article objects if completed
    let articleObjects = null;
    if (job.status === 'completed' && job.articles && job.articles.length > 0) {
      const { data: fullArticles, error: articlesError } = await supabase
        .from('blog_articles')
        .select('*')
        .in('id', job.articles)
        .order('cluster_number', { ascending: true });
      
      if (!articlesError && fullArticles) {
        articleObjects = fullArticles;
        console.log(`Fetched ${fullArticles.length} full article objects`);
      } else {
        console.error('Failed to fetch full articles:', articlesError);
        // Fallback to just IDs
        articleObjects = job.articles;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: job.status,
        progress: {
          ...job.progress,
          updated_at: job.updated_at,
          generated_articles: generatedCount,
          total_articles: totalTarget
        },
        articles: articleObjects,
        error: job.error
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-cluster-status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
