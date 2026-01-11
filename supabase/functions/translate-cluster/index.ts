import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { fal } from "https://esm.sh/@fal-ai/client@1.2.1";

// Configure Fal.ai
fal.config({
  credentials: Deno.env.get("FAL_KEY")
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate unique image for translated article
 */
async function generateUniqueImage(prompt: string, fallbackUrl: string): Promise<string> {
  try {
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt,
        image_size: "landscape_16_9",
        num_inference_steps: 4,
        num_images: 1
      }
    });
    
    if (result.data?.images?.[0]?.url) {
      console.log(`✅ Generated unique image`);
      return result.data.images[0].url;
    }
  } catch (error) {
    console.error(`⚠️ Image generation failed, using fallback:`, error);
  }
  return fallbackUrl;
}

const LANGUAGE_NAMES: Record<string, string> = {
  'de': 'German',
  'nl': 'Dutch',
  'fr': 'French',
  'pl': 'Polish',
  'sv': 'Swedish',
  'da': 'Danish',
  'hu': 'Hungarian',
  'fi': 'Finnish',
  'no': 'Norwegian'
};

const TARGET_LANGUAGES = ['de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];

const MAX_RUNTIME = 50 * 1000; // 50 seconds
const MAX_ARTICLES_PER_RUN = 4; // Increased from 2 - faster AI allows more
const MAX_RETRIES = 2;
const RECENT_LOCK_MS = 90 * 1000;

/**
 * Clean HTML content - remove markdown fences and normalize
 */
function cleanHtmlContent(html: string): string {
  if (!html) return '';
  return html
    .replace(/```html\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();
}

/**
 * Safely parse JSON from AI response
 */
function safeJsonParse(text: string, context: string): any {
  let cleanText = text.trim();
  cleanText = cleanText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
  
  try {
    return JSON.parse(cleanText);
  } catch (e1) {
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        throw new Error(`[${context}] JSON parse failed. First 500 chars: ${jsonMatch[0].slice(0, 500)}`);
      }
    }
    throw new Error(`[${context}] No valid JSON found. First 500 chars: ${cleanText.slice(0, 500)}`);
  }
}

/**
 * Call Lovable AI Gateway - 3-4x faster than direct OpenAI
 */
async function callAI(
  prompt: string,
  options: { maxTokens?: number; tools?: any[]; toolChoice?: any } = {}
): Promise<any> {
  const { maxTokens = 4000, tools, toolChoice } = options;
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }
  
  const body: any = {
    model: 'google/gemini-2.5-flash', // Fast & high quality
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
  };
  
  if (tools && tools.length > 0) {
    body.tools = tools;
    if (toolChoice) {
      body.tool_choice = toolChoice;
    }
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('AI rate limit exceeded. Please try again in a moment.');
    }
    if (response.status === 402) {
      throw new Error('AI credits exhausted. Please add credits to continue.');
    }
    throw new Error(`AI API error (${response.status}): ${responseText.slice(0, 500)}`);
  }
  
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`AI response is not valid JSON. Status: ${response.status}. First 500 chars: ${responseText.slice(0, 500)}`);
  }
  
  return data;
}

/**
 * Translate metadata using tool calling (structured output)
 */
async function translateMetadata(
  englishArticle: any,
  targetLanguage: string
): Promise<{
  headline: string;
  meta_title: string;
  meta_description: string;
  speakable_answer: string;
  featured_image_alt: string;
  featured_image_caption: string;
  qa_entities: any[];
}> {
  const targetLanguageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  const prompt = `Translate the following article metadata from English to ${targetLanguageName}.

Keep proper nouns like "Costa del Sol" unchanged. Keep brand names unchanged.
Translate naturally and professionally for a luxury real estate audience.

ENGLISH METADATA:
- Headline: ${englishArticle.headline}
- Meta Title: ${englishArticle.meta_title}
- Meta Description: ${englishArticle.meta_description}
- Speakable Answer: ${englishArticle.speakable_answer}
- Featured Image Alt: ${englishArticle.featured_image_alt}
- Featured Image Caption: ${englishArticle.featured_image_caption || 'N/A'}
- FAQs: ${JSON.stringify(englishArticle.qa_entities || [])}

Call the translate_metadata function with your translations.`;

  const tools = [{
    type: "function",
    function: {
      name: "translate_metadata",
      description: "Store the translated article metadata",
      parameters: {
        type: "object",
        properties: {
          headline: { type: "string", description: "Translated headline" },
          meta_title: { type: "string", description: "Translated meta title (max 60 chars)" },
          meta_description: { type: "string", description: "Translated meta description (max 160 chars)" },
          speakable_answer: { type: "string", description: "Translated speakable answer (50-80 words)" },
          featured_image_alt: { type: "string", description: "Translated alt text" },
          featured_image_caption: { type: "string", description: "Translated caption" },
          qa_entities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                answer: { type: "string" }
              },
              required: ["question", "answer"]
            },
            description: "Translated FAQ items"
          }
        },
        required: ["headline", "meta_title", "meta_description", "speakable_answer", "featured_image_alt", "qa_entities"]
      }
    }
  }];

  const data = await callAI(prompt, {
    maxTokens: 3000,
    tools,
    toolChoice: { type: "function", function: { name: "translate_metadata" } }
  });

  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    const content = data?.choices?.[0]?.message?.content;
    if (content) {
      return safeJsonParse(content, 'metadata-fallback');
    }
    throw new Error(`No tool call response. Raw: ${JSON.stringify(data).slice(0, 500)}`);
  }

  const args = typeof toolCall.function.arguments === 'string'
    ? JSON.parse(toolCall.function.arguments)
    : toolCall.function.arguments;

  return {
    headline: args.headline || englishArticle.headline,
    meta_title: args.meta_title || englishArticle.meta_title,
    meta_description: args.meta_description || englishArticle.meta_description,
    speakable_answer: args.speakable_answer || englishArticle.speakable_answer,
    featured_image_alt: args.featured_image_alt || englishArticle.featured_image_alt,
    featured_image_caption: args.featured_image_caption || englishArticle.featured_image_caption || '',
    qa_entities: args.qa_entities || englishArticle.qa_entities || []
  };
}

/**
 * Translate HTML content separately
 */
async function translateHtmlContent(
  englishHtml: string,
  targetLanguage: string
): Promise<string> {
  const targetLanguageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  const cleanedHtml = cleanHtmlContent(englishHtml);

  const prompt = `Translate the following HTML content from English to ${targetLanguageName}.

CRITICAL REQUIREMENTS:
- Keep ALL HTML tags intact (<h2>, <p>, <strong>, <a href="...">, <ul>, <li>, etc.)
- Keep all links (href attributes) unchanged
- Keep proper nouns like "Costa del Sol" unchanged
- Translate naturally for a luxury real estate audience
- Do NOT wrap your response in code fences or JSON
- Return ONLY the translated HTML, nothing else

HTML TO TRANSLATE:
${cleanedHtml}`;

  const data = await callAI(prompt, { maxTokens: 12000 });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Empty HTML translation response`);
  }

  return cleanHtmlContent(content);
}

/**
 * Translate article with PARALLEL metadata + content translation and retry logic
 */
async function translateArticleWithRetry(
  englishArticle: any,
  targetLanguage: string,
  retryCount = 0
): Promise<any> {
  const targetLanguageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  console.log(`[Translation] Translating "${englishArticle.headline}" to ${targetLanguageName} (attempt ${retryCount + 1})...`);

  try {
    // PARALLEL: Translate metadata AND content simultaneously
    const [metadata, translatedHtml] = await Promise.all([
      translateMetadata(englishArticle, targetLanguage),
      translateHtmlContent(englishArticle.detailed_content, targetLanguage)
    ]);

    // Generate slug from translated headline
    const slug = metadata.headline
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    const uniqueSlug = `${slug}-${englishArticle.cluster_number || 0}-${Math.random().toString(36).slice(2, 6)}`;

    const truncatedMetaDescription = String(metadata.meta_description ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    const truncatedMetaTitle = String(metadata.meta_title ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 70);

    // Generate unique image for this language article (NO headline text in prompt to avoid text baked into images)
    const sceneVariations = [
      'infinity pool overlooking Mediterranean sea',
      'panoramic mountain and sea views',
      'manicured Mediterranean garden with palm trees',
      'contemporary interior with floor-to-ceiling windows',
      'beachfront terrace at golden hour',
      'golf course villa setting',
      'rooftop terrace with sunset views',
      'luxury outdoor living space',
      'modern kitchen with marble countertops',
      'private courtyard with fountain'
    ];
    const randomScene = sceneVariations[Math.floor(Math.random() * sceneVariations.length)];
    const imagePrompt = `Professional Costa del Sol real estate photograph, luxury Mediterranean villa with ${randomScene}, bright natural lighting, Architectural Digest style, no text, no watermarks, no logos, clean composition, high-end marketing quality, ${targetLanguageName} market aesthetic`;
    const generatedImageUrl = await generateUniqueImage(imagePrompt, englishArticle.featured_image_url);

    return {
      language: targetLanguage,
      headline: metadata.headline,
      slug: uniqueSlug,
      meta_title: truncatedMetaTitle,
      meta_description: truncatedMetaDescription,
      speakable_answer: metadata.speakable_answer,
      detailed_content: translatedHtml,
      qa_entities: metadata.qa_entities,
      featured_image_alt: metadata.featured_image_alt,
      featured_image_caption: metadata.featured_image_caption || englishArticle.featured_image_caption,
      featured_image_url: generatedImageUrl,
      diagram_url: englishArticle.diagram_url,
      diagram_description: englishArticle.diagram_description,
      diagram_alt: englishArticle.diagram_alt,
      diagram_caption: englishArticle.diagram_caption,
      source_language: 'en',
      is_primary: false,
      hreflang_group_id: englishArticle.hreflang_group_id,
      cluster_id: englishArticle.cluster_id,
      cluster_number: englishArticle.cluster_number,
      cluster_theme: englishArticle.cluster_theme,
      funnel_stage: englishArticle.funnel_stage,
      category: englishArticle.category,
      content_type: englishArticle.content_type,
      read_time: englishArticle.read_time,
      author_id: englishArticle.author_id,
      reviewer_id: englishArticle.reviewer_id,
      external_citations: englishArticle.external_citations,
      internal_links: [],
    };
  } catch (error: any) {
    console.error(`[Translation] Attempt ${retryCount + 1} failed:`, error.message);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`[Translation] Retrying in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return translateArticleWithRetry(englishArticle, targetLanguage, retryCount + 1);
    }
    
    throw error;
  }
}

// Link translations together
async function linkTranslations(supabase: any, clusterId: string) {
  console.log(`[Link Translations] Starting for cluster ${clusterId}...`);
  
  const { data: articles, error } = await supabase
    .from('blog_articles')
    .select('id, language, slug, cluster_number, hreflang_group_id')
    .eq('cluster_id', clusterId)
    .order('cluster_number', { ascending: true });
  
  if (error || !articles?.length) {
    console.warn(`[Link Translations] No articles found for cluster ${clusterId}`);
    return;
  }
  
  console.log(`[Link Translations] Found ${articles.length} articles to link`);
  
  const groups: Record<number, Record<string, { id: string; slug: string }>> = {};
  for (const article of articles) {
    if (!groups[article.cluster_number]) {
      groups[article.cluster_number] = {};
    }
    groups[article.cluster_number][article.language] = {
      id: article.id,
      slug: article.slug,
    };
  }
  
  const updates: Array<{ id: string; translations: Record<string, string> }> = [];
  for (const article of articles) {
    const siblings: Record<string, string> = {};
    for (const [lang, data] of Object.entries(groups[article.cluster_number])) {
      if (lang !== article.language) {
        siblings[lang] = data.slug;
      }
    }
    updates.push({ id: article.id, translations: siblings });
  }
  
  const CONCURRENCY = 10;
  for (let i = 0; i < updates.length; i += CONCURRENCY) {
    const batch = updates.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(u => 
        supabase
          .from('blog_articles')
          .update({ translations: u.translations })
          .eq('id', u.id)
      )
    );
  }
  
  console.log(`[Link Translations] ✅ Complete: ${articles.length} articles linked`);
}

/**
 * Update job progress after each article for real-time UI
 */
async function updateArticleProgress(
  supabase: any, 
  jobId: string, 
  currentLanguage: string, 
  articleIndex: number, 
  expectedCount: number,
  totalArticlesInDb: number
) {
  await supabase
    .from('cluster_generations')
    .update({
      progress: {
        message: `Translating ${LANGUAGE_NAMES[currentLanguage] || currentLanguage}: article ${articleIndex}/${expectedCount}`,
        current_language: currentLanguage,
        current_article: articleIndex,
        articles_for_language: expectedCount,
        generated_articles: totalArticlesInDb,
        total_articles: 60,
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

/**
 * Update job progress with error info
 */
async function updateJobError(supabase: any, jobId: string, error: string, context: { language?: string; articleIndex?: number }) {
  const errorInfo = {
    last_error: error.slice(0, 500),
    failed_at: new Date().toISOString(),
    failed_language: context.language,
    failed_article_index: context.articleIndex,
  };
  
  await supabase
    .from('cluster_generations')
    .update({
      status: 'partial',
      progress: {
        message: `❌ Failed: ${error.slice(0, 100)}...`,
        error_info: errorInfo,
      },
      error: error.slice(0, 500),
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const FUNCTION_START_TIME = Date.now();
  let currentJobId = '';
  let currentLanguage = '';
  let currentArticleIndex = 0;

  try {
    const { jobId, targetLanguage } = await req.json();

    if (!jobId) {
      throw new Error('jobId is required');
    }
    currentJobId = jobId;

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log(`[translate-cluster] Starting translation for job ${jobId}`);

    // ===== PHASE 1: Check for recent lock =====
    const { data: lockCheck } = await supabase
      .from('cluster_generations')
      .select('status, updated_at, progress')
      .eq('id', jobId)
      .single();
    
    if (lockCheck?.status === 'generating') {
      const lastUpdate = new Date(lockCheck.updated_at).getTime();
      const timeSinceUpdate = Date.now() - lastUpdate;
      
      if (timeSinceUpdate < RECENT_LOCK_MS) {
        console.log(`[translate-cluster] Job is actively running (updated ${Math.round(timeSinceUpdate / 1000)}s ago). Skipping.`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            status: 'generating', 
            message: `Already running. Last update ${Math.round(timeSinceUpdate / 1000)}s ago.`,
            progress: lockCheck.progress
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log(`[translate-cluster] Job stuck in generating for ${Math.round(timeSinceUpdate / 1000)}s, resetting to partial...`);
        await supabase
          .from('cluster_generations')
          .update({ 
            status: 'partial', 
            progress: { ...(lockCheck.progress || {}), message: 'Resuming from stale state...' },
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
    }

    // Fetch job details
    let { data: job, error: jobError } = await supabase
      .from('cluster_generations')
      .select('*')
      .eq('id', jobId)
      .single();

    let sourceLanguage = 'en';
    
    if (jobError || !job) {
      console.log(`[translate-cluster] Job record not found, checking for cluster articles...`);
      
      const { data: clusterArticles, error: clusterError } = await supabase
        .from('blog_articles')
        .select('id, cluster_theme, cluster_id, language')
        .eq('cluster_id', jobId)
        .limit(1);
      
      if (clusterError || !clusterArticles?.length) {
        throw new Error(`No job or cluster found: ${jobId}`);
      }
      
      sourceLanguage = clusterArticles[0].language || 'en';
      console.log(`[translate-cluster] Found cluster with source language: ${sourceLanguage}`);
      
      const filteredTargetLanguages = TARGET_LANGUAGES.filter(lang => lang !== sourceLanguage);
      
      console.log(`[translate-cluster] Creating job record for existing cluster...`);
      const { data: newJob, error: createError } = await supabase
        .from('cluster_generations')
        .insert({
          id: jobId,
          topic: clusterArticles[0].cluster_theme || 'Translation Job',
          primary_keyword: clusterArticles[0].cluster_theme || 'translation',
          target_audience: 'Property buyers',
          language: sourceLanguage,
          status: 'translating',
          progress: { message: 'Starting translations...' },
          languages_queue: filteredTargetLanguages,
          language_status: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error(`[translate-cluster] Failed to create job record:`, createError);
        throw new Error(`Failed to create job record: ${createError.message}`);
      }
      
      job = newJob;
      console.log(`[translate-cluster] Created job record for cluster ${jobId}`);
    } else {
      sourceLanguage = job.language || 'en';
    }

    // Fetch source articles
    const { data: sourceArticles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('*')
      .eq('cluster_id', jobId)
      .eq('language', sourceLanguage)
      .order('cluster_number', { ascending: true });

    if (articlesError || !sourceArticles?.length) {
      throw new Error(`No ${sourceLanguage.toUpperCase()} articles found for this cluster.`);
    }

    console.log(`[translate-cluster] Found ${sourceArticles.length} ${sourceLanguage.toUpperCase()} articles to translate`);
    const expectedCount = sourceArticles.length;

    // Determine which language to translate
    const languagesQueue = job.languages_queue || TARGET_LANGUAGES;
    const languageStatus = { ...(job.language_status || {}) };

    currentLanguage = targetLanguage || '';
    if (!currentLanguage) {
      for (const lang of languagesQueue) {
        if (lang === sourceLanguage) continue;

        const { count } = await supabase
          .from('blog_articles')
          .select('*', { count: 'exact', head: true })
          .eq('cluster_id', jobId)
          .eq('language', lang);

        if ((count || 0) < expectedCount) {
          currentLanguage = lang;
          break;
        }
      }
    }

    if (!currentLanguage) {
      await linkTranslations(supabase, jobId);

      await supabase
        .from('cluster_generations')
        .update({
          status: 'completed',
          error: null,
          progress: {
            current_step: 16,
            total_steps: 16,
            message: '✅ All 60 articles generated and linked!',
            generated_articles: 60,
            total_articles: 60,
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({ success: true, status: 'completed', message: 'All translations complete!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[translate-cluster] Translating to: ${currentLanguage}`);

    // Fetch existing translations for safe resume
    const { data: existingForLang } = await supabase
      .from('blog_articles')
      .select('id, cluster_number')
      .eq('cluster_id', jobId)
      .eq('language', currentLanguage);

    const existingClusterNumbers = new Set<number>(
      (existingForLang ?? [])
        .map((a: any) => a.cluster_number)
        .filter((n: any): n is number => typeof n === 'number')
    );
    const initialExistingCount = existingClusterNumbers.size;

    console.log(
      `[translate-cluster] Existing ${currentLanguage} articles: ${initialExistingCount}/${expectedCount}`
    );

    // Update status
    languageStatus[currentLanguage] = 'running';
    await supabase
      .from('cluster_generations')
      .update({
        status: 'generating',
        error: null,
        language_status: languageStatus,
        progress: {
          message: `Translating to ${LANGUAGE_NAMES[currentLanguage] || currentLanguage}...`,
          current_language: currentLanguage,
          generated_articles: initialExistingCount,
          total_articles: 60,
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    let translatedCount = 0;
    const translatedArticles: any[] = [];
    let stoppedEarly = false;

    // Translate source articles
    for (let i = 0; i < sourceArticles.length; i++) {
      currentArticleIndex = i + 1;
      
      // Check article limit
      if (translatedCount >= MAX_ARTICLES_PER_RUN) {
        console.log(`[translate-cluster] ⏸️ Hit max articles per run (${MAX_ARTICLES_PER_RUN}). Returning partial.`);
        stoppedEarly = true;
        
        // Count total articles in DB for accurate progress
        const { count: totalInDb } = await supabase
          .from('blog_articles')
          .select('*', { count: 'exact', head: true })
          .eq('cluster_id', jobId);
        
        await supabase
          .from('cluster_generations')
          .update({
            status: 'partial',
            progress: {
              message: `Translated ${translatedCount} articles. ${expectedCount - initialExistingCount - translatedCount} more for ${LANGUAGE_NAMES[currentLanguage] || currentLanguage}.`,
              current_language: currentLanguage,
              articles_translated: initialExistingCount + translatedCount,
              articles_this_run: translatedCount,
              generated_articles: totalInDb || 0,
              total_articles: 60,
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
        
        break;
      }
      
      // Check timeout
      if (Date.now() - FUNCTION_START_TIME > MAX_RUNTIME) {
        console.log(`[translate-cluster] ⚠️ Timeout approaching at ${translatedCount} articles`);
        stoppedEarly = true;
        
        const { count: totalInDb } = await supabase
          .from('blog_articles')
          .select('*', { count: 'exact', head: true })
          .eq('cluster_id', jobId);
        
        await supabase
          .from('cluster_generations')
          .update({
            status: 'partial',
            progress: {
              message: `Timeout at ${LANGUAGE_NAMES[currentLanguage] || currentLanguage} article ${i + 1}/${expectedCount}. Resumable.`,
              current_language: currentLanguage,
              articles_translated: initialExistingCount + translatedCount,
              timeout_at_article: i + 1,
              generated_articles: totalInDb || 0,
              total_articles: 60,
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
        
        break;
      }

      const sourceArticle = sourceArticles[i];
      const clusterNumber = sourceArticle.cluster_number;

      // Skip if already translated
      if (typeof clusterNumber === 'number' && existingClusterNumbers.has(clusterNumber)) {
        console.log(
          `[translate-cluster] ⏭️ Skipping article ${i + 1}/${expectedCount} (cluster_number ${clusterNumber}) - already exists for ${currentLanguage}`
        );
        continue;
      }

      try {
        console.log(
          `[translate-cluster] Translating article ${i + 1}/${expectedCount}: ${sourceArticle.headline}`
        );

        const translated = await translateArticleWithRetry(sourceArticle, currentLanguage);

        // Save to database
        const { data: savedArticle, error: saveError } = await supabase
          .from('blog_articles')
          .insert({
            slug: translated.slug,
            headline: translated.headline,
            language: translated.language,
            cluster_id: translated.cluster_id,
            cluster_number: translated.cluster_number,
            cluster_theme: translated.cluster_theme,
            funnel_stage: translated.funnel_stage,
            category: translated.category,
            meta_title: translated.meta_title,
            meta_description: translated.meta_description,
            detailed_content: translated.detailed_content,
            speakable_answer: translated.speakable_answer,
            featured_image_url: translated.featured_image_url,
            featured_image_alt: translated.featured_image_alt,
            featured_image_caption: translated.featured_image_caption,
            diagram_url: translated.diagram_url,
            diagram_description: translated.diagram_description,
            diagram_alt: translated.diagram_alt,
            diagram_caption: translated.diagram_caption,
            read_time: translated.read_time,
            author_id: translated.author_id,
            reviewer_id: translated.reviewer_id,
            qa_entities: translated.qa_entities,
            external_citations: translated.external_citations,
            internal_links: translated.internal_links,
            hreflang_group_id: translated.hreflang_group_id,
            is_primary: translated.is_primary,
            source_language: translated.source_language,
            content_type: translated.content_type || 'blog',
            status: 'draft',
          })
          .select()
          .single();

        if (saveError) {
          if (saveError.code === '23505') {
            const { data: existingArticle } = await supabase
              .from('blog_articles')
              .select('*')
              .eq('cluster_id', translated.cluster_id)
              .eq('language', translated.language)
              .eq('cluster_number', translated.cluster_number)
              .maybeSingle();

            if (existingArticle) {
              console.warn(
                `[translate-cluster] Duplicate detected for ${currentLanguage} cluster_number ${translated.cluster_number}. Using existing row.`
              );
              if (typeof translated.cluster_number === 'number') {
                existingClusterNumbers.add(translated.cluster_number);
              }
              translatedArticles.push(existingArticle);
              continue;
            }
          }

          console.error(`Failed to save translation ${i + 1}:`, saveError);
          throw new Error(
            `Failed to save translation ${i + 1}: ${saveError.message}` +
              (saveError.code ? ` (code: ${saveError.code})` : "")
          );
        }

        translatedArticles.push(savedArticle);
        translatedCount++;

        if (typeof translated.cluster_number === 'number') {
          existingClusterNumbers.add(translated.cluster_number);
        }

        const totalNow = initialExistingCount + translatedCount;

        console.log(`[translate-cluster] ✅ Article ${i + 1}/${expectedCount} saved: ${translated.headline}`);

        // Update progress after each article for real-time UI
        const { count: totalInDb } = await supabase
          .from('blog_articles')
          .select('*', { count: 'exact', head: true })
          .eq('cluster_id', jobId);

        await updateArticleProgress(supabase, jobId, currentLanguage, totalNow, expectedCount, totalInDb || 0);

      } catch (error: any) {
        console.error(`[translate-cluster] Error translating article ${i + 1}:`, error);
        
        await updateJobError(supabase, jobId, error.message || String(error), {
          language: currentLanguage,
          articleIndex: i + 1
        });
        
        throw error;
      }
    }

    // Determine language completion
    const { count: languageCount } = await supabase
      .from('blog_articles')
      .select('*', { count: 'exact', head: true })
      .eq('cluster_id', jobId)
      .eq('language', currentLanguage);

    const completedLanguages = (job.completed_languages || []);
    const isLanguageComplete = (languageCount || 0) >= expectedCount;

    if (isLanguageComplete) {
      languageStatus[currentLanguage] = 'completed';
      if (!completedLanguages.includes(currentLanguage)) {
        completedLanguages.push(currentLanguage);
      }
    } else {
      languageStatus[currentLanguage] = 'partial';
    }

    // Count total translated articles
    const { count: totalCount } = await supabase
      .from('blog_articles')
      .select('*', { count: 'exact', head: true })
      .eq('cluster_id', jobId);

    const remainingLanguages = languagesQueue.filter((l: string) =>
      l !== 'en' && languageStatus[l] !== 'completed'
    );

    const isComplete = remainingLanguages.length === 0;

    if (isComplete) {
      await linkTranslations(supabase, jobId);
    }

    await supabase
      .from('cluster_generations')
      .update({
        status: isComplete ? 'completed' : 'partial',
        error: null,
        language_status: languageStatus,
        completed_languages: completedLanguages,
        progress: {
          current_step: isComplete ? 16 : 6 + completedLanguages.length,
          total_steps: 16,
          message: isComplete 
            ? '✅ All 60 articles generated and linked!' 
            : `${LANGUAGE_NAMES[currentLanguage] || currentLanguage} complete. ${remainingLanguages.length} languages remaining.`,
          generated_articles: totalCount || 0,
          total_articles: 60,
          current_language: currentLanguage,
          completed_languages: completedLanguages,
        },
        completion_note: isComplete
          ? 'Multilingual cluster complete: 6 English articles + 54 translations (60 total)'
          : `${completedLanguages.length + 1}/${languagesQueue.length + 1} languages complete (incl. English). Next: ${remainingLanguages[0] || 'none'}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(
      `[translate-cluster] ✅ ${currentLanguage} status: ${(languageCount || 0)}/${expectedCount} total (+${translatedCount} new)`
    );

    return new Response(
      JSON.stringify({
        success: true,
        status: isComplete ? 'completed' : 'partial',
        language: currentLanguage,
        articlesTranslated: languageCount || 0,
        totalArticles: totalCount || 0,
        remainingLanguages: remainingLanguages,
        message: isComplete 
          ? 'All translations complete!' 
          : `${LANGUAGE_NAMES[currentLanguage] || currentLanguage} complete. Click again to continue.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[translate-cluster] Error:', error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : (error && typeof error === 'object' && 'message' in (error as any))
            ? String((error as any).message)
            : JSON.stringify(error);

    if (currentJobId) {
      try {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          await updateJobError(supabase, currentJobId, errorMessage, {
            language: currentLanguage,
            articleIndex: currentArticleIndex
          });
        }
      } catch (e) {
        console.error('[translate-cluster] Failed to update job error:', e);
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
