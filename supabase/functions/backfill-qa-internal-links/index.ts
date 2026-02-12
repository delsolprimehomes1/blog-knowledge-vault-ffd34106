import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchSize = 50, dryRun = false, limit = 0, offset = 0 } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[QA Backfill] Starting with batchSize=${batchSize}, dryRun=${dryRun}, limit=${limit}, offset=${offset}`);

    // 1. Fetch QA pages WITHOUT internal_links (only unprocessed ones)
    let allQAPages: any[] = [];
    let from = 0;
    const pageSize = 1000;
    const fetchLimit = limit > 0 ? limit : 99999;
    while (allQAPages.length < fetchLimit) {
      const remaining = fetchLimit - allQAPages.length;
      const thisPageSize = Math.min(pageSize, remaining);
      const { data: page, error } = await supabase
        .from('qa_pages')
        .select('id, slug, language, source_article_id, cluster_id')
        .eq('status', 'published')
        .is('internal_links', null)
        .range(from, from + thisPageSize - 1);
      if (error) throw error;
      if (!page || page.length === 0) break;
      allQAPages = allQAPages.concat(page);
      if (page.length < thisPageSize) break;
      from += thisPageSize;
    }

    console.log(`[QA Backfill] Found ${allQAPages.length} QA pages without internal_links`);

    // 2. Fetch all published blog articles for link targets (paginated)
    let allBlogArticles: any[] = [];
    from = 0;
    while (true) {
      const { data: page, error } = await supabase
        .from('blog_articles')
        .select('id, headline, slug, funnel_stage, language, cluster_id')
        .eq('status', 'published')
        .not('cluster_id', 'is', null)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!page || page.length === 0) break;
      allBlogArticles = allBlogArticles.concat(page);
      if (page.length < pageSize) break;
      from += pageSize;
    }

    console.log(`[QA Backfill] Loaded ${allBlogArticles.length} blog articles as link targets`);

    // 3. Index blog articles by cluster+language and by id
    const blogByClusterLang: Record<string, any[]> = {};
    const blogById: Record<string, any> = {};
    for (const article of allBlogArticles) {
      const key = `${article.cluster_id}:${article.language}`;
      if (!blogByClusterLang[key]) blogByClusterLang[key] = [];
      blogByClusterLang[key].push(article);
      blogById[article.id] = article;
    }

    // 4. Generate links for each QA page
    const updates: { id: string; internal_links: any[] }[] = [];
    const stats = { total: 0, withLinks: 0, skipped: 0, byLanguage: {} as Record<string, number>, errors: [] as string[] };

    for (const qa of allQAPages) {
      try {
        stats.total++;
        const links: any[] = [];

        // Link 1: Back to source blog article (always)
        const sourceArticle = qa.source_article_id ? blogById[qa.source_article_id] : null;
        if (sourceArticle) {
          links.push({
            text: sourceArticle.headline.toLowerCase(),
            url: `/${sourceArticle.language}/blog/${sourceArticle.slug}`,
            title: sourceArticle.headline,
            funnelStage: sourceArticle.funnel_stage,
            purpose: 'source_article',
            relevanceScore: 10
          });
        }

        // Links 2-3: Other blog articles in same cluster+language
        const clusterId = qa.cluster_id || sourceArticle?.cluster_id;
        if (clusterId) {
          const key = `${clusterId}:${qa.language}`;
          const clusterArticles = blogByClusterLang[key] || [];
          const otherArticles = clusterArticles.filter(a => a.id !== qa.source_article_id);

          // Prefer MOFU for funnel progression, then TOFU for context
          const mofu = otherArticles.filter(a => a.funnel_stage === 'MOFU');
          const tofu = otherArticles.filter(a => a.funnel_stage === 'TOFU');
          const bofu = otherArticles.filter(a => a.funnel_stage === 'BOFU');
          const ranked = [...mofu, ...tofu, ...bofu];

          for (let i = 0; i < Math.min(2, ranked.length); i++) {
            if (links.length >= 3) break;
            const target = ranked[i];
            links.push({
              text: target.headline.toLowerCase(),
              url: `/${target.language}/blog/${target.slug}`,
              title: target.headline,
              funnelStage: target.funnel_stage,
              purpose: i === 0 ? 'funnel_progression' : 'related_topic',
              relevanceScore: 8 - i
            });
          }
        }

        if (links.length > 0) {
          updates.push({ id: qa.id, internal_links: links });
          stats.withLinks++;
          stats.byLanguage[qa.language] = (stats.byLanguage[qa.language] || 0) + 1;
        } else {
          stats.skipped++;
        }
      } catch (err: any) {
        stats.errors.push(`${qa.id}: ${err.message}`);
      }
    }

    console.log(`[QA Backfill] Generated links for ${stats.withLinks} QA pages, skipped ${stats.skipped}`);

    // 5. Apply updates in batches
    let applied = 0;
    if (!dryRun && updates.length > 0) {
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(u => supabase.from('qa_pages').update({ internal_links: u.internal_links }).eq('id', u.id))
        );
        const errors = results.filter(r => r.error);
        applied += batch.length - errors.length;
        if (errors.length > 0) console.error(`[QA Backfill] Batch errors: ${errors.length}`);
        if (i + batchSize < updates.length) await new Promise(r => setTimeout(r, 100));
      }
      console.log(`[QA Backfill] ✅ Applied ${applied}/${updates.length} updates`);
    }

    return new Response(JSON.stringify({
      success: true,
      summary: { ...stats, updatesApplied: dryRun ? 0 : applied, dryRun }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[QA Backfill] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
