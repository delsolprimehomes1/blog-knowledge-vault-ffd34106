import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPECTED_STRUCTURE = [
  { funnelStage: 'TOFU', count: 3 },
  { funnelStage: 'MOFU', count: 2 },
  { funnelStage: 'BOFU', count: 1 },
];

// Helper to safely extract JSON from response
function extractJsonFromResponse(text: string): any {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try to extract from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (e2) {
        // Continue to other methods
      }
    }
    
    // Try to find JSON object boundaries
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      } catch (e3) {
        // Continue
      }
    }
    
    throw new Error('Could not extract valid JSON from response');
  }
}

// Count words in HTML content
function countWords(html: string): number {
  const text = (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

// Content quality validation with strict word count enforcement
function validateContentQuality(article: any, plan: any): { isValid: boolean; issues: string[]; score: number; wordCount: number } {
  const issues: string[] = [];
  let score = 100;
  
  const headlineWords = plan.headline.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
  const contentLower = (article.detailed_content || '').toLowerCase();
  const mentionedWords = headlineWords.filter((w: string) => contentLower.includes(w)).length;
  
  if (mentionedWords < headlineWords.length * 0.5) {
    issues.push('Content may not fully address headline topic');
    score -= 15;
  }
  
  const h2Count = (article.detailed_content?.match(/<h2>/gi) || []).length;
  if (h2Count < 4) {
    issues.push('Insufficient content structure (need 4+ H2 headings)');
    score -= 10;
  }
  
  const wordCount = countWords(article.detailed_content || '');
  
  // HARD FAIL: Articles under 1200 words are always invalid
  if (wordCount < 1200) {
    issues.push(`CRITICAL: Content severely under minimum (${wordCount} words, need 1500+)`);
    return { isValid: false, issues, score: 0, wordCount };
  }
  
  if (wordCount < 1500) {
    issues.push(`Content too short (${wordCount} words, minimum 1500)`);
    score -= 40; // Increased penalty
  } else if (wordCount > 2500) {
    issues.push(`Content too long (${wordCount} words, maximum 2500)`);
    score -= 10;
  }
  
  if (article.qa_entities && Array.isArray(article.qa_entities)) {
    if (article.qa_entities.length < 5) {
      issues.push(`Too few FAQs: ${article.qa_entities.length} (need 5-8)`);
      score -= 10;
    }
  }
  
  return { isValid: score >= 60, issues, score, wordCount };
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
      .select('id, funnel_stage, headline, cluster_number')
      .eq('cluster_id', clusterId)
      .eq('language', sourceLanguage);

    if (articlesError) throw articlesError;

    // Analyze what's missing AND track used cluster_numbers
    const existingByStage: Record<string, number> = {
      'TOFU': 0,
      'MOFU': 0,
      'BOFO': 0,
    };

    const usedClusterNumbers = new Set<number>();

    for (const article of existingArticles || []) {
      const stage = article.funnel_stage?.toUpperCase() || 'TOFU';
      existingByStage[stage] = (existingByStage[stage] || 0) + 1;
      if (article.cluster_number) {
        usedClusterNumbers.add(article.cluster_number);
      }
    }

    // Calculate missing cluster_numbers (should fill gaps 1-6)
    const missingClusterNumbers: number[] = [];
    for (let i = 1; i <= 6; i++) {
      if (!usedClusterNumbers.has(i)) {
        missingClusterNumbers.push(i);
      }
    }

    console.log(`[Missing] Existing articles by stage:`, existingByStage);
    console.log(`[Missing] Used cluster_numbers: [${Array.from(usedClusterNumbers).sort((a,b) => a-b).join(', ')}]`);
    console.log(`[Missing] Missing cluster_numbers: [${missingClusterNumbers.join(', ')}]`);

    // Determine missing articles by funnel stage
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

    // Calculate total missing count
    const totalMissing = missingArticles.reduce((sum, m) => sum + m.count, 0);

    if (missingArticles.length === 0 || totalMissing === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No missing articles found. Cluster has all 6 source articles.',
        existing: existingByStage,
        generated: 0,
        remaining: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Missing] Need to generate: ${totalMissing} articles total`, missingArticles);

    // CHUNKED ARCHITECTURE: Generate only ONE article per invocation
    // Get the first missing article to generate
    const firstMissing = missingArticles[0];
    const nextClusterNumber = missingClusterNumbers[0];
    
    if (nextClusterNumber === undefined) {
      console.error(`[Missing] No available cluster_number slot!`);
      return new Response(JSON.stringify({
        success: false,
        error: 'No available cluster_number slot',
        generated: 0,
        remaining: totalMissing,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Generate ONE article (chunked architecture - one per invocation)
    console.log(`\n[Missing] Generating ${firstMissing.funnelStage} article (cluster_number: ${nextClusterNumber})...`);
    
    // Generate article plan with JSON mode
    const planPrompt = `Generate a single article plan for a ${firstMissing.funnelStage} (${
      firstMissing.funnelStage === 'TOFU' ? 'top-of-funnel, awareness' :
      firstMissing.funnelStage === 'MOFU' ? 'middle-of-funnel, consideration' :
      'bottom-of-funnel, decision/purchase'
    }) article about "${cluster.topic}" targeting "${cluster.primary_keyword}".

The cluster already has these articles:
${(existingArticles || []).map(a => `- ${a.funnel_stage}: ${a.headline}`).join('\n')}

Generate a NEW, UNIQUE article that complements the existing ones without duplicating topics.

You MUST respond with a valid JSON object:
{
  "headline": "Compelling article headline",
  "targetKeyword": "primary target keyword",
  "contentAngle": "unique angle for this article",
  "funnelStage": "${firstMissing.funnelStage}"
}`;

    const planResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 512,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: planPrompt }],
      }),
    });

    if (!planResponse.ok) {
      const errorText = await planResponse.text();
      console.error(`[Missing] Plan API error (${planResponse.status}):`, errorText.substring(0, 500));
      throw new Error(`Plan generation failed: ${planResponse.status}`);
    }

    const planData = await planResponse.json();
    const planText = planData.choices?.[0]?.message?.content || '';
    if (!planText.trim()) {
      throw new Error('OpenAI returned empty plan response');
    }
    
    let plan;
    try {
      plan = extractJsonFromResponse(planText);
    } catch (parseError) {
      console.error(`[Missing] Plan parse error:`, parseError);
      throw new Error(`Plan response did not contain valid JSON`);
    }

    console.log(`[Missing] Plan: ${plan.headline}`);
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));

    const article: any = {
      funnel_stage: firstMissing.funnelStage,
      language: sourceLanguage,
      status: 'draft',
      headline: plan.headline,
      slug: plan.headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    };

    // Category selection with JSON mode
    const categoryPrompt = `Select the most appropriate category for this article.

Available categories:
${validCategoryNames.map((name, idx) => `${idx + 1}. ${name}`).join('\n')}

Article: ${plan.headline}
Keyword: ${plan.targetKeyword}
Funnel Stage: ${firstMissing.funnelStage}

Respond with JSON: { "category": "exact category name from the list" }`;

    const categoryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 256,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: categoryPrompt }],
      }),
    });

    let finalCategory = 'Buying Property';
    if (categoryResponse.ok) {
      const categoryData = await categoryResponse.json();
      try {
        const categoryJson = extractJsonFromResponse(categoryData.choices?.[0]?.message?.content || '{}');
        const aiCategory = categoryJson.category;
        const matchedCategory = validCategoryNames.find(
          name => name.toLowerCase() === aiCategory?.toLowerCase()
        );
        finalCategory = matchedCategory || 'Buying Property';
      } catch (e) {
        console.warn('[Missing] Category parse failed, using default');
      }
    }
    article.category = finalCategory;

    // Main content generation with JSON mode
    const languageNameMap: Record<string, string> = { 
      'en': 'English', 'de': 'German', 'nl': 'Dutch', 'fr': 'French', 
      'pl': 'Polish', 'sv': 'Swedish', 'da': 'Danish', 'hu': 'Hungarian', 
      'fi': 'Finnish', 'no': 'Norwegian' 
    };
    const languageName = languageNameMap[sourceLanguage] || 'English';

    // Build content prompt with STRICT word count requirements
    let basePrompt = masterPrompt 
      ? masterPrompt
          .replace(/\{\{headline\}\}/g, plan.headline)
          .replace(/\{\{targetKeyword\}\}/g, plan.targetKeyword || '')
          .replace(/\{\{contentAngle\}\}/g, plan.contentAngle || '')
          .replace(/\{\{funnelStage\}\}/g, firstMissing.funnelStage)
          .replace(/\{\{language\}\}/g, sourceLanguage)
          .replace(/\{\{languageName\}\}/g, languageName)
      : `Write a comprehensive article about "${plan.headline}" targeting the keyword "${plan.targetKeyword}".`;

    const contentPrompt = `${basePrompt}

CRITICAL WORD COUNT REQUIREMENT: The article MUST be between 1,200 and 2,000 words.
- Minimum: 1,200 words (articles under this will be REJECTED)
- Target: 1,400-1,600 words (ideal range)
- Maximum: 2,000 words

You MUST respond with a valid JSON object with this exact structure:
{
  "detailed_content": "<div class='article-content'>...full HTML article content (MINIMUM 1500 words, target 1800-2000)...</div>",
  "meta_title": "SEO title (50-60 characters)",
  "meta_description": "SEO meta description (150-160 characters)", 
  "speakable_answer": "40-60 word summary answering the main question directly",
  "qa_entities": [
    {"question": "FAQ question 1?", "answer": "Detailed answer (80-120 words, single paragraph, no lists)"},
    {"question": "FAQ question 2?", "answer": "Detailed answer (80-120 words, single paragraph, no lists)"}
  ]
}

Include 5-8 FAQ questions in qa_entities. Each answer must be 80-120 words in a single paragraph (no bullet points or lists).
The detailed_content must be proper HTML with at least 6 H2 headings, detailed paragraphs, examples, and expert insights.
REMEMBER: Minimum 1,500 words in detailed_content is MANDATORY.`;

    // Generate content with retry loop for word count enforcement (3 attempts with escalating prompts)
    let contentJson: any = null;
    let attempts = 0;
    const maxAttempts = 2;
    let lastWordCount = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`[Missing] Content generation attempt ${attempts}/${maxAttempts}...`);
      
      let currentPrompt = contentPrompt;
      let systemPrompt = `You are an expert real estate content writer specializing in Costa del Sol, Spain.

CRITICAL REQUIREMENTS:
1. You MUST respond with valid JSON only
2. Articles MUST be between 1,500 and 2,500 words - this is NON-NEGOTIABLE
3. Include at least 8 H2 sections, each with 3+ detailed paragraphs (150-200 words per section)
4. Before finalizing, mentally count your words - if under 1,500, ADD MORE CONTENT`;

      if (attempts === 2 && contentJson) {
        const prevWordCount = countWords(contentJson.detailed_content || '');
        systemPrompt = `You are an expert real estate content writer. Your previous response was ONLY ${prevWordCount} words - this is UNACCEPTABLE.

MANDATORY: This response MUST be at least 1,500 words. 
STRATEGY: Write 8 sections of 200+ words each = 1,600+ words minimum.
DO NOT submit anything under 1,500 words.`;

        currentPrompt = `${contentPrompt}

⚠️ PREVIOUS ATTEMPT FAILED: Only ${prevWordCount} words generated.

You MUST write a MUCH LONGER article. Use this structure:
1. Introduction (150+ words)
2. Section 1 - Overview (200+ words)
3. Section 2 - Key Considerations (200+ words)
4. Section 3 - Process Details (200+ words)
5. Section 4 - Costs & Fees (200+ words)
6. Section 5 - Legal Requirements (200+ words)
7. Section 6 - Common Mistakes (200+ words)
8. Section 7 - Expert Tips (200+ words)
9. Conclusion (150+ words)

This structure gives you 1,700+ words. Follow it exactly.`;
      } else if (attempts === 3 && contentJson) {
        const prevWordCount = countWords(contentJson.detailed_content || '');
        systemPrompt = `FINAL ATTEMPT. Previous responses were too short (${prevWordCount} words).

You are a verbose, detailed writer. EVERY paragraph must be 80-100 words minimum.
Include specific examples, statistics, expert quotes, and regional details for EVERY point.
If in doubt, ADD MORE DETAIL. Err on the side of being too long.`;

        currentPrompt = `${contentPrompt}

🚨 FINAL ATTEMPT - MUST REACH 1,500 WORDS 🚨

Your previous ${attempts - 1} attempts produced only ${prevWordCount} words. This is your LAST chance.

MANDATORY EXPANSION TECHNIQUES:
• Add specific Costa del Sol examples (Marbella, Estepona, Mijas, etc.)
• Include 2-3 sentences of explanation for EVERY claim
• Add "For example..." or "In practice, this means..." phrases
• Include relevant statistics and timeframes
• Mention both advantages AND disadvantages of each point
• Add expert insights like "Experienced agents recommend..."

SECTION WORD COUNTS (strict minimums):
- Introduction: 200 words
- Each of 6-8 body sections: 200+ words  
- FAQ section: 5-8 questions with 100-word answers each
- Conclusion: 150 words

TOTAL MINIMUM: 1,800 words. Do NOT submit under 1,500.`;
      }

      const contentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 12000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: currentPrompt }
          ],
        }),
      });

      if (!contentResponse.ok) {
        const errorText = await contentResponse.text();
        console.error(`[Missing] Content API error (${contentResponse.status}):`, errorText.substring(0, 500));
        throw new Error(`Content generation failed: ${contentResponse.status}`);
      }

      const contentData = await contentResponse.json();
      const contentText = contentData.choices?.[0]?.message?.content || '';
      
      if (!contentText.trim()) {
        throw new Error('OpenAI returned empty content response');
      }
      
      try {
        contentJson = extractJsonFromResponse(contentText);
      } catch (parseError) {
        console.error(`[Missing] Content parse error:`, parseError);
        console.error(`[Missing] Raw content (first 500 chars):`, contentText.substring(0, 500));
        throw new Error(`Failed to parse content JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      lastWordCount = countWords(contentJson.detailed_content || '');
      console.log(`[Missing] ━━━ Attempt ${attempts}: ${lastWordCount} words ━━━`);
      
      if (lastWordCount >= 1200) {
        console.log(`[Missing] ✅ Word count requirement met!`);
        break;
      }
      
      if (attempts < maxAttempts) {
        console.warn(`[Missing] ⚠️ Word count ${lastWordCount} below 1200, will retry...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.error(`[Missing] ❌ Failed to reach 1200 words after ${maxAttempts} attempts (final: ${lastWordCount})`);
      }
    }

    // HARD FAIL: If still under 1000 words, reject the article
    if (lastWordCount < 1000) {
      throw new Error(`Article generation failed: Could not reach minimum word count after ${maxAttempts} attempts (only ${lastWordCount} words). Article rejected.`);
    }
    
    article.detailed_content = contentJson.detailed_content || contentJson.content || '';
    article.meta_title = (contentJson.meta_title || plan.headline).substring(0, 60);
    article.meta_description = (contentJson.meta_description || '').substring(0, 160);
    article.speakable_answer = contentJson.speakable_answer || '';
    article.qa_entities = contentJson.qa_entities || contentJson.faqs || [];
    
    // Use placeholder image (DALL-E takes too long and causes edge function timeout)
    console.log(`[Missing] Using placeholder image to avoid timeout`);
    article.featured_image_url = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1792&h=1024&fit=crop';
    article.featured_image_alt = `${plan.headline} - Costa del Sol real estate`;

    // Author & Reviewer
    const randomAuthor = authors?.[Math.floor(Math.random() * (authors?.length || 1))] || { id: null };
    const randomReviewer = authors?.filter(a => a.id !== randomAuthor.id)?.[0] || randomAuthor;
    article.author_id = randomAuthor.id;
    article.reviewer_id = randomReviewer.id;

    // Cluster metadata - USE THE GAP-FILLING cluster_number
    article.cluster_id = clusterId;
    article.cluster_number = nextClusterNumber;
    article.cluster_theme = cluster.topic;
    article.date_published = new Date().toISOString();
    article.date_modified = new Date().toISOString();

    // Assign hreflang_group_id - check if existing articles with same cluster_number have one
    const { data: siblingArticle } = await supabase
      .from('blog_articles')
      .select('hreflang_group_id')
      .eq('cluster_id', clusterId)
      .eq('cluster_number', nextClusterNumber)
      .not('hreflang_group_id', 'is', null)
      .limit(1)
      .single();

    article.hreflang_group_id = siblingArticle?.hreflang_group_id || crypto.randomUUID();
    console.log(`[Missing] Assigned hreflang_group_id: ${article.hreflang_group_id}`);

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

    if (saveError) {
      console.error(`[Missing] DB insert error:`, saveError);
      throw new Error(`Failed to save article: ${saveError.message}`);
    }

    console.log(`[Missing] ✅ Article saved: ${savedArticle.id} (cluster_number: ${nextClusterNumber})`);

    // Check if cluster is now complete (6 source articles) and update status
    const { count: finalCount } = await supabase
      .from('blog_articles')
      .select('id', { count: 'exact', head: true })
      .eq('cluster_id', clusterId)
      .eq('language', sourceLanguage);

    console.log(`[Missing] Final article count for source language: ${finalCount}`);

    if (finalCount && finalCount >= 6) {
      const { error: updateError } = await supabase
        .from('cluster_generations')
        .update({ 
          status: 'partial',  // Changed from 'completed' - translations still needed
          progress: {
            saved_articles: finalCount,
            timeout_stopped: false,
            message: 'Source articles complete. Ready for translation.',
            source_complete: true,
            needs_translation: true
          }
        })
        .eq('id', clusterId);

      if (updateError) {
        console.error(`[Missing] Failed to update cluster status:`, updateError);
      } else {
        console.log(`[Missing] ✅ Updated cluster status to 'partial' (ready for translation)`);
      }
    }

    // CHUNKED RESPONSE: Return remaining count so frontend knows to call again
    const remaining = totalMissing - 1;

    return new Response(JSON.stringify({
      success: true,
      message: `Generated 1 article. ${remaining} remaining.`,
      generated: 1,
      remaining: remaining,
      articleId: savedArticle.id,
      articleHeadline: article.headline,
      existing: existingByStage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Missing] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      generated: 0,
      remaining: 0,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
