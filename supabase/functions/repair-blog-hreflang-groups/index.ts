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

    // Group articles by their hreflang group (matching by translations overlap OR existing hreflang_group_id)
    const groupMap = new Map<string, BlogArticle[]>();
    const orphanArticles: BlogArticle[] = [];

    // First pass: group articles that already have hreflang_group_id
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

      if (article.hreflang_group_id) {
        const existing = groupMap.get(article.hreflang_group_id) || [];
        existing.push(article);
        groupMap.set(article.hreflang_group_id, existing);
      }
    }

    // Second pass: match articles without hreflang_group_id to existing groups via translations
    for (const article of (articles || [])) {
      if (article.hreflang_group_id) continue; // Already processed
      
      let matched = false;
      
      // Try to find matching group via translations JSONB
      if (article.translations && Object.keys(article.translations).length > 0) {
        for (const [groupId, groupArticles] of groupMap) {
          // Check if any article in this group has a slug that matches our translations
          for (const groupArticle of groupArticles) {
            // Check if translations point to each other
            const articleTranslations = article.translations as Record<string, string>;
            const groupTranslations = groupArticle.translations as Record<string, string>;
            
            // If our translations contain the group article's slug, or vice versa
            if (articleTranslations[groupArticle.language] === groupArticle.slug ||
                (groupTranslations && groupTranslations[article.language] === article.slug)) {
              groupArticles.push(article);
              matched = true;
              console.log(`✓ Matched ${article.slug} (${article.language}) to group ${groupId} via translations`);
              break;
            }
          }
          if (matched) break;
        }
      }
      
      if (!matched) {
        orphanArticles.push(article);
      }
    }

    stats.orphanArticles = orphanArticles.length;
    console.log(`📁 Found ${groupMap.size} hreflang groups, ${orphanArticles.length} orphan articles`);

    const updates: { id: string; hreflang_group_id: string; translations: Record<string, string> }[] = [];

    // Process each hreflang group
    for (const [groupId, groupArticles] of groupMap) {
      stats.clustersProcessed++;

      // Build correct translations JSONB (language -> slug mapping) INCLUDING self
      const correctTranslations: Record<string, string> = {};
      for (const article of groupArticles) {
        correctTranslations[article.language] = article.slug;
      }

      // Update each article in the group
      for (const article of groupArticles) {
        const needsGroupIdUpdate = article.hreflang_group_id !== groupId;
        
        // Build translations WITH self-reference (critical for hreflang self-link)
        const articleTranslations: Record<string, string> = {};
        for (const [lang, slug] of Object.entries(correctTranslations)) {
          // Include ALL languages including self for proper hreflang generation
          articleTranslations[lang] = slug;
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
