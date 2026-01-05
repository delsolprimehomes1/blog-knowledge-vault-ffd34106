import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
  
  if (plan.targetKeyword && !contentLower.includes(plan.targetKeyword.toLowerCase())) {
    issues.push('Target keyword not found in content');
    score -= 10;
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
  categories: any[]
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

    // 1. CATEGORY SELECTION
    const validCategoryNames = (categories || []).map(c => c.name);
    const categoryPrompt = `Select the most appropriate category for this article from this EXACT list:
${validCategoryNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Article: ${plan.headline}
Keyword: ${plan.targetKeyword}
Funnel Stage: ${plan.funnelStage}

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

    // 2. MAIN CONTENT GENERATION
    const languageName = { 'en': 'English', 'de': 'German', 'nl': 'Dutch', 'fr': 'French', 'pl': 'Polish', 'sv': 'Swedish', 'da': 'Danish', 'hu': 'Hungarian', 'fi': 'Finnish', 'no': 'Norwegian' }[language] || 'English';

    const contentPrompt = masterPrompt 
      ? masterPrompt
          .replace(/\{\{headline\}\}/g, plan.headline)
          .replace(/\{\{targetKeyword\}\}/g, plan.targetKeyword || '')
          .replace(/\{\{contentAngle\}\}/g, plan.contentAngle || '')
          .replace(/\{\{funnelStage\}\}/g, plan.funnelStage || '')
          .replace(/\{\{language\}\}/g, language)
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

    if (!contentResponse.ok) {
      throw new Error(`Content generation failed: ${contentResponse.status}`);
    }

    const contentData = await contentResponse.json();
    const contentText = contentData.choices?.[0]?.message?.content || '';

    // Parse content JSON
    let contentJson;
    try {
      const cleaned = contentText.replace(/```json\n?|\n?```|```\n?/g, '').trim();
      contentJson = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned);
    } catch (e) {
      throw new Error(`Failed to parse content JSON: ${e}`);
    }

    article.detailed_content = contentJson.detailed_content || contentJson.content || '';
    article.meta_title = (contentJson.meta_title || plan.headline).substring(0, 60);
    article.meta_description = (contentJson.meta_description || '').substring(0, 160);
    article.speakable_answer = contentJson.speakable_answer || '';
    article.qa_entities = contentJson.qa_entities || contentJson.faqs || [];

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
        categories || []
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
