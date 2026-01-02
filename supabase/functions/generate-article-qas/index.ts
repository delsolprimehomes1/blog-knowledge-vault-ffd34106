import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  nl: 'Dutch',
  fr: 'French',
  pl: 'Polish',
  sv: 'Swedish',
  da: 'Danish',
  hu: 'Hungarian',
  fi: 'Finnish',
  no: 'Norwegian',
};

const NON_ENGLISH_LANGUAGES = ['de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];

// 4 Q&A types per article - realistic buyer questions
const QA_TYPES = [
  { id: 'pitfalls', prompt: 'PITFALLS question - What common mistakes, pitfalls, or traps should buyers avoid?' },
  { id: 'costs', prompt: 'HIDDEN COSTS question - What unexpected or hidden costs should buyers know about?' },
  { id: 'process', prompt: 'PROCESS question - How does the buying/application process work step by step?' },
  { id: 'legal', prompt: 'LEGAL/REGULATORY question - What legal requirements, regulations, or documentation is needed?' },
];

// Timeout threshold - save progress before edge function times out (2.5 min with 30s buffer)
const TIMEOUT_THRESHOLD_MS = 150000;

// AI request timeout (60 seconds for generation, 45 seconds for translation)
const GENERATE_TIMEOUT_MS = 60000;
const TRANSLATE_TIMEOUT_MS = 45000;

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error: unknown) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Repair malformed JSON from AI responses
 */
function repairJSON(text: string): string {
  let fixed = text;
  // Remove trailing commas before closing braces/brackets
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  // Fix common Unicode issues
  fixed = fixed.replace(/[\u201C\u201D]/g, '"');
  fixed = fixed.replace(/[\u2018\u2019]/g, "'");
  // Remove control characters
  fixed = fixed.replace(/[\x00-\x1F\x7F]/g, '');
  return fixed;
}

/**
 * Parse JSON with repair attempts and enhanced logging
 */
function parseJSONSafe(content: string): any | null {
  if (!content || content.trim() === '') {
    console.error('[ParseJSON] Empty content received');
    return null;
  }
  
  // Clean markdown fences
  let cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  
  if (start === -1 || end === -1) {
    console.error('[ParseJSON] No JSON object found in response');
    console.error('[ParseJSON] Content preview:', cleaned.substring(0, 300));
    return null;
  }
  
  const jsonStr = cleaned.slice(start, end + 1);
  
  // Try direct parse first
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('[ParseJSON] Direct parse failed:', (e as Error).message);
    // Try with repairs
    try {
      return JSON.parse(repairJSON(jsonStr));
    } catch (e2) {
      console.error('[ParseJSON] Repair parse failed:', (e2 as Error).message);
      console.error('[ParseJSON] Failed JSON preview:', jsonStr.substring(0, 500));
      return null;
    }
  }
}

/**
 * Generate original English Q&A content
 */
async function generateEnglishQA(
  sourceContent: { headline: string; content: string; topic: string },
  qaType: { id: string; prompt: string },
  apiKey: string
): Promise<any | null> {
  const prompt = `Generate a Q&A page in English about Costa del Sol real estate.

Q&A TYPE: ${qaType.prompt}

ARTICLE TOPIC: ${sourceContent.topic}
ARTICLE TITLE: ${sourceContent.headline}
ARTICLE SUMMARY: ${sourceContent.content.substring(0, 2000)}

REQUIREMENTS:
- Word count: 300-800 words
- Structure: Short answer (80-120 words) + 3-4 H3 sections + closing paragraph
- Tone: Neutral, factual, advisory (no "we", no marketing, no CTAs)
- NO links, NO bullet points in short answer
- Question must be specific to the article topic

Return ONLY valid JSON:
{
  "question_main": "Question ending with ?",
  "answer_main": "Complete markdown answer with H3 sections",
  "title": "Page title (50-60 chars)",
  "slug": "url-friendly-slug",
  "meta_title": "Meta title ≤60 chars",
  "meta_description": "Meta description ≤160 chars",
  "speakable_answer": "Voice-ready summary (50-80 words)"
}`;

  try {
    const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert Q&A content generator for Costa del Sol real estate. Write in English. Return valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 2500,
        response_format: { type: "json_object" },
      }),
    }, GENERATE_TIMEOUT_MS);

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        console.log('[Generate] Rate limited, waiting...');
        await new Promise(r => setTimeout(r, 10000));
        return null;
      }
      throw new Error(`API error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log(`[Generate] Raw response length: ${content.length}`);
    const parsed = parseJSONSafe(content);
    if (!parsed) throw new Error('Failed to parse JSON');
    return parsed;
    
  } catch (error) {
    console.error(`[Generate] Failed English/${qaType.id}:`, error);
    return null;
  }
}

/**
 * Translate English Q&A to target language (simpler, cheaper)
 */
async function translateQA(
  englishQA: {
    question_main: string;
    answer_main: string;
    meta_title: string;
    meta_description: string;
    speakable_answer: string;
    slug: string;
  },
  targetLanguage: string,
  apiKey: string
): Promise<any | null> {
  const languageName = LANGUAGE_NAMES[targetLanguage];
  
  const prompt = `Translate this Q&A content to ${languageName}.
Maintain the exact same meaning, structure, and formatting (markdown H3 headers, etc).
Create a URL-friendly slug in ${languageName} (lowercase, hyphens, no special chars).

English content:
Question: ${englishQA.question_main}
Answer: ${englishQA.answer_main}
Meta Title: ${englishQA.meta_title}
Meta Description: ${englishQA.meta_description}
Speakable Answer: ${englishQA.speakable_answer}

Return ONLY valid JSON:
{
  "question_main": "Translated question in ${languageName} ending with ?",
  "answer_main": "Translated markdown answer in ${languageName}",
  "meta_title": "Translated meta title ≤60 chars",
  "meta_description": "Translated meta description ≤160 chars",
  "speakable_answer": "Translated voice summary (50-80 words)",
  "slug": "translated-url-slug-${targetLanguage}"
}`;

  try {
    const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are a professional translator. Translate accurately to ${languageName}. Return valid JSON only.` 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 2500,
        response_format: { type: "json_object" },
      }),
    }, TRANSLATE_TIMEOUT_MS);

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        console.log(`[Translate] Rate limited for ${targetLanguage}, waiting...`);
        await new Promise(r => setTimeout(r, 10000));
        return null;
      }
      throw new Error(`API error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log(`[Translate] ${targetLanguage} response length: ${content.length}`);
    const parsed = parseJSONSafe(content);
    if (!parsed) throw new Error('Failed to parse JSON');
    return parsed;
    
  } catch (error) {
    console.error(`[Translate] Failed ${targetLanguage}:`, error);
    return null;
  }
}

/**
 * Translate with retry logic (3 attempts with exponential backoff)
 */
async function translateWithRetry(
  englishQA: any,
  targetLanguage: string,
  apiKey: string,
  maxRetries = 3
): Promise<any | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await translateQA(englishQA, targetLanguage, apiKey);
    if (result) return result;
    
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`[Translate] Retry ${attempt}/${maxRetries} for ${targetLanguage} in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error(`[Translate] All ${maxRetries} attempts failed for ${targetLanguage}`);
  return null;
}

/**
 * Translate image alt text to target language
 */
async function translateAltText(altText: string, language: string): Promise<string> {
  if (language === 'en' || !altText) return altText;
  
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { role: 'system', content: `Translate to ${LANGUAGE_NAMES[language]}. Return ONLY the translation.` },
          { role: 'user', content: altText }
        ],
        max_completion_tokens: 100,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || altText;
    }
  } catch (err) {
    console.warn(`[Generate] Alt translation failed for ${language}:`, err);
  }
  return altText;
}

/**
 * Update job progress and trigger next article if needed
 */
async function updateJobAndContinue(
  supabase: any,
  jobId: string,
  articleIndex: number,
  articleResult: any,
  dryRun: boolean
) {
  // Get current job state
  const { data: job, error: jobError } = await supabase
    .from('qa_generation_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    console.error('[Continue] Failed to fetch job:', jobError);
    return;
  }

  const articleResults = [...(job.article_results || []), articleResult];
  const articlesCompleted = job.articles_completed + 1;
  const totalQAsCreated = job.total_qas_created + (articleResult.created || 0);
  const totalQAsFailed = job.total_qas_failed + (articleResult.failed || 0);
  const totalArticles = job.total_articles;
  const articleIds = job.article_ids || [];

  const isComplete = articlesCompleted >= totalArticles;
  const expectedTotal = totalArticles * 40;
  const completionPercent = Math.round((totalQAsCreated / expectedTotal) * 100);

  console.log(`[Continue] Job ${jobId}: ${articlesCompleted}/${totalArticles} articles, ${totalQAsCreated} Q&As`);

  // Update job with progress
  await supabase
    .from('qa_generation_jobs')
    .update({
      articles_completed: articlesCompleted,
      total_qas_created: totalQAsCreated,
      total_qas_failed: totalQAsFailed,
      article_results: articleResults,
      completion_percent: completionPercent,
      updated_at: new Date().toISOString(),
      resume_from_qa_type: null, // Clear any resume state
      ...(isComplete ? {
        status: 'completed',
        completed_at: new Date().toISOString(),
      } : {}),
    })
    .eq('id', jobId);

  if (isComplete) {
    console.log(`[Continue] ✅ Job ${jobId} COMPLETED! ${totalQAsCreated}/${expectedTotal} Q&As`);
    return;
  }

  // Trigger next article (self-continuation)
  const nextIndex = articleIndex + 1;
  const nextArticleId = articleIds[nextIndex];

  if (!nextArticleId) {
    console.error(`[Continue] No article at index ${nextIndex}`);
    return;
  }

  console.log(`[Continue] Firing article ${nextIndex + 1}/${totalArticles}...`);

  // Update job to show next article
  await supabase
    .from('qa_generation_jobs')
    .update({
      current_article_index: nextIndex,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  // Small delay before next article
  await new Promise(r => setTimeout(r, 3000));

  // Fire-and-forget next article
  fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-article-qas`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        englishArticleId: nextArticleId,
        jobId: jobId,
        articleIndex: nextIndex,
        dryRun,
      }),
    }
  ).catch(err => {
    console.error('[Continue] Fire-and-forget error (ignored):', err);
  });
}

/**
 * Graceful timeout handler - save progress and trigger self-continuation
 */
async function handleTimeoutSave(
  supabase: any,
  jobId: string,
  articleIndex: number,
  englishArticleId: string,
  resumeFromQAType: string,
  createdPages: any[],
  results: { created: number; failed: number; skipped: number },
  dryRun: boolean
) {
  console.log(`[Timeout] ⏰ Saving progress at ${resumeFromQAType} before timeout...`);
  
  // Insert any created pages so far
  if (!dryRun && createdPages.length > 0) {
    console.log(`[Timeout] Inserting ${createdPages.length} pages before save...`);
    const { error: insertError } = await supabase
      .from('qa_pages')
      .insert(createdPages);
    
    if (insertError) {
      console.error('[Timeout] Insert error during save:', insertError);
    }
  }

  // Update job with stalled status and resume point
  await supabase
    .from('qa_generation_jobs')
    .update({
      status: 'stalled',
      resume_from_qa_type: resumeFromQAType,
      current_article_index: articleIndex,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  console.log(`[Timeout] Triggering self-continuation for article ${articleIndex}, resume from ${resumeFromQAType}...`);

  // Fire self-continuation with resume point
  fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-article-qas`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        englishArticleId,
        jobId,
        articleIndex,
        resumeFromQAType,
        dryRun,
      }),
    }
  ).catch(err => {
    console.error('[Timeout] Fire-and-forget error (ignored):', err);
  });
}

/**
 * Main handler - English-first workflow:
 * 1. Generate 4 English Q&As (original content)
 * 2. Translate each to 9 languages
 * 3. Link each translation to its language's source article
 * 4. If jobId provided, update progress and trigger next article
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Track start time for timeout detection
  const startTime = Date.now();

  try {
    const { englishArticleId, jobId, articleIndex = 0, dryRun = false, resumeFromQAType } = await req.json();
    
    if (!englishArticleId) {
      return new Response(JSON.stringify({ error: 'englishArticleId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`[Generate] Starting English-first Q&A generation for: ${englishArticleId}`);
    if (jobId) {
      console.log(`[Generate] Part of job ${jobId}, article index ${articleIndex}`);
    }
    if (resumeFromQAType) {
      console.log(`[Generate] RESUMING from Q&A type: ${resumeFromQAType}`);
      
      // Mark job as running again (from stalled)
      if (jobId) {
        await supabase
          .from('qa_generation_jobs')
          .update({
            status: 'running',
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);
      }
    }

    // Get English article as source
    const { data: englishArticle, error: articleError } = await supabase
      .from('blog_articles')
      .select('id, headline, slug, detailed_content, meta_description, category, cluster_theme, cluster_id, hreflang_group_id, featured_image_url, featured_image_alt')
      .eq('id', englishArticleId)
      .eq('language', 'en')
      .single();

    if (articleError || !englishArticle) {
      const errorResult = { articleId: englishArticleId, success: false, error: 'Article not found', created: 0, failed: 40 };
      if (jobId) {
        await updateJobAndContinue(supabase, jobId, articleIndex, errorResult, dryRun);
      }
      return new Response(JSON.stringify({ 
        error: 'English article not found',
        englishArticleId 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Generate] Source: ${englishArticle.headline}`);
    console.log(`[Generate] Cluster: ${englishArticle.cluster_id}`);

    // Update job with current article headline
    if (jobId) {
      await supabase
        .from('qa_generation_jobs')
        .update({
          current_article_headline: englishArticle.headline,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    // Get ALL sibling articles in all languages for this article's hreflang group
    const articlesByLang: Record<string, any> = { en: englishArticle };
    
    if (englishArticle.hreflang_group_id) {
      const { data: siblings } = await supabase
        .from('blog_articles')
        .select('id, language, slug, headline, featured_image_url, featured_image_alt')
        .eq('hreflang_group_id', englishArticle.hreflang_group_id)
        .eq('status', 'published');
      
      for (const sibling of siblings || []) {
        articlesByLang[sibling.language] = sibling;
      }
    } else {
      // Fallback: match by cluster_id
      const { data: siblings } = await supabase
        .from('blog_articles')
        .select('id, language, slug, headline, featured_image_url, featured_image_alt')
        .eq('cluster_id', englishArticle.cluster_id)
        .eq('status', 'published');
      
      for (const sibling of siblings || []) {
        if (!articlesByLang[sibling.language]) {
          articlesByLang[sibling.language] = sibling;
        }
      }
    }

    console.log(`[Generate] Found sibling articles in: ${Object.keys(articlesByLang).join(', ')}`);

    // Check for existing Q&As for this article to enable continuation
    const { data: existingQAs } = await supabase
      .from('qa_pages')
      .select('qa_type, language')
      .eq('source_article_id', englishArticle.id);
    
    const existingSet = new Set(
      (existingQAs || []).map(qa => `${qa.qa_type}:${qa.language}`)
    );
    console.log(`[Generate] Found ${existingQAs?.length || 0} existing Q&As for this article`);

    const sourceContent = {
      headline: englishArticle.headline,
      content: englishArticle.detailed_content || englishArticle.meta_description || '',
      topic: englishArticle.cluster_theme || englishArticle.headline,
    };

    const results = {
      created: 0,
      failed: 0,
      skipped: 0,
      qaPages: [] as any[],
      hreflangGroups: [] as string[],
    };

    // Determine which Q&A types to process (for resume support)
    let startProcessing = !resumeFromQAType;

    // Process 4 Q&A types
    for (const qaType of QA_TYPES) {
      // Resume support: skip types until we reach the resume point
      if (resumeFromQAType && qaType.id === resumeFromQAType) {
        startProcessing = true;
        console.log(`[Generate] Resuming from ${qaType.id}`);
      }
      if (!startProcessing) {
        console.log(`[Generate] Skipping ${qaType.id} (already processed before timeout)`);
        continue;
      }

      // Check for timeout BEFORE starting expensive operations
      const elapsed = Date.now() - startTime;
      if (elapsed > TIMEOUT_THRESHOLD_MS && jobId) {
        console.log(`[Generate] ⏰ Timeout approaching (${elapsed}ms elapsed) - saving progress...`);
        await handleTimeoutSave(
          supabase,
          jobId,
          articleIndex,
          englishArticleId,
          qaType.id,
          results.qaPages,
          results,
          dryRun
        );
        
        return new Response(JSON.stringify({
          success: true,
          partial: true,
          reason: 'timeout_save',
          resumeFromQAType: qaType.id,
          created: results.created,
          message: `Saved progress, continuing from ${qaType.id}...`,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Check if English Q&A for this type already exists
      if (existingSet.has(`${qaType.id}:en`)) {
        console.log(`[Generate] Skipping ${qaType.id} - already exists for this article`);
        results.skipped += 10;
        continue;
      }
      
      console.log(`\n[Generate] ===== Starting ${qaType.id} =====`);
      
      // Step 1: Generate English Q&A (original content)
      const englishQA = await generateEnglishQA(sourceContent, qaType, '');
      
      if (!englishQA) {
        console.error(`[Generate] Failed to generate English ${qaType.id}`);
        results.failed += 10; // All 10 languages fail if English fails
        continue;
      }

      console.log(`[Generate] ✅ English ${qaType.id} generated: "${englishQA.question_main?.substring(0, 50)}..."`);

      // Create shared hreflang_group_id for this Q&A type
      const hreflangGroupId = crypto.randomUUID();
      results.hreflangGroups.push(hreflangGroupId);

      const languageSlugs: Record<string, string> = {};
      const createdPages: any[] = [];

      // Step 2: Create English page with UNIQUE slug (UUID suffix prevents collisions)
      const englishUniqueId = crypto.randomUUID().slice(0, 8);
      const englishSlug = `${englishQA.slug || qaType.id}-en-${englishUniqueId}`.replace(/--+/g, '-').substring(0, 80);
      languageSlugs['en'] = englishSlug;

      const englishPageData = {
        source_article_id: englishArticle.id,
        source_article_slug: englishArticle.slug,
        cluster_id: englishArticle.cluster_id,
        language: 'en',
        source_language: 'en',
        hreflang_group_id: hreflangGroupId,
        qa_type: qaType.id,
        title: englishQA.title || englishQA.question_main,
        slug: englishSlug,
        canonical_url: `https://www.delsolprimehomes.com/en/qa/${englishSlug}`,
        question_main: englishQA.question_main,
        answer_main: englishQA.answer_main,
        related_qas: [],
        speakable_answer: englishQA.speakable_answer,
        meta_title: (englishQA.meta_title || '').substring(0, 60),
        meta_description: (englishQA.meta_description || '').substring(0, 160),
        featured_image_url: englishArticle.featured_image_url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200',
        featured_image_alt: englishArticle.featured_image_alt || 'Costa del Sol property',
        category: englishArticle.category || 'Real Estate',
        status: 'published',
        translations: {},
      };
      
      createdPages.push(englishPageData);
      results.created++;

      // Rate limiting delay
      await new Promise(r => setTimeout(r, 1000));

      // Step 3: Translate to 9 other languages (with retry)
      for (const lang of NON_ENGLISH_LANGUAGES) {
        // Check timeout before each translation
        const translationElapsed = Date.now() - startTime;
        if (translationElapsed > TIMEOUT_THRESHOLD_MS && jobId) {
          console.log(`[Generate] ⏰ Timeout during ${qaType.id}/${lang} - saving progress...`);
          
          // Save pages created so far (including partial translations)
          for (const page of createdPages) {
            page.translations = { ...languageSlugs };
          }
          
          if (!dryRun && createdPages.length > 0) {
            const { error: insertError } = await supabase
              .from('qa_pages')
              .insert(createdPages);
            if (insertError) {
              console.error('[Timeout] Insert error:', insertError);
            }
          }
          
          // Continue from next Q&A type (this one is partial, will be skipped on resume)
          const nextQATypeIndex = QA_TYPES.findIndex(q => q.id === qaType.id) + 1;
          const nextQAType = QA_TYPES[nextQATypeIndex]?.id || null;
          
          if (nextQAType) {
            await handleTimeoutSave(
              supabase,
              jobId,
              articleIndex,
              englishArticleId,
              nextQAType,
              [],
              results,
              dryRun
            );
          }
          
          return new Response(JSON.stringify({
            success: true,
            partial: true,
            reason: 'timeout_during_translation',
            created: results.created,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        console.log(`[Translate] Translating ${qaType.id} to ${lang}...`);
        
        const translatedQA = await translateWithRetry({
          question_main: englishQA.question_main,
          answer_main: englishQA.answer_main,
          meta_title: englishQA.meta_title || '',
          meta_description: englishQA.meta_description || '',
          speakable_answer: englishQA.speakable_answer || '',
          slug: englishQA.slug || qaType.id,
        }, lang, '', 3);
        if (translatedQA) {
          const langArticle = articlesByLang[lang];
          
          // Generate UNIQUE slug with UUID suffix to prevent collisions
          const langUniqueId = crypto.randomUUID().slice(0, 8);
          const langSlug = `${translatedQA.slug || `${qaType.id}-${lang}`}`.replace(/--+/g, '-').substring(0, 70);
          const finalSlug = langSlug.endsWith(`-${lang}`) 
            ? `${langSlug}-${langUniqueId}` 
            : `${langSlug}-${lang}-${langUniqueId}`;
          languageSlugs[lang] = finalSlug;

          // Use article's existing translated alt text (no AI call needed - 50% reduction!)
          const translatedAlt = langArticle?.featured_image_alt || englishArticle.featured_image_alt || 'Costa del Sol property';

          const pageData = {
            source_article_id: langArticle?.id || englishArticle.id,
            source_article_slug: langArticle?.slug || englishArticle.slug,
            cluster_id: englishArticle.cluster_id,
            language: lang,
            source_language: 'en',
            hreflang_group_id: hreflangGroupId,
            qa_type: qaType.id,
            title: translatedQA.question_main,
            slug: finalSlug,
            canonical_url: `https://www.delsolprimehomes.com/${lang}/qa/${finalSlug}`,
            question_main: translatedQA.question_main,
            answer_main: translatedQA.answer_main,
            related_qas: [],
            speakable_answer: translatedQA.speakable_answer,
            meta_title: (translatedQA.meta_title || '').substring(0, 60),
            meta_description: (translatedQA.meta_description || '').substring(0, 160),
            featured_image_url: langArticle?.featured_image_url || englishArticle.featured_image_url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200',
            featured_image_alt: translatedAlt,
            category: englishArticle.category || 'Real Estate',
            status: 'published',
            translations: {},
          };

          createdPages.push(pageData);
          results.created++;
          
          console.log(`[Translate] ✅ ${lang} complete`);
        } else {
          results.failed++;
          console.error(`[Translate] ❌ Failed ${lang}/${qaType.id}`);
        }

        // Rate limiting delay between translations
        await new Promise(r => setTimeout(r, 800));
      }

      // Step 4: Update all pages with complete translations JSONB (including self-reference)
      for (const page of createdPages) {
        page.translations = { ...languageSlugs };
      }

      // Step 5: Insert all pages for this Q&A type (with slug deduplication)
      if (!dryRun && createdPages.length > 0) {
        console.log(`[Generate] Inserting ${createdPages.length} pages for ${qaType.id}...`);
        
        // Check for existing slugs to prevent duplicate key errors
        const slugsToCheck = createdPages.map(p => p.slug);
        const { data: existingSlugs } = await supabase
          .from('qa_pages')
          .select('slug')
          .in('slug', slugsToCheck);
        
        const existingSlugSet = new Set(existingSlugs?.map(s => s.slug) || []);
        
        // Filter out pages with existing slugs
        const pagesToInsert = createdPages.filter(p => !existingSlugSet.has(p.slug));
        
        if (pagesToInsert.length === 0) {
          console.log(`[Generate] Skipping ${qaType.id} - all slugs already exist`);
          continue;
        }
        
        if (pagesToInsert.length < createdPages.length) {
          const skippedCount = createdPages.length - pagesToInsert.length;
          console.log(`[Generate] Filtered out ${skippedCount} duplicate slugs`);
          results.skipped += skippedCount;
          results.created -= skippedCount;
        }
        
        const { error: insertError, data: insertedData } = await supabase
          .from('qa_pages')
          .insert(pagesToInsert)
          .select('id, language, slug, hreflang_group_id');

        if (insertError) {
          console.error(`[Generate] Insert error for ${qaType.id}:`, insertError);
          results.created -= pagesToInsert.length;
          results.failed += pagesToInsert.length;
        } else {
          console.log(`[Generate] ✅ Inserted ${insertedData?.length || 0} pages for ${qaType.id}`);
          console.log(`[Generate] ✅ VERIFIED: ${qaType.id} group ${hreflangGroupId} has ${insertedData?.length || 0}/10 members`);
          results.qaPages.push(...pagesToInsert.map((p, i) => ({
            ...p,
            id: insertedData?.[i]?.id,
          })));
        }
      } else if (dryRun) {
        console.log(`[DryRun] Would insert ${createdPages.length} pages for ${qaType.id}`);
        results.qaPages.push(...createdPages);
      }

      // Delay between Q&A types
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\n[Generate] ===== Complete! =====`);
    console.log(`[Generate] Created: ${results.created}, Skipped: ${results.skipped}, Failed: ${results.failed}`);

    // If part of a job, update progress and trigger next article
    if (jobId) {
      const articleResult = {
        articleId: englishArticle.id,
        headline: englishArticle.headline,
        success: true,
        created: results.created,
        skipped: results.skipped,
        failed: results.failed,
        hreflangGroups: results.hreflangGroups,
      };
      
      // Use background processing to trigger next article
      // @ts-ignore
      EdgeRuntime.waitUntil(updateJobAndContinue(supabase, jobId, articleIndex, articleResult, dryRun));
    }

    return new Response(JSON.stringify({
      success: true,
      englishArticleId,
      articleHeadline: englishArticle.headline,
      clusterId: englishArticle.cluster_id,
      created: results.created,
      skipped: results.skipped,
      failed: results.failed,
      expected: QA_TYPES.length * 10, // 4 types × 10 languages = 40
      hreflangGroups: results.hreflangGroups,
      qaPages: results.qaPages.map(p => ({ 
        language: p.language, 
        qa_type: p.qa_type, 
        slug: p.slug,
        source_article_id: p.source_article_id,
        hreflang_group_id: p.hreflang_group_id,
        canonical_url: p.canonical_url,
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Generate] Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
