import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BlogArticle {
  id: string;
  slug: string;
  language: string;
  cluster_id: string | null;
  hreflang_group_id: string | null;
  translations: Record<string, string> | null;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { dryRun = true } = await req.json().catch(() => ({ dryRun: true }));

    console.log(`🔧 Starting blog hreflang repair (dryRun: ${dryRun})`);

    // Fetch all published blog articles
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, slug, language, cluster_id, hreflang_group_id, translations, status')
      .eq('status', 'published')
      .order('cluster_id', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    console.log(`📊 Found ${articles?.length || 0} published blog articles`);

    const stats = {
      totalArticles: articles?.length || 0,
      articlesWithNullGroupId: 0,
      articlesWithBrokenTranslations: 0,
      clustersProcessed: 0,
      orphanArticles: 0,
      fixed: 0,
      errors: [] as string[],
    };

    // Group articles by cluster_id
    const clusterMap = new Map<string, BlogArticle[]>();
    const orphanArticles: BlogArticle[] = [];

    for (const article of (articles || [])) {
      if (!article.hreflang_group_id) {
        stats.articlesWithNullGroupId++;
      }

      // Check for broken translations (pointing to compare pages)
      if (article.translations) {
        const translationsStr = JSON.stringify(article.translations);
        if (translationsStr.includes('compare') || translationsStr.includes('/compare/')) {
          stats.articlesWithBrokenTranslations++;
          console.log(`⚠️ Article ${article.slug} has broken translations pointing to compare pages`);
        }
      }

      if (article.cluster_id) {
        const existing = clusterMap.get(article.cluster_id) || [];
        existing.push(article);
        clusterMap.set(article.cluster_id, existing);
      } else {
        orphanArticles.push(article);
      }
    }

    stats.orphanArticles = orphanArticles.length;
    console.log(`📁 Found ${clusterMap.size} clusters, ${orphanArticles.length} orphan articles`);

    const updates: { id: string; hreflang_group_id: string; translations: Record<string, string> }[] = [];

    // Process each cluster
    for (const [clusterId, clusterArticles] of clusterMap) {
      stats.clustersProcessed++;

      // Find English article (source of truth)
      const englishArticle = clusterArticles.find(a => a.language === 'en');
      
      // Determine hreflang_group_id
      let groupId: string;
      if (englishArticle?.hreflang_group_id) {
        groupId = englishArticle.hreflang_group_id;
      } else {
        // Use any existing group ID from cluster, or generate new one
        const existingGroupId = clusterArticles.find(a => a.hreflang_group_id)?.hreflang_group_id;
        groupId = existingGroupId || crypto.randomUUID();
      }

      // Build correct translations JSONB (language -> slug mapping)
      const correctTranslations: Record<string, string> = {};
      for (const article of clusterArticles) {
        correctTranslations[article.language] = article.slug;
      }

      // Update each article in the cluster
      for (const article of clusterArticles) {
        const needsGroupIdUpdate = article.hreflang_group_id !== groupId;
        
        // Build translations without self
        const articleTranslations: Record<string, string> = {};
        for (const [lang, slug] of Object.entries(correctTranslations)) {
          if (lang !== article.language) {
            articleTranslations[lang] = slug;
          }
        }

        const existingTranslations = article.translations || {};
        const translationsChanged = JSON.stringify(existingTranslations) !== JSON.stringify(articleTranslations);

        if (needsGroupIdUpdate || translationsChanged) {
          updates.push({
            id: article.id,
            hreflang_group_id: groupId,
            translations: articleTranslations,
          });
        }
      }
    }

    // Handle orphan articles (no cluster_id)
    for (const article of orphanArticles) {
      // Each orphan gets its own group ID (it's the only translation)
      if (!article.hreflang_group_id) {
        updates.push({
          id: article.id,
          hreflang_group_id: crypto.randomUUID(),
          translations: {},
        });
      }
    }

    console.log(`📝 ${updates.length} articles need updates`);

    // Apply updates if not dry run
    if (!dryRun && updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({
            hreflang_group_id: update.hreflang_group_id,
            translations: update.translations,
          })
          .eq('id', update.id);

        if (updateError) {
          stats.errors.push(`Failed to update ${update.id}: ${updateError.message}`);
          console.error(`❌ Failed to update ${update.id}: ${updateError.message}`);
        } else {
          stats.fixed++;
        }
      }
      console.log(`✅ Applied ${stats.fixed} updates`);
    }

    // Fetch sample of affected articles for preview
    const sampleAffected = updates.slice(0, 10).map(u => {
      const article = articles?.find(a => a.id === u.id);
      return {
        id: u.id,
        slug: article?.slug,
        language: article?.language,
        oldGroupId: article?.hreflang_group_id,
        newGroupId: u.hreflang_group_id,
        newTranslations: u.translations,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        stats: {
          ...stats,
          updatesNeeded: updates.length,
          fixed: dryRun ? 0 : stats.fixed,
        },
        sampleAffected,
        message: dryRun 
          ? `Dry run complete. ${updates.length} articles would be updated.`
          : `Repair complete. ${stats.fixed} articles updated.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
