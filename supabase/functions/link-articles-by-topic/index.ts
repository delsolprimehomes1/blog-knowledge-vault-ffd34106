import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArticleForMatching {
  id: string;
  language: string;
  headline: string;
  slug: string;
  cluster_id: string;
  category: string;
}

interface ProposedCluster {
  topic: string;
  confidence: number;
  articles: ArticleForMatching[];
  primaryArticleId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, articleIds, threshold = 0.60, batchSize = 50, offset = 0, articles, clusters, rollbackKey } = body;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'scan') {
      // Fetch standalone articles (clusters with only 1 article)
      console.log(`Scanning articles, offset: ${offset}, batchSize: ${batchSize}`);
      
      const { data: articles, error } = await supabase
        .from('blog_articles')
        .select('id, language, headline, slug, cluster_id, category')
        .eq('status', 'published')
        .range(offset, offset + batchSize - 1)
        .order('headline');

      if (error) throw error;

      // Count total for pagination
      const { count } = await supabase
        .from('blog_articles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published');

      return new Response(JSON.stringify({
        articles,
        total: count,
        hasMore: offset + batchSize < (count || 0)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'analyze') {
      // Use AI to find semantic matches across languages
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

      // articles already extracted from body above
      
      if (!articles || articles.length === 0) {
        return new Response(JSON.stringify({ clusters: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Group articles by category first to reduce AI workload
      const byCategory: Record<string, ArticleForMatching[]> = {};
      for (const article of articles) {
        const cat = article.category || 'uncategorized';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(article);
      }

      const allProposedClusters: ProposedCluster[] = [];

      // Process each category separately
      for (const [category, categoryArticles] of Object.entries(byCategory)) {
        if (categoryArticles.length < 2) continue;

        // Build article list for AI prompt
        const articleList = categoryArticles
          .map((a, i) => `${i + 1}. [${a.language.toUpperCase()}] "${a.headline}" (id: ${a.id})`)
          .join('\n');

        const prompt = `You are an expert at identifying semantically similar content across languages.

Given these blog articles from the "${category}" category, identify which ones cover the EXACT SAME topic in different languages. These are likely translations of the same content.

ARTICLES:
${articleList}

RULES:
1. Only group articles that discuss the IDENTICAL subject matter
2. Maximum ONE article per language per group
3. Ignore articles that have no clear match
4. Focus on core topic, not just similar themes
5. Return confidence score (0.0-1.0) for each group

Return a JSON array of cluster groups:
[
  {
    "topic": "Brief English description of the shared topic",
    "confidence": 0.85,
    "articleIds": ["id1", "id2", "id3"]
  }
]

Only include groups with confidence >= ${threshold}.
If no clear matches exist, return an empty array: []`;

        try {
          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: 'You analyze multilingual content to find semantic matches. Always respond with valid JSON only.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.1,
            }),
          });

          if (!response.ok) {
            console.error(`AI error for category ${category}:`, await response.text());
            continue;
          }

          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '[]';
          
          // Extract JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (!jsonMatch) continue;

          const clusters = JSON.parse(jsonMatch[0]);
          
          for (const cluster of clusters) {
            if (cluster.confidence < threshold) continue;
            
            const clusterArticles = cluster.articleIds
              .map((id: string) => categoryArticles.find(a => a.id === id))
              .filter(Boolean);

            if (clusterArticles.length < 2) continue;

            // Determine primary (EN first, else longest headline)
            const enArticle = clusterArticles.find((a: ArticleForMatching) => a.language === 'en');
            const primaryArticle = enArticle || clusterArticles.reduce((a: ArticleForMatching, b: ArticleForMatching) => 
              a.headline.length > b.headline.length ? a : b
            );

            allProposedClusters.push({
              topic: cluster.topic,
              confidence: cluster.confidence,
              articles: clusterArticles,
              primaryArticleId: primaryArticle.id
            });
          }
        } catch (e) {
          console.error(`Error processing category ${category}:`, e);
        }
      }

      return new Response(JSON.stringify({ clusters: allProposedClusters }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'apply') {
      // Apply cluster assignments to database
      // clusters already extracted from body above
      
      if (!clusters || clusters.length === 0) {
        return new Response(JSON.stringify({ success: true, updated: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let updatedCount = 0;
      const appliedClusters: any[] = [];

      for (const cluster of clusters) {
        const newClusterId = crypto.randomUUID();
        const articles = cluster.articles as ArticleForMatching[];
        const articleIds = articles.map(a => a.id);
        
        // FIX #1: Fetch ACTUAL current cluster_ids from database for rollback
        const { data: currentArticles } = await supabase
          .from('blog_articles')
          .select('id, cluster_id')
          .in('id', articleIds);
        
        const currentClusterMap = new Map(
          currentArticles?.map(a => [a.id, a.cluster_id]) || []
        );
        
        // Build translations JSONB
        const translations: Record<string, string> = {};
        for (const article of articles) {
          translations[article.language] = article.slug;
        }

        // Store previous state with ACTUAL cluster_ids from database
        const previousState = articles.map(a => ({
          id: a.id,
          previousClusterId: currentClusterMap.get(a.id) || null
        }));

        // Update each article in the cluster
        let primaryWasSet = false;
        for (const article of articles) {
          const isPrimary = article.id === cluster.primaryArticleId;
          if (isPrimary) primaryWasSet = true;
          
          const { error } = await supabase
            .from('blog_articles')
            .update({
              cluster_id: newClusterId,
              is_primary: isPrimary,
              translations: translations,
              updated_at: new Date().toISOString()
            })
            .eq('id', article.id);

          if (error) {
            console.error(`Error updating article ${article.id}:`, error);
          } else {
            updatedCount++;
          }
        }

        // FIX #2: Ensure at least one article is primary per cluster
        if (!primaryWasSet && articles.length > 0) {
          console.log(`Primary article not found in cluster, setting fallback primary: ${articles[0].id}`);
          await supabase
            .from('blog_articles')
            .update({ is_primary: true })
            .eq('id', articles[0].id);
        }

        appliedClusters.push({
          clusterId: newClusterId,
          topic: cluster.topic,
          articleCount: articles.length,
          previousState
        });
      }

      // Store rollback info in content_settings
      const rollbackKey = `bulk_linker_rollback_${Date.now()}`;
      await supabase
        .from('content_settings')
        .insert({
          setting_key: rollbackKey,
          setting_value: JSON.stringify(appliedClusters),
          description: `Bulk linker operation - ${clusters.length} clusters, ${updatedCount} articles`
        });

      return new Response(JSON.stringify({ 
        success: true, 
        updated: updatedCount,
        clusters: appliedClusters.length,
        rollbackKey
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'rollback') {
      // rollbackKey already extracted from body above
      
      const { data: setting } = await supabase
        .from('content_settings')
        .select('setting_value')
        .eq('setting_key', rollbackKey)
        .single();

      if (!setting) {
        throw new Error('Rollback data not found');
      }

      const appliedClusters = JSON.parse(setting.setting_value);
      let rolledBack = 0;

      for (const cluster of appliedClusters) {
        for (const prev of cluster.previousState) {
          const { error } = await supabase
            .from('blog_articles')
            .update({
              cluster_id: prev.previousClusterId,
              is_primary: true, // Reset to standalone primary
              translations: {}, // Clear translations
              updated_at: new Date().toISOString()
            })
            .eq('id', prev.id);

          if (!error) rolledBack++;
        }
      }

      // Remove rollback record
      await supabase
        .from('content_settings')
        .delete()
        .eq('setting_key', rollbackKey);

      return new Response(JSON.stringify({ success: true, rolledBack }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in link-articles-by-topic:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
