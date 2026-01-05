import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPECTED_STRUCTURE = [
  { funnelStage: 'TOFU', count: 2 },
  { funnelStage: 'MOFU', count: 2 },
  { funnelStage: 'BOFU', count: 2 },
];

// Content quality validation
function validateContentQuality(article: any, plan: any): { isValid: boolean; issues: string[]; score: number } {
  const issues: string[] = [];
  let score = 100;
  
  const headlineWords = plan.headline.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
  const contentLower = article.detailed_content.toLowerCase();
  const mentionedWords = headlineWords.filter((w: string) => contentLower.includes(w)).length;
  
  if (mentionedWords < headlineWords.length * 0.5) {
    issues.push('Content may not fully address headline topic');
    score -= 15;
  }
  
  const h2Count = (article.detailed_content.match(/<h2>/gi) || []).length;
  if (h2Count < 4) {
    issues.push('Insufficient content structure (need 4+ H2 headings)');
    score -= 10;
  }
  
  const wordCount = article.detailed_content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
  if (wordCount < 1500) {
    issues.push(`Content too short (${wordCount} words, minimum 1500)`);
    score -= 20;
  } else if (wordCount > 2300) {
    issues.push(`Content too long (${wordCount} words, maximum 2300)`);
    score -= 5;
  }
  
  if (article.qa_entities && Array.isArray(article.qa_entities)) {
    if (article.qa_entities.length < 5) {
      issues.push(`Too few FAQs: ${article.qa_entities.length} (need 5-8)`);
      score -= 10;
    }
  }
  
  return { isValid: score >= 60, issues, score };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clusterId, specificFunnelStage } = await req.json();

    if (!clusterId) {
      return new Response(JSON.stringify({ error: 'Missing clusterId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  GENERATE MISSING ARTICLES             ║`);
    console.log(`╚════════════════════════════════════════╝`);
    console.log(`[Missing] Cluster: ${clusterId}`);

    // Get cluster info
    const { data: cluster, error: clusterError } = await supabase
      .from('cluster_generations')
      .select('*')
      .eq('id', clusterId)
      .single();

    if (clusterError || !cluster) {
      throw new Error(`Cluster not found: ${clusterId}`);
    }

    // Get existing articles for source language
    const sourceLanguage = cluster.language || 'en';
    const { data: existingArticles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, funnel_stage, headline')
      .eq('cluster_id', clusterId)
      .eq('language', sourceLanguage);

    if (articlesError) throw articlesError;

    // Analyze what's missing
    const existingByStage: Record<string, number> = {
      'TOFU': 0,
      'MOFU': 0,
      'BOFU': 0,
    };

    for (const article of existingArticles || []) {
      const stage = article.funnel_stage?.toUpperCase() || 'TOFU';
      existingByStage[stage] = (existingByStage[stage] || 0) + 1;
    }

    console.log(`[Missing] Existing articles by stage:`, existingByStage);

    // Determine missing articles
    const missingArticles: { funnelStage: string; count: number }[] = [];
    for (const expected of EXPECTED_STRUCTURE) {
      const have = existingByStage[expected.funnelStage] || 0;
      const need = expected.count - have;
      if (need > 0) {
        if (!specificFunnelStage || specificFunnelStage === expected.funnelStage) {
          missingArticles.push({ funnelStage: expected.funnelStage, count: need });
        }
      }
    }

    if (missingArticles.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No missing articles found. Cluster has all 6 source articles.',
        existing: existingByStage,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Missing] Need to generate:`, missingArticles);

    // Fetch authors and categories
    const { data: authors } = await supabase.from('authors').select('*');
    const { data: categories } = await supabase.from('categories').select('*');

    // Fetch master prompt
    const { data: promptData } = await supabase
      .from('content_settings')
      .select('setting_value')
      .eq('setting_key', 'master_content_prompt')
      .single();
    const masterPrompt = promptData?.setting_value || '';

    const validCategoryNames = (categories || []).map(c => c.name);
    const savedArticles: string[] = [];
    const errors: string[] = [];

    // Generate missing articles
    for (const missing of missingArticles) {
      for (let i = 0; i < missing.count; i++) {
        const articleNum = (existingArticles?.length || 0) + savedArticles.length + 1;
        
        console.log(`\n[Missing] Generating ${missing.funnelStage} article ${i + 1}/${missing.count}...`);

        try {
          // Generate article plan
          const planPrompt = `Generate a single article plan for a ${missing.funnelStage} (${
            missing.funnelStage === 'TOFU' ? 'top-of-funnel, awareness' :
            missing.funnelStage === 'MOFU' ? 'middle-of-funnel, consideration' :
            'bottom-of-funnel, decision/purchase'
          }) article about "${cluster.topic}" targeting "${cluster.primary_keyword}".

The cluster already has these articles:
${(existingArticles || []).map(a => `- ${a.funnel_stage}: ${a.headline}`).join('\n')}

Generate a NEW, UNIQUE article that complements the existing ones without duplicating topics.

Return JSON: { "headline": "...", "targetKeyword": "...", "contentAngle": "...", "funnelStage": "${missing.funnelStage}" }`;

          const planResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              max_tokens: 512,
              messages: [{ role: 'user', content: planPrompt }],
            }),
          });

          if (!planResponse.ok) throw new Error(`Plan generation failed: ${planResponse.status}`);

          const planData = await planResponse.json();
          const planText = planData.choices?.[0]?.message?.content || '';
          const planCleaned = planText.replace(/```json\n?|\n?```|```\n?/g, '').trim();
          const plan = JSON.parse(planCleaned.match(/\{[\s\S]*\}/)?.[0] || planCleaned);

          console.log(`[Missing] Plan: ${plan.headline}`);

          const article: any = {
            funnel_stage: missing.funnelStage,
            language: sourceLanguage,
            status: 'draft',
            headline: plan.headline,
            slug: plan.headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          };

          // Category selection
          const categoryPrompt = `Select the most appropriate category for this article from this EXACT list:
${validCategoryNames.map((name, idx) => `${idx + 1}. ${name}`).join('\n')}

Article: ${plan.headline}
Keyword: ${plan.targetKeyword}
Funnel Stage: ${missing.funnelStage}

Return ONLY the category name exactly as shown above.`;

          const categoryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              max_tokens: 256,
              messages: [{ role: 'user', content: categoryPrompt }],
            }),
          });

          let finalCategory = 'Buying Property';
          if (categoryResponse.ok) {
            const categoryData = await categoryResponse.json();
            const aiCategory = categoryData.choices?.[0]?.message?.content?.trim();
            const matchedCategory = validCategoryNames.find(
              name => name.toLowerCase() === aiCategory?.toLowerCase()
            );
            finalCategory = matchedCategory || 'Buying Property';
          }
          article.category = finalCategory;

          // Main content generation
          const languageNameMap: Record<string, string> = { 
            'en': 'English', 'de': 'German', 'nl': 'Dutch', 'fr': 'French', 
            'pl': 'Polish', 'sv': 'Swedish', 'da': 'Danish', 'hu': 'Hungarian', 
            'fi': 'Finnish', 'no': 'Norwegian' 
          };
          const languageName = languageNameMap[sourceLanguage] || 'English';

          const contentPrompt = masterPrompt 
            ? masterPrompt
                .replace(/\{\{headline\}\}/g, plan.headline)
                .replace(/\{\{targetKeyword\}\}/g, plan.targetKeyword || '')
                .replace(/\{\{contentAngle\}\}/g, plan.contentAngle || '')
                .replace(/\{\{funnelStage\}\}/g, missing.funnelStage)
                .replace(/\{\{language\}\}/g, sourceLanguage)
                .replace(/\{\{languageName\}\}/g, languageName)
            : `Write a comprehensive article about "${plan.headline}" targeting the keyword "${plan.targetKeyword}". 
               Include 5-8 FAQs with detailed answers (80-120 words each, no lists).
               Content should be 1,500-2,000 words with proper H2 structure.
               Return valid JSON with: detailed_content, meta_title, meta_description, speakable_answer, qa_entities.`;

          const contentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'gpt-4o',
              max_tokens: 8192,
              messages: [
                { role: 'system', content: 'You are an expert real estate content writer. Return only valid JSON.' },
                { role: 'user', content: contentPrompt }
              ],
            }),
          });

          if (!contentResponse.ok) throw new Error(`Content generation failed: ${contentResponse.status}`);

          const contentData = await contentResponse.json();
          const contentText = contentData.choices?.[0]?.message?.content || '';
          const contentCleaned = contentText.replace(/```json\n?|\n?```|```\n?/g, '').trim();
          const contentJson = JSON.parse(contentCleaned.match(/\{[\s\S]*\}/)?.[0] || contentCleaned);

          article.detailed_content = contentJson.detailed_content || contentJson.content || '';
          article.meta_title = (contentJson.meta_title || plan.headline).substring(0, 60);
          article.meta_description = (contentJson.meta_description || '').substring(0, 160);
          article.speakable_answer = contentJson.speakable_answer || '';
          article.qa_entities = contentJson.qa_entities || contentJson.faqs || [];

          // Featured image
          const imagePrompt = `Professional real estate photo: ${plan.headline}. Costa del Sol, Spain. High quality, natural lighting.`;
          
          const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: imagePrompt,
              n: 1,
              size: '1792x1024',
              quality: 'standard',
            }),
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            article.featured_image_url = imageData.data?.[0]?.url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9';
          } else {
            article.featured_image_url = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9';
          }
          article.featured_image_alt = `${plan.headline} - Costa del Sol real estate`;

          // Author & Reviewer
          const randomAuthor = authors?.[Math.floor(Math.random() * (authors?.length || 1))] || { id: null };
          const randomReviewer = authors?.filter(a => a.id !== randomAuthor.id)?.[0] || randomAuthor;
          article.author_id = randomAuthor.id;
          article.reviewer_id = randomReviewer.id;

          // Cluster metadata
          article.cluster_id = clusterId;
          article.cluster_number = articleNum;
          article.date_published = new Date().toISOString();
          article.date_modified = new Date().toISOString();

          // Quality validation
          const quality = validateContentQuality(article, plan);
          console.log(`[Missing] Article quality: ${quality.score}/100`);
          if (quality.issues.length > 0) {
            console.warn(`[Missing] Quality issues:`, quality.issues);
          }

          // Save to database
          const { data: savedArticle, error: saveError } = await supabase
            .from('blog_articles')
            .insert(article)
            .select('id')
            .single();

          if (saveError) throw new Error(`Failed to save article: ${saveError.message}`);

          console.log(`[Missing] ✅ Article saved: ${savedArticle.id}`);
          savedArticles.push(savedArticle.id);

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[Missing] ❌ Failed to generate ${missing.funnelStage} article:`, errorMsg);
          errors.push(`${missing.funnelStage}: ${errorMsg}`);
        }
      }
    }

    console.log(`\n[Missing] ✅ Complete! Generated ${savedArticles.length} articles, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      generated: savedArticles.length,
      articleIds: savedArticles,
      errors: errors.length > 0 ? errors : undefined,
      existing: existingByStage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Missing] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
