import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHUNK_SIZE = 3; // Articles per chunk
const MAX_CHUNK_RUNTIME = 4 * 60 * 1000; // 4 minutes per chunk (safety margin)

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Helper function to filter citations against approved domains
async function filterCitations(
  supabase: any,
  citations: any[],
  jobId: string,
  articleNum: number
): Promise<{ filtered: any[]; blocked: any[] }> {
  if (!citations || citations.length === 0) {
    return { filtered: citations, blocked: [] };
  }

  const { data: approvedDomains, error } = await supabase
    .from('approved_domains')
    .select('domain')
    .eq('is_allowed', true);

  if (error) {
    console.error(`[Job ${jobId}] Error fetching approved domains:`, error);
    return { filtered: citations, blocked: [] };
  }

  const approvedSet = new Set(
    (approvedDomains || []).map((d: any) => d.domain.toLowerCase())
  );

  const filtered: any[] = [];
  const blocked: any[] = [];

  for (const citation of citations) {
    const domain = extractDomain(citation.url);
    if (approvedSet.has(domain.toLowerCase())) {
      filtered.push(citation);
    } else {
      blocked.push({ domain, url: citation.url, source: citation.source || citation.sourceName });
    }
  }

  if (blocked.length > 0) {
    console.warn(`[Job ${jobId}] Blocked ${blocked.length} citations for article ${articleNum}`);
  }

  return { filtered, blocked };
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
  const contentLower = article.detailed_content.toLowerCase();
  const mentionedWords = headlineWords.filter((w: string) => contentLower.includes(w)).length;
  
  if (mentionedWords < headlineWords.length * 0.5) {
    issues.push('Content may not fully address headline topic');
    score -= 15;
  }
  
  if (plan.targetKeyword && !contentLower.includes(plan.targetKeyword.toLowerCase())) {
    issues.push('Target keyword not found in content');
    score -= 10;
  }
  
  const h2Count = (article.detailed_content.match(/<h2>/gi) || []).length;
  if (h2Count < 4) {
    issues.push('Insufficient content structure (need 4+ H2 headings)');
    score -= 10;
  }
  
  const wordCount = countWords(article.detailed_content);
  
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

// Generate a single article
async function generateSingleArticle(
  supabase: any,
  openaiKey: string,
  plan: any,
  articleIndex: number,
  jobId: string,
  clusterId: string,
  language: string,
  masterPrompt: string,
  authors: any[],
  categories: any[],
  clusterTopic: string
): Promise<{ articleId: string | null; error: string | null }> {
  const OPENAI_API_KEY = openaiKey;
  
  console.log(`\n[Chunk ${jobId}] Generating article ${articleIndex + 1}: "${plan.headline}"`);
  
  try {
    const article: any = {
      funnel_stage: plan.funnelStage,
      language,
      status: 'draft',
      headline: plan.headline,
      slug: plan.headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    };

    // 1. CATEGORY SELECTION with JSON mode
    const validCategoryNames = (categories || []).map(c => c.name);
    const categoryPrompt = `Select the most appropriate category for this article.

Available categories:
${validCategoryNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Article: ${plan.headline}
Keyword: ${plan.targetKeyword}
Funnel Stage: ${plan.funnelStage}

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
        console.warn(`[Chunk ${jobId}] Category parse failed, using default`);
      }
    }
    article.category = finalCategory;

    // 2. MAIN CONTENT GENERATION with JSON mode and word count enforcement
    const languageName = { 'en': 'English', 'de': 'German', 'nl': 'Dutch', 'fr': 'French', 'pl': 'Polish', 'sv': 'Swedish', 'da': 'Danish', 'hu': 'Hungarian', 'fi': 'Finnish', 'no': 'Norwegian' }[language] || 'English';

    // Build base prompt from master prompt
    let basePrompt = masterPrompt 
      ? masterPrompt
          .replace(/\{\{headline\}\}/g, plan.headline)
          .replace(/\{\{targetKeyword\}\}/g, plan.targetKeyword || '')
          .replace(/\{\{contentAngle\}\}/g, plan.contentAngle || '')
          .replace(/\{\{funnelStage\}\}/g, plan.funnelStage || '')
          .replace(/\{\{language\}\}/g, language)
          .replace(/\{\{languageName\}\}/g, languageName)
      : `Write a comprehensive article about "${plan.headline}" targeting the keyword "${plan.targetKeyword}".`;

    // ALWAYS wrap in JSON requirements with STRICT word count
    const contentPrompt = `${basePrompt}

CRITICAL WORD COUNT REQUIREMENT: The article MUST be between 1,500 and 2,500 words. Count your words carefully.
- Minimum: 1,500 words (articles under this will be REJECTED)
- Target: 1,800-2,000 words (ideal range)
- Maximum: 2,500 words

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
    const maxAttempts = 3;
    let lastWordCount = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`[Chunk ${jobId}] Content generation attempt ${attempts}/${maxAttempts}...`);
      
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
        console.error(`[Chunk ${jobId}] Content API error:`, errorText.substring(0, 500));
        throw new Error(`Content generation failed: ${contentResponse.status}`);
      }

      const contentData = await contentResponse.json();
      const contentText = contentData.choices?.[0]?.message?.content || '';

      if (!contentText.trim()) {
        throw new Error('OpenAI returned empty content response');
      }

      try {
        contentJson = extractJsonFromResponse(contentText);
      } catch (e) {
        console.error(`[Chunk ${jobId}] Content parse failed:`, e);
        console.error(`[Chunk ${jobId}] Raw content (first 500 chars):`, contentText.substring(0, 500));
        throw new Error(`Failed to parse content JSON: ${e instanceof Error ? e.message : String(e)}`);
      }

      lastWordCount = countWords(contentJson.detailed_content || '');
      console.log(`[Chunk ${jobId}] ━━━ Attempt ${attempts}: ${lastWordCount} words ━━━`);
      
      if (lastWordCount >= 1500) {
        console.log(`[Chunk ${jobId}] ✅ Word count requirement met!`);
        break;
      }
      
      if (attempts < maxAttempts) {
        console.warn(`[Chunk ${jobId}] ⚠️ Word count ${lastWordCount} below 1500, will retry...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        console.error(`[Chunk ${jobId}] ❌ Failed to reach 1500 words after ${maxAttempts} attempts (final: ${lastWordCount})`);
      }
    }

    // HARD FAIL: If still under 1200 words, reject the article
    if (lastWordCount < 1200) {
      throw new Error(`Article generation failed: Could not reach minimum word count after ${maxAttempts} attempts (only ${lastWordCount} words). Article rejected.`);
    }

    article.detailed_content = contentJson.detailed_content || contentJson.content || '';
    article.meta_title = (contentJson.meta_title || plan.headline).substring(0, 60);
    article.meta_description = (contentJson.meta_description || '').substring(0, 160);
    article.speakable_answer = contentJson.speakable_answer || '';
    article.qa_entities = contentJson.qa_entities || contentJson.faqs || [];
    article.cluster_theme = clusterTopic || '';

    // 3. FEATURED IMAGE
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

    // 4. AUTHOR & REVIEWER
    const randomAuthor = authors?.[Math.floor(Math.random() * (authors?.length || 1))] || { id: null };
    const randomReviewer = authors?.filter(a => a.id !== randomAuthor.id)?.[0] || randomAuthor;
    article.author_id = randomAuthor.id;
    article.reviewer_id = randomReviewer.id;

    // 5. SET CLUSTER METADATA
    article.cluster_id = clusterId;
    article.cluster_number = articleIndex + 1;
    article.date_published = new Date().toISOString();
    article.date_modified = new Date().toISOString();

    // 6. QUALITY VALIDATION
    const quality = validateContentQuality(article, plan);
    console.log(`[Chunk ${jobId}] Article ${articleIndex + 1} quality: ${quality.score}/100`);
    if (quality.issues.length > 0) {
      console.warn(`[Chunk ${jobId}] Quality issues:`, quality.issues);
    }

    // 7. SAVE TO DATABASE
    const { data: savedArticle, error: saveError } = await supabase
      .from('blog_articles')
      .insert(article)
      .select('id')
      .single();

    if (saveError) {
      throw new Error(`Failed to save article: ${saveError.message}`);
    }

    console.log(`[Chunk ${jobId}] ✅ Article ${articleIndex + 1} saved: ${savedArticle.id}`);
    return { articleId: savedArticle.id, error: null };

  } catch (error) {
    console.error(`[Chunk ${jobId}] ❌ Article ${articleIndex + 1} failed:`, error);
    return { articleId: null, error: error instanceof Error ? error.message : String(error) };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const FUNCTION_START = Date.now();

  try {
    const { jobId, chunkIndex, articleStructures } = await req.json();

    if (!jobId || chunkIndex === undefined || !articleStructures) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate which articles this chunk handles
    const startIdx = chunkIndex * CHUNK_SIZE;
    const endIdx = Math.min(startIdx + CHUNK_SIZE, articleStructures.length);
    const chunkArticles = articleStructures.slice(startIdx, endIdx);

    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  CHUNK ${chunkIndex + 1} - Articles ${startIdx + 1}-${endIdx}/${articleStructures.length}  ║`);
    console.log(`╚════════════════════════════════════════╝`);
    console.log(`[Chunk] Job: ${jobId}`);
    console.log(`[Chunk] Processing ${chunkArticles.length} articles\n`);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('cluster_generations')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobId}`);
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

    // Process articles in this chunk
    const savedIds: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < chunkArticles.length; i++) {
      const globalIndex = startIdx + i;
      const plan = chunkArticles[i];

      // Update progress
      await supabase
        .from('cluster_generations')
        .update({
          progress: {
            current_step: globalIndex + 2,
            total_steps: articleStructures.length + 2,
            current_article: globalIndex + 1,
            total_articles: articleStructures.length,
            message: `Generating article ${globalIndex + 1}/${articleStructures.length}: ${plan.headline.substring(0, 40)}...`,
            chunk: chunkIndex + 1,
            total_chunks: Math.ceil(articleStructures.length / CHUNK_SIZE),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      const result = await generateSingleArticle(
        supabase,
        OPENAI_API_KEY,
        plan,
        globalIndex,
        jobId,
        jobId, // cluster_id = job_id
        job.language || 'en',
        masterPrompt,
        authors || [],
        categories || [],
        job.topic || ''
      );

      if (result.articleId) {
        savedIds.push(result.articleId);
      } else {
        errors.push(`Article ${globalIndex + 1}: ${result.error}`);
      }

      // Check if we're running out of time
      if (Date.now() - FUNCTION_START > MAX_CHUNK_RUNTIME) {
        console.warn(`[Chunk] ⚠️ Approaching timeout, stopping early`);
        break;
      }
    }

    // Determine if there are more chunks
    const hasMoreChunks = endIdx < articleStructures.length;
    const nextChunkIndex = chunkIndex + 1;

    // Update job with saved articles
    const existingArticles = job.articles || [];
    const allSavedArticles = [...existingArticles, ...savedIds];

    await supabase
      .from('cluster_generations')
      .update({
        articles: allSavedArticles,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`\n[Chunk] ✅ Chunk ${chunkIndex + 1} complete`);
    console.log(`[Chunk] Saved: ${savedIds.length}, Errors: ${errors.length}`);
    console.log(`[Chunk] Total saved so far: ${allSavedArticles.length}/${articleStructures.length}`);

    // Fire next chunk if needed (fire-and-forget)
    if (hasMoreChunks) {
      console.log(`[Chunk] 🔥 Firing chunk ${nextChunkIndex + 1}...`);
      
      fetch(`${SUPABASE_URL}/functions/v1/generate-cluster-chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          jobId,
          chunkIndex: nextChunkIndex,
          articleStructures,
        }),
      }).catch(err => console.error('[Chunk] Fire-and-forget error:', err));

      return new Response(JSON.stringify({
        success: true,
        chunkIndex,
        savedArticles: savedIds.length,
        totalSaved: allSavedArticles.length,
        hasMoreChunks: true,
        nextChunk: nextChunkIndex,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // All chunks complete - finalize job
    console.log(`[Chunk] 🎉 All chunks complete! Finalizing job...`);

    const finalStatus = allSavedArticles.length === articleStructures.length ? 'completed' : 'partial';
    
    await supabase
      .from('cluster_generations')
      .update({
        status: finalStatus,
        completion_note: `${allSavedArticles.length}/${articleStructures.length} articles generated via chunked processing.`,
        progress: {
          current_step: articleStructures.length + 2,
          total_steps: articleStructures.length + 2,
          current_article: articleStructures.length,
          total_articles: articleStructures.length,
          message: finalStatus === 'completed' 
            ? `✅ Cluster complete: ${allSavedArticles.length} articles generated.`
            : `⚠️ Partial: ${allSavedArticles.length}/${articleStructures.length} articles.`,
          chunked: true,
          total_chunks: Math.ceil(articleStructures.length / CHUNK_SIZE),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    return new Response(JSON.stringify({
      success: true,
      chunkIndex,
      savedArticles: savedIds.length,
      totalSaved: allSavedArticles.length,
      hasMoreChunks: false,
      status: finalStatus,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Chunk] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
