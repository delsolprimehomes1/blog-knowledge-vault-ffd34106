import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Funnel stage distribution for a complete cluster
const FUNNEL_STRUCTURE = [
  { stage: 'TOFU', searchIntent: 'informational' },
  { stage: 'TOFU', searchIntent: 'informational' },
  { stage: 'TOFU', searchIntent: 'informational' },
  { stage: 'MOFU', searchIntent: 'comparison' },
  { stage: 'MOFU', searchIntent: 'detailed-guide' },
  { stage: 'BOFU', searchIntent: 'transactional' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clusterId, dryRun = false } = await req.json();

    if (!clusterId) {
      return new Response(
        JSON.stringify({ error: 'clusterId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`[Complete Cluster] Starting for cluster_id: ${clusterId}`);

    // 1. Fetch existing articles in this cluster
    const { data: existingArticles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, headline, funnel_stage, language, slug, cluster_theme, category, cluster_number')
      .eq('cluster_id', clusterId)
      .eq('language', 'en');

    if (fetchError) {
      console.error('[Complete Cluster] Error fetching articles:', fetchError);
      throw fetchError;
    }

    if (!existingArticles || existingArticles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No articles found for this cluster_id' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Complete Cluster] Found ${existingArticles.length} existing English articles`);

    // 2. Determine which funnel stages are missing
    const existingStages = existingArticles.map(a => a.funnel_stage);
    const stageCount = {
      TOFU: existingStages.filter(s => s === 'TOFU').length,
      MOFU: existingStages.filter(s => s === 'MOFU').length,
      BOFU: existingStages.filter(s => s === 'BOFU').length,
    };

    console.log(`[Complete Cluster] Existing stage distribution:`, stageCount);

    // Calculate missing articles based on ideal distribution (3 TOFU, 2 MOFU, 1 BOFU)
    const missingArticles: Array<{ stage: string; searchIntent: string }> = [];
    const neededTofu = Math.max(0, 3 - stageCount.TOFU);
    const neededMofu = Math.max(0, 2 - stageCount.MOFU);
    const neededBofu = Math.max(0, 1 - stageCount.BOFU);

    for (let i = 0; i < neededTofu; i++) {
      missingArticles.push({ stage: 'TOFU', searchIntent: 'informational' });
    }
    for (let i = 0; i < neededMofu; i++) {
      missingArticles.push({ stage: 'MOFU', searchIntent: i === 0 ? 'comparison' : 'detailed-guide' });
    }
    for (let i = 0; i < neededBofu; i++) {
      missingArticles.push({ stage: 'BOFU', searchIntent: 'transactional' });
    }

    if (missingArticles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Cluster is already complete (6 English articles)',
          existingCount: existingArticles.length,
          articlesToGenerate: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Complete Cluster] Need to generate ${missingArticles.length} articles:`, missingArticles);

    // 3. Extract cluster theme and context from existing articles
    const firstArticle = existingArticles[0];
    const clusterTheme = firstArticle.cluster_theme || firstArticle.headline;
    const category = firstArticle.category || 'Buying Guides';

    // Determine next cluster_number
    const maxClusterNumber = Math.max(...existingArticles.map(a => a.cluster_number || 0));
    let nextClusterNumber = maxClusterNumber + 1;

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          clusterId,
          clusterTheme,
          category,
          existingArticles: existingArticles.map(a => ({
            headline: a.headline,
            funnel_stage: a.funnel_stage,
          })),
          stageDistribution: stageCount,
          articlesToGenerate: missingArticles,
          message: `Would generate ${missingArticles.length} articles to complete this cluster`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Generate article plans using AI
    console.log(`[Complete Cluster] Generating article plans...`);
    
    const planPrompt = `You are an SEO content strategist for a luxury real estate agency in Costa del Sol, Spain.

The cluster theme is: "${clusterTheme}"
Category: ${category}
Existing articles in this cluster:
${existingArticles.map(a => `- ${a.funnel_stage}: ${a.headline}`).join('\n')}

Generate ${missingArticles.length} NEW article plans to complete this cluster. The new articles should:
1. Complement the existing content (don't repeat topics)
2. Follow the specific funnel stages needed
3. Include "Costa del Sol" in each headline
4. Be written in English

Required articles:
${missingArticles.map((a, i) => `${i + 1}. ${a.stage} (${a.searchIntent})`).join('\n')}

Return ONLY valid JSON:
{
  "articles": [
    {
      "funnelStage": "TOFU",
      "headline": "Compelling headline with Costa del Sol",
      "targetKeyword": "primary keyword phrase",
      "contentAngle": "What makes this article unique"
    }
  ]
}`;

    const planResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 4096,
        messages: [
          { role: 'system', content: 'You are an SEO expert. Return only valid JSON.' },
          { role: 'user', content: planPrompt }
        ],
      }),
    });

    if (!planResponse.ok) {
      const errorText = await planResponse.text();
      throw new Error(`AI plan generation failed: ${planResponse.status} - ${errorText}`);
    }

    const planData = await planResponse.json();
    const planText = planData.choices?.[0]?.message?.content || '';
    
    let articlePlans;
    try {
      const cleaned = planText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      articlePlans = parsed.articles || parsed;
    } catch (e) {
      console.error('[Complete Cluster] Failed to parse plans:', planText);
      throw new Error('Failed to parse article plans from AI');
    }

    console.log(`[Complete Cluster] Generated ${articlePlans.length} article plans`);

    // 5. Generate each article
    const generatedArticles: any[] = [];
    const { data: authors } = await supabase.from('authors').select('*');
    const randomAuthor = authors?.[Math.floor(Math.random() * (authors?.length || 1))];

    for (let i = 0; i < articlePlans.length; i++) {
      const plan = articlePlans[i];
      console.log(`[Complete Cluster] Generating article ${i + 1}/${articlePlans.length}: ${plan.headline}`);

      // Generate SEO meta
      const seoPrompt = `Create SEO meta for this article:
Headline: ${plan.headline}
Keyword: ${plan.targetKeyword}

Requirements:
- Meta Title: MAXIMUM 55 characters, include keyword and "Costa del Sol"
- Meta Description: MAXIMUM 150 characters, include CTA

IMPORTANT: Keep descriptions under 150 characters.
Return ONLY valid JSON: {"title": "...", "description": "..."}`;

      const seoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          max_tokens: 512,
          messages: [{ role: 'user', content: seoPrompt }],
        }),
      });

      const seoData = await seoResponse.json();
      const seoText = seoData.choices?.[0]?.message?.content || '{}';
      let seoMeta;
      try {
        seoMeta = JSON.parse(seoText.replace(/```json\n?|\n?```/g, '').trim());
      } catch (e) {
        console.warn('[Complete Cluster] Failed to parse SEO meta, using defaults');
        seoMeta = { title: '', description: '' };
      }
      
      // Ensure meta_description is within 160 char limit
      let metaDescription = (seoMeta.description || plan.contentAngle || '').trim();
      if (metaDescription.length > 160) {
        metaDescription = metaDescription.substring(0, 157) + '...';
      }
      
      let metaTitle = (seoMeta.title || plan.headline || '').trim();
      if (metaTitle.length > 60) {
        metaTitle = metaTitle.substring(0, 57) + '...';
      }

      // Generate speakable answer
      const speakablePrompt = `Write a 40-60 word speakable answer for: "${plan.headline}"
Topic: ${plan.contentAngle}
Use conversational tone, present tense, actionable advice.
Return ONLY the text, no JSON.`;

      const speakableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          max_tokens: 256,
          messages: [{ role: 'user', content: speakablePrompt }],
        }),
      });

      const speakableData = await speakableResponse.json();
      const speakableAnswer = speakableData.choices?.[0]?.message?.content?.trim() || '';

      // Generate detailed content
      const contentPrompt = `Write a comprehensive 2000-word blog article:

Headline: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Funnel Stage: ${plan.funnelStage}
Content Angle: ${plan.contentAngle}

Requirements:
1. Structure with H2 and H3 headings
2. Include specific data points about Costa del Sol
3. Write for ${plan.funnelStage} stage
4. Include real examples (Marbella, Estepona, Málaga, etc.)
5. Natural tone, 8th-grade reading level

Format as HTML with <h2>, <h3>, <p>, <ul>, <li>, <strong>, <table>.
Return ONLY the HTML content.`;

      const contentResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          max_tokens: 8192,
          messages: [{ role: 'user', content: contentPrompt }],
        }),
      });

      const contentData = await contentResponse.json();
      const detailedContent = contentData.choices?.[0]?.message?.content?.trim() || '';

      // Create slug
      const slug = plan.headline
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Build article object
      const article = {
        cluster_id: clusterId,
        cluster_theme: clusterTheme,
        cluster_number: nextClusterNumber++,
        headline: plan.headline,
        slug,
        language: 'en',
        funnel_stage: plan.funnelStage,
        category,
        status: 'draft',
        meta_title: metaTitle,
        meta_description: metaDescription,
        speakable_answer: speakableAnswer,
        detailed_content: detailedContent,
        canonical_url: `https://www.delsolprimehomes.com/en/blog/${slug}`,
        featured_image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        featured_image_alt: plan.headline,
        author_id: randomAuthor?.id || null,
        date_published: null,
        date_modified: new Date().toISOString(),
      };

      // Save to database
      const { data: savedArticle, error: saveError } = await supabase
        .from('blog_articles')
        .insert(article)
        .select('id, headline, funnel_stage')
        .single();

      if (saveError) {
        console.error(`[Complete Cluster] Failed to save article ${i + 1}:`, saveError);
        throw saveError;
      }

      generatedArticles.push(savedArticle);
      console.log(`[Complete Cluster] ✅ Saved article ${i + 1}: ${savedArticle.headline}`);
    }

    // 6. Regenerate internal links for the cluster
    console.log(`[Complete Cluster] Regenerating internal links...`);
    
    const linkResponse = await supabase.functions.invoke('regenerate-cluster-links', {
      body: { clusterId, dryRun: false }
    });

    if (linkResponse.error) {
      console.error('[Complete Cluster] Link regeneration warning:', linkResponse.error);
    }

    // 7. Link translations (assign hreflang_group_id)
    console.log(`[Complete Cluster] Linking translations...`);
    
    const { data: allClusterArticles } = await supabase
      .from('blog_articles')
      .select('id, language, slug, cluster_number, hreflang_group_id')
      .eq('cluster_id', clusterId);

    if (allClusterArticles && allClusterArticles.length > 0) {
      // Group by cluster_number
      const groups: Record<number, any[]> = {};
      for (const article of allClusterArticles) {
        if (!groups[article.cluster_number]) {
          groups[article.cluster_number] = [];
        }
        groups[article.cluster_number].push(article);
      }

      // Assign hreflang_group_id to new articles
      for (const [clusterNum, articles] of Object.entries(groups)) {
        const existingGroupId = articles.find(a => a.hreflang_group_id)?.hreflang_group_id;
        const groupId = existingGroupId || crypto.randomUUID();
        
        const articleIds = articles.map(a => a.id);
        await supabase
          .from('blog_articles')
          .update({ hreflang_group_id: groupId })
          .in('id', articleIds);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        clusterId,
        clusterTheme,
        existingArticles: existingArticles.length,
        generatedArticles: generatedArticles.length,
        totalArticles: existingArticles.length + generatedArticles.length,
        newArticles: generatedArticles,
        linksRegenerated: !linkResponse.error,
        message: `Successfully generated ${generatedArticles.length} articles to complete cluster`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Complete Cluster] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
