import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface BackfillResult {
  articleId: string;
  headline: string;
  language: string;
  markerCount: number;
  replacedCount: number;
  status: 'success' | 'partial' | 'failed';
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      dryRun = false,
      batchSize = 5,
      articleIds = [] // Optional: specific article IDs to process
    } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Citation Backfill] Starting - dryRun: ${dryRun}, batchSize: ${batchSize}`);

    // Fetch articles with [CITATION_NEEDED] markers
    let query = supabase
      .from('blog_articles')
      .select('id, headline, detailed_content, language, category')
      .ilike('detailed_content', '%[CITATION_NEEDED]%')
      .eq('status', 'published');

    if (articleIds.length > 0) {
      query = query.in('id', articleIds);
    }

    const { data: articles, error: fetchError } = await query.limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No articles with [CITATION_NEEDED] markers found',
          results: [],
          summary: { total: 0, success: 0, partial: 0, failed: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Citation Backfill] Found ${articles.length} articles with markers`);

    const results: BackfillResult[] = [];
    let successCount = 0;
    let partialCount = 0;
    let failedCount = 0;

    for (const article of articles) {
      const markerCount = (article.detailed_content.match(/\[CITATION_NEEDED\]/g) || []).length;
      console.log(`\n[Article] ${article.headline.substring(0, 50)}... (${markerCount} markers)`);

      if (dryRun) {
        results.push({
          articleId: article.id,
          headline: article.headline,
          language: article.language,
          markerCount,
          replacedCount: 0,
          status: 'success'
        });
        successCount++;
        continue;
      }

      try {
        // Call the existing replace-citation-markers function
        const response = await fetch(
          `${supabaseUrl}/functions/v1/replace-citation-markers`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              content: article.detailed_content,
              headline: article.headline,
              language: article.language,
              category: article.category,
              articleId: article.id
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        if (result.success && result.updatedContent) {
          // Update the article with replaced content
          const { error: updateError } = await supabase
            .from('blog_articles')
            .update({ 
              detailed_content: result.updatedContent,
              date_modified: new Date().toISOString()
            })
            .eq('id', article.id);

          if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`);
          }

          const replacedCount = result.replacedCount || 0;
          const status = replacedCount === markerCount ? 'success' : 'partial';
          
          results.push({
            articleId: article.id,
            headline: article.headline,
            language: article.language,
            markerCount,
            replacedCount,
            status
          });

          if (status === 'success') successCount++;
          else partialCount++;

          console.log(`  ✓ Replaced ${replacedCount}/${markerCount} markers`);
        } else {
          throw new Error(result.error || 'No updated content returned');
        }

        // Rate limiting between articles
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`  ✗ Error:`, error);
        results.push({
          articleId: article.id,
          headline: article.headline,
          language: article.language,
          markerCount,
          replacedCount: 0,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failedCount++;
      }
    }

    // Get remaining count
    const { count: remainingCount } = await supabase
      .from('blog_articles')
      .select('id', { count: 'exact', head: true })
      .ilike('detailed_content', '%[CITATION_NEEDED]%')
      .eq('status', 'published');

    console.log(`\n[Citation Backfill] Complete: ${successCount} success, ${partialCount} partial, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        results,
        summary: {
          total: articles.length,
          success: successCount,
          partial: partialCount,
          failed: failedCount
        },
        remaining: remainingCount || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Citation Backfill] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
