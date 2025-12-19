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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting fix-redirected-citations...');

    // Get all redirected citations with valid redirect URLs
    const { data: redirectedCitations, error: fetchError } = await supabase
      .from('external_citation_health')
      .select('id, url, redirect_url, source_name')
      .eq('status', 'redirected')
      .not('redirect_url', 'is', null);

    if (fetchError) throw fetchError;

    if (!redirectedCitations || redirectedCitations.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No redirected citations to fix',
        fixed: 0 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Found ${redirectedCitations.length} redirected citations to fix`);

    let fixedCount = 0;
    let articlesUpdated = 0;
    const results: any[] = [];

    for (const citation of redirectedCitations) {
      const oldUrl = citation.url;
      const newUrl = citation.redirect_url;

      if (!newUrl || oldUrl === newUrl) continue;

      console.log(`Processing: ${oldUrl} -> ${newUrl}`);

      // Find all published articles containing this URL
      const { data: articles, error: articlesError } = await supabase
        .from('blog_articles')
        .select('id, headline, detailed_content, external_citations')
        .eq('status', 'published')
        .or(`detailed_content.ilike.%${oldUrl}%,external_citations::text.ilike.%${oldUrl}%`);

      if (articlesError) {
        console.error(`Error finding articles for ${oldUrl}:`, articlesError);
        continue;
      }

      if (!articles || articles.length === 0) {
        // No articles use this citation, just mark it as healthy
        await supabase
          .from('external_citation_health')
          .update({ 
            status: 'healthy', 
            url: newUrl,
            updated_at: new Date().toISOString() 
          })
          .eq('id', citation.id);
        fixedCount++;
        continue;
      }

      // Update each article
      for (const article of articles) {
        try {
          // Create revision for rollback
          await supabase.from('article_revisions').insert({
            article_id: article.id,
            previous_content: article.detailed_content,
            previous_citations: article.external_citations,
            revision_type: 'redirect_fix',
            change_reason: `Auto-fixed redirect: ${oldUrl} → ${newUrl}`,
            can_rollback: true,
            rollback_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });

          // Update content - replace old URL with new URL
          let updatedContent = article.detailed_content;
          if (updatedContent.includes(oldUrl)) {
            updatedContent = updatedContent.split(oldUrl).join(newUrl);
          }

          // Update external_citations JSONB
          let updatedCitations = article.external_citations;
          if (Array.isArray(updatedCitations)) {
            updatedCitations = updatedCitations.map((c: any) => {
              if (c.url === oldUrl) {
                return { ...c, url: newUrl };
              }
              return c;
            });
          }

          // Save updated article
          const { error: updateError } = await supabase
            .from('blog_articles')
            .update({
              detailed_content: updatedContent,
              external_citations: updatedCitations,
              updated_at: new Date().toISOString()
            })
            .eq('id', article.id);

          if (updateError) {
            console.error(`Error updating article ${article.id}:`, updateError);
          } else {
            articlesUpdated++;
          }
        } catch (err) {
          console.error(`Error processing article ${article.id}:`, err);
        }
      }

      // Update citation_usage_tracking
      await supabase
        .from('citation_usage_tracking')
        .update({ citation_url: newUrl, updated_at: new Date().toISOString() })
        .eq('citation_url', oldUrl);

      // Mark citation health record as healthy with new URL
      await supabase
        .from('external_citation_health')
        .update({ 
          status: 'healthy',
          url: newUrl,
          redirect_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', citation.id);

      fixedCount++;
      results.push({
        oldUrl,
        newUrl,
        articlesAffected: articles.length
      });
    }

    console.log(`Fixed ${fixedCount} redirected citations, updated ${articlesUpdated} articles`);

    return new Response(JSON.stringify({
      success: true,
      fixed: fixedCount,
      articlesUpdated,
      total: redirectedCitations.length,
      results
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('fix-redirected-citations error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
