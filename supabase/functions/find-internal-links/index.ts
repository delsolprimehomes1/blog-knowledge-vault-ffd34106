import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    'en': 'English',
    'nl': 'Dutch',
    'fr': 'French',
    'de': 'German',
    'pl': 'Polish',
    'sv': 'Swedish',
    'da': 'Danish',
    'hu': 'Hungarian',
    'fi': 'Finnish',
    'no': 'Norwegian'
  };
  return names[code] || 'English';
}

// Strategic funnel-based internal linking configuration
const FUNNEL_LINK_STRATEGY: Record<string, {
  maxWithinCluster: number;
  targetStages: string[];
  description: string;
  linkingRules: string;
}> = {
  TOFU: {
    maxWithinCluster: 3,
    targetStages: ['MOFU', 'TOFU'],
    description: 'Link to MOFU for funnel progression, 1 sibling TOFU for related topics',
    linkingRules: `1. Link to 1-2 MOFU articles (funnel progression to deeper content)
2. Link to 1 related TOFU article (sibling topic for broad coverage)
PRIORITY: MOFU links are more important than TOFU siblings`
  },
  MOFU: {
    maxWithinCluster: 3,
    targetStages: ['TOFU', 'BOFU', 'MOFU'],
    description: 'Link to TOFU for context, BOFU for conversion, sibling MOFU for comparison',
    linkingRules: `1. Link to 1 TOFU article (provide background context)
2. Link to 1 BOFU article (conversion path - CRITICAL for funnel)
3. Link to 1 other MOFU article (comparison/related topic)
PRIORITY: BOFU link is most important for conversion`
  },
  BOFU: {
    maxWithinCluster: 3,
    targetStages: ['MOFU', 'TOFU'],
    description: 'Link to MOFU for supporting evidence, TOFU for foundation',
    linkingRules: `1. Link to 2 MOFU articles (supporting evidence/comparisons)
2. Link to 1 TOFU article (foundational context)
PRIORITY: MOFU links provide decision-support evidence`
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { mode = 'single' } = requestData;

    // Batch mode for processing multiple articles
    if (mode === 'batch') {
      return await handleBatchMode(requestData);
    }

    // Single mode (existing functionality)
    const { content, headline, currentArticleId, language = 'en', funnelStage = 'TOFU', availableArticles, clusterId } = requestData;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    let articles = availableArticles;

    // If no articles provided, fetch from database
    if (!articles || articles.length === 0) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Build query with cluster_id filter if provided
      let query = supabase
        .from('blog_articles')
        .select('id, slug, headline, speakable_answer, category, funnel_stage, language, cluster_id')
        .eq('status', 'published')
        .neq('id', currentArticleId)
        .eq('language', language);

      // CRITICAL: Filter by cluster_id to enforce cluster boundaries
      if (clusterId) {
        query = query.eq('cluster_id', clusterId);
        console.log(`[Strategic Linking] Filtering by cluster_id: ${clusterId}`);
      }

      const { data: dbArticles, error: articlesError } = await query;

      if (articlesError) {
        console.error('Error fetching articles:', articlesError);
        throw articlesError;
      }

      articles = dbArticles || [];
      console.log(`[Strategic Linking] Found ${articles.length} articles within cluster`);
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ links: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Strategic Linking] Finding internal links for: ${headline}`);
    console.log(`[Strategic Linking] Funnel stage: ${funnelStage}, Available articles: ${articles.length}`);

    const languageName = getLanguageName(language);
    const strategy = FUNNEL_LINK_STRATEGY[funnelStage] || FUNNEL_LINK_STRATEGY.TOFU;

    // Strategic funnel-aware prompt
    const analysisPrompt = `Find STRATEGIC internal links for this ${languageName} ${funnelStage} article.

Current Article (Language: ${language.toUpperCase()}):
- Headline: ${headline}
- Funnel Stage: ${funnelStage}
- Content Preview: ${content.substring(0, 1500)}

Available Cluster Articles (ALL in ${language.toUpperCase()}):
${articles.map((a: any, i: number) => 
  `${i+1}. [${a.funnel_stage}] "${a.headline}" - ${a.speakable_answer?.substring(0, 80) || 'No description'}`
).join('\n')}

🎯 STRATEGIC LINKING RULES FOR ${funnelStage} ARTICLES:
${strategy.description}

${strategy.linkingRules}

⚠️ CRITICAL CONSTRAINTS:
- Maximum ${strategy.maxWithinCluster} links total - NO MORE!
- Follow funnel progression: ${strategy.targetStages.join(' → ')}
- Each link must serve a specific purpose in the user journey
- DO NOT link to all available articles - be strategic!
- Anchor text MUST be in ${languageName}

Return ONLY valid JSON in this exact format:
{
  "links": [
    {
      "articleNumber": 5,
      "anchorText": "[anchor text in ${languageName}]",
      "purpose": "funnel_progression|context|related_topic|evidence|conversion",
      "targetFunnelStage": "TOFU|MOFU|BOFU",
      "relevanceScore": 9
    }
  ]
}`;

    const aiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are an SEO expert specializing in strategic internal linking for content funnels. You understand that:
- TOFU (Top of Funnel) = Awareness content
- MOFU (Middle of Funnel) = Consideration content  
- BOFU (Bottom of Funnel) = Decision/conversion content

Your goal is to create strategic links that guide users through the buyer's journey, NOT to link everything to everything. Quality over quantity. ALL anchor text must be in ${languageName}.`
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Perplexity API error:', aiResponse.status, errorText);
      throw new Error('Failed to analyze content with Perplexity');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('[Strategic Linking] Perplexity response:', aiContent);

    // Parse JSON response
    let suggestions = [];
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { links: [] };
      suggestions = parsed.links || [];
    } catch (parseError) {
      console.error('Error parsing Perplexity response:', parseError);
      suggestions = [];
    }

    // Enrich suggestions with full article data
    const enrichedLinks = suggestions
      .filter((suggestion: any) => {
        const index = suggestion.articleNumber - 1;
        if (index < 0 || index >= articles.length) return false;
        
        const article = articles[index];
        // Double-check language match
        if (article.language !== language) {
          console.warn(`[Strategic Linking] Filtered out mismatched language: ${article.headline} (${article.language} != ${language})`);
          return false;
        }
        
        return true;
      })
      .map((suggestion: any) => {
        const article = articles[suggestion.articleNumber - 1];
        return {
          text: suggestion.anchorText,
          url: `/blog/${article.slug}`,
          title: article.headline,
          targetArticleId: article.id,
          targetHeadline: article.headline,
          funnelStage: article.funnel_stage,
          category: article.category,
          language: article.language,
          purpose: suggestion.purpose || 'related_topic',
          relevanceScore: suggestion.relevanceScore || 5
        };
      });

    // Sort by relevance score
    enrichedLinks.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

    // ENFORCE STRATEGIC LIMIT - max 3 within-cluster links
    const maxLinks = strategy.maxWithinCluster;
    const strategicLinks = enrichedLinks.slice(0, maxLinks);
    
    console.log(`[Strategic Linking] ${funnelStage} article: ${strategicLinks.length}/${enrichedLinks.length} links (max: ${maxLinks})`);
    
    // Log link distribution by purpose
    const purposeCount: Record<string, number> = {};
    strategicLinks.forEach((link: any) => {
      purposeCount[link.purpose] = (purposeCount[link.purpose] || 0) + 1;
    });
    console.log(`[Strategic Linking] Link purposes:`, purposeCount);

    return new Response(
      JSON.stringify({ links: strategicLinks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in find-internal-links function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        links: [] 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleBatchMode(requestData: any) {
  const { articleIds } = requestData;
  
  if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
    return new Response(
      JSON.stringify({ error: 'articleIds array is required for batch mode' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all articles
  const { data: articlesToProcess, error: fetchError } = await supabase
    .from('blog_articles')
    .select('*')
    .in('id', articleIds)
    .eq('status', 'published');

  if (fetchError) {
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  const results = [];
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

  for (const article of articlesToProcess || []) {
    try {
      // Build query - filter by cluster_id to enforce cluster boundaries
      let query = supabase
        .from('blog_articles')
        .select('id, slug, headline, funnel_stage, language, category, speakable_answer, cluster_id')
        .eq('status', 'published')
        .eq('language', article.language)
        .neq('id', article.id);

      // CRITICAL: Filter by cluster_id if article belongs to a cluster
      if (article.cluster_id) {
        query = query.eq('cluster_id', article.cluster_id);
        console.log(`[Batch Strategic Linking] Filtering by cluster_id: ${article.cluster_id}`);
      }

      const { data: availableArticles } = await query.limit(100);

      if (!availableArticles || availableArticles.length === 0) {
        results.push({
          articleId: article.id,
          success: false,
          error: 'No available articles to link to within cluster',
          linkCount: 0
        });
        continue;
      }
      
      console.log(`[Batch Strategic Linking] Found ${availableArticles.length} articles within cluster for "${article.headline}"`);


      const languageName = getLanguageName(article.language);
      const funnelStage = article.funnel_stage || 'TOFU';
      const strategy = FUNNEL_LINK_STRATEGY[funnelStage] || FUNNEL_LINK_STRATEGY.TOFU;
      
      // Strategic funnel-aware batch prompt
      const prompt = `Find STRATEGIC internal links for this ${languageName} ${funnelStage} article.

Current Article:
- Headline: ${article.headline}
- Funnel Stage: ${funnelStage}
- Content Preview: ${article.detailed_content.substring(0, 1500)}...

Available Articles (ALL in ${article.language.toUpperCase()}):
${availableArticles.map((a: any, i: number) => 
  `${i+1}. [${a.funnel_stage}] "${a.headline}" - ${a.speakable_answer?.substring(0, 80) || ''}`
).join('\n')}

🎯 STRATEGIC LINKING RULES FOR ${funnelStage} ARTICLES:
${strategy.linkingRules}

Maximum ${strategy.maxWithinCluster} links. Follow funnel progression priority.

Return ONLY valid JSON:
{
  "links": [
    {
      "articleNumber": 5,
      "anchorText": "[anchor text in ${languageName}]",
      "purpose": "funnel_progression|context|related_topic|evidence|conversion",
      "relevanceScore": 9
    }
  ]
}`;

      const aiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            { 
              role: 'system', 
              content: `You are an SEO expert specializing in strategic funnel-based internal linking. Maximum ${strategy.maxWithinCluster} links per article. Quality over quantity. Return only valid JSON.` 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });

      const aiData = await aiResponse.json();
      const aiContent = aiData.choices[0].message.content;
      
      let suggestions = [];
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { links: [] };
        suggestions = parsed.links || [];
      } catch {
        suggestions = [];
      }

      // Enrich and enforce strategic limit
      const enrichedLinks = suggestions
        .filter((s: any) => {
          const index = s.articleNumber - 1;
          return index >= 0 && index < availableArticles.length;
        })
        .map((s: any) => {
          const targetArticle = availableArticles[s.articleNumber - 1];
          return {
            text: s.anchorText,
            url: `/blog/${targetArticle.slug}`,
            title: targetArticle.headline,
            purpose: s.purpose || 'related_topic',
            relevanceScore: s.relevanceScore || 5
          };
        })
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
        .slice(0, strategy.maxWithinCluster); // ENFORCE MAX 3 LINKS

      const confidenceScore = enrichedLinks.length >= 2 ? 85 : 60;

      console.log(`[Batch Strategic Linking] ${funnelStage} article "${article.headline}": ${enrichedLinks.length} links (max: ${strategy.maxWithinCluster})`);

      // Store in database
      await supabase.from('internal_link_suggestions').insert({
        article_id: article.id,
        suggested_links: enrichedLinks,
        status: 'pending',
        confidence_score: confidenceScore
      });

      results.push({
        articleId: article.id,
        funnelStage,
        success: true,
        links: enrichedLinks,
        linkCount: enrichedLinks.length,
        maxAllowed: strategy.maxWithinCluster,
        confidenceScore
      });

    } catch (error: any) {
      results.push({
        articleId: article.id,
        success: false,
        error: error.message,
        linkCount: 0
      });
    }
  }

  // Log summary
  const summary = results.reduce((acc: any, r: any) => {
    if (r.success) {
      const stage = r.funnelStage || 'UNKNOWN';
      if (!acc[stage]) acc[stage] = { count: 0, totalLinks: 0 };
      acc[stage].count++;
      acc[stage].totalLinks += r.linkCount;
    }
    return acc;
  }, {});
  
  console.log(`[Batch Strategic Linking] Summary:`, summary);

  return new Response(
    JSON.stringify({ mode: 'batch', results, summary }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
