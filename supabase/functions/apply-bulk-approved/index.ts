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

    const { batchSize = 50 } = await req.json().catch(() => ({}));

    console.log(`Starting apply-bulk-approved with batch size ${batchSize}...`);

    // Get all approved replacements
    const { data: approvedReplacements, error: fetchError } = await supabase
      .from('dead_link_replacements')
      .select('*')
      .eq('status', 'approved')
      .order('confidence_score', { ascending: false })
      .limit(batchSize);

    if (fetchError) throw fetchError;

    if (!approvedReplacements || approvedReplacements.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No approved replacements to apply',
        applied: 0,
        articlesUpdated: 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Processing ${approvedReplacements.length} approved replacements`);

    let appliedCount = 0;
    let articlesUpdated = 0;
    const results: any[] = [];

    for (const replacement of approvedReplacements) {
      const oldUrl = replacement.original_url;
      const newUrl = replacement.replacement_url;

      if (!newUrl || oldUrl === newUrl) continue;

      console.log(`Applying replacement: ${oldUrl} -> ${newUrl}`);

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

      const affectedArticleIds: string[] = [];
      let replacementCount = 0;

      if (articles && articles.length > 0) {
        for (const article of articles) {
          try {
            // Create revision for rollback
            await supabase.from('article_revisions').insert({
              article_id: article.id,
              previous_content: article.detailed_content,
              previous_citations: article.external_citations,
              revision_type: 'bulk_replacement',
              change_reason: `Bulk approved replacement: ${oldUrl} → ${newUrl}`,
              replacement_id: replacement.id,
              can_rollback: true,
              rollback_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            });

            // Update content
            let updatedContent = article.detailed_content;
            const contentMatches = (updatedContent.match(new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
            if (contentMatches > 0) {
              updatedContent = updatedContent.split(oldUrl).join(newUrl);
              replacementCount += contentMatches;
            }

            // Update external_citations JSONB
            let updatedCitations = article.external_citations;
            if (Array.isArray(updatedCitations)) {
              updatedCitations = updatedCitations.map((c: any) => {
                if (c.url === oldUrl) {
                  replacementCount++;
                  return { ...c, url: newUrl, source: replacement.replacement_source || c.source };
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

            if (!updateError) {
              affectedArticleIds.push(article.id);
              articlesUpdated++;
            }
          } catch (err) {
            console.error(`Error processing article ${article.id}:`, err);
          }
        }
      }

      // Update citation_usage_tracking
      await supabase
        .from('citation_usage_tracking')
        .update({ 
          citation_url: newUrl, 
          citation_source: replacement.replacement_source,
          updated_at: new Date().toISOString() 
        })
        .eq('citation_url', oldUrl);

      // Update citation health if exists
      await supabase
        .from('external_citation_health')
        .update({ status: 'healthy', updated_at: new Date().toISOString() })
        .eq('url', oldUrl);

      // Mark replacement as applied
      await supabase
        .from('dead_link_replacements')
        .update({ 
          status: 'applied',
          applied_at: new Date().toISOString(),
          applied_to_articles: affectedArticleIds,
          replacement_count: replacementCount
        })
        .eq('id', replacement.id);

      appliedCount++;
      results.push({
        id: replacement.id,
        oldUrl,
        newUrl,
        articlesAffected: affectedArticleIds.length,
        replacementCount
      });
    }

    console.log(`Applied ${appliedCount} replacements, updated ${articlesUpdated} articles`);

    return new Response(JSON.stringify({
      success: true,
      applied: appliedCount,
      articlesUpdated,
      total: approvedReplacements.length,
      results
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('apply-bulk-approved error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
