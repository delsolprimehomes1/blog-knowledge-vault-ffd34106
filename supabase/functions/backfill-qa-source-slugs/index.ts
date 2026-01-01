import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { dryRun = true, clusterId } = await req.json().catch(() => ({}));

    console.log(`[backfill-qa-source-slugs] Starting with dryRun=${dryRun}, clusterId=${clusterId || 'all'}`);

    // Find Q&A pages with missing source_article_slug but valid source_article_id
    let query = supabase
      .from("qa_pages")
      .select(`
        id,
        slug,
        language,
        source_article_id,
        source_article_slug
      `)
      .is("source_article_slug", null)
      .not("source_article_id", "is", null);

    if (clusterId) {
      query = query.eq("cluster_id", clusterId);
    }

    const { data: qaPagesNeedingFix, error: fetchError } = await query;

    if (fetchError) {
      console.error("[backfill-qa-source-slugs] Error fetching Q&A pages:", fetchError);
      throw fetchError;
    }

    console.log(`[backfill-qa-source-slugs] Found ${qaPagesNeedingFix?.length || 0} Q&A pages needing fix`);

    if (!qaPagesNeedingFix || qaPagesNeedingFix.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No Q&A pages need fixing",
          fixed: 0,
          dryRun,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all unique source_article_ids
    const sourceArticleIds = [...new Set(qaPagesNeedingFix.map(q => q.source_article_id))];

    // Fetch the corresponding blog articles
    const { data: blogArticles, error: blogError } = await supabase
      .from("blog_articles")
      .select("id, slug, language")
      .in("id", sourceArticleIds);

    if (blogError) {
      console.error("[backfill-qa-source-slugs] Error fetching blog articles:", blogError);
      throw blogError;
    }

    // Create a map of article ID to slug
    const articleSlugMap = new Map(blogArticles?.map(a => [a.id, a.slug]) || []);

    // Prepare updates
    const updates = qaPagesNeedingFix
      .filter(qa => articleSlugMap.has(qa.source_article_id))
      .map(qa => ({
        id: qa.id,
        qaSlug: qa.slug,
        language: qa.language,
        source_article_id: qa.source_article_id,
        source_article_slug: articleSlugMap.get(qa.source_article_id),
      }));

    console.log(`[backfill-qa-source-slugs] Prepared ${updates.length} updates`);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          message: `Would fix ${updates.length} Q&A pages`,
          total: qaPagesNeedingFix.length,
          fixable: updates.length,
          preview: updates.slice(0, 10),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply updates in batches
    let fixed = 0;
    let errors = 0;
    const batchSize = 50;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const update of batch) {
        const { error: updateError } = await supabase
          .from("qa_pages")
          .update({ source_article_slug: update.source_article_slug })
          .eq("id", update.id);

        if (updateError) {
          console.error(`[backfill-qa-source-slugs] Error updating ${update.id}:`, updateError);
          errors++;
        } else {
          fixed++;
        }
      }

      console.log(`[backfill-qa-source-slugs] Progress: ${fixed + errors}/${updates.length}`);
    }

    console.log(`[backfill-qa-source-slugs] Completed: fixed=${fixed}, errors=${errors}`);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun: false,
        message: `Fixed ${fixed} Q&A pages`,
        fixed,
        errors,
        total: updates.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[backfill-qa-source-slugs] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
