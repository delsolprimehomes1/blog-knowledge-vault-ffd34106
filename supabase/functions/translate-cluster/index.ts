import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

const MAX_RUNTIME = 4.5 * 60 * 1000; // 4.5 minutes
const MAX_RETRIES = 2;

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
  
  // Remove markdown code fences
  cleanText = cleanText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
  
  try {
    return JSON.parse(cleanText);
  } catch (e1) {
    // Try to extract JSON object
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
 * Call AI gateway with better error handling
 */
async function callAI(
  prompt: string,
  apiKey: string,
  options: { maxTokens?: number; tools?: any[]; toolChoice?: any } = {}
): Promise<any> {
  const { maxTokens = 4000, tools, toolChoice } = options;
  
  const body: any = {
    model: 'google/gemini-2.5-flash',
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
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  // Read response as text first for better error handling
  const responseText = await response.text();
  
  if (!response.ok) {
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
 * STEP 1: Translate metadata using tool calling (structured output)
 */
async function translateMetadata(
  englishArticle: any,
  targetLanguage: string,
  apiKey: string
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

  const data = await callAI(prompt, apiKey, {
    maxTokens: 3000,
    tools,
    toolChoice: { type: "function", function: { name: "translate_metadata" } }
  });

  // Extract tool call arguments
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    // Fallback: try to parse from content
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
 * STEP 2: Translate HTML content separately (plain text output, no JSON wrapper)
 */
async function translateHtmlContent(
  englishHtml: string,
  targetLanguage: string,
  apiKey: string
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

  const data = await callAI(prompt, apiKey, { maxTokens: 12000 });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Empty HTML translation response`);
  }

  // Clean any accidental code fences from response
  return cleanHtmlContent(content);
}

/**
 * Translate article with retry logic
 */
async function translateArticleWithRetry(
  englishArticle: any,
  targetLanguage: string,
  apiKey: string,
  retryCount = 0
): Promise<any> {
  const targetLanguageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  console.log(`[Translation] Translating "${englishArticle.headline}" to ${targetLanguageName} (attempt ${retryCount + 1})...`);

  try {
    // Step 1: Translate metadata via tool calling
    const metadata = await translateMetadata(englishArticle, targetLanguage, apiKey);
    
    // Step 2: Translate HTML content separately
    const translatedHtml = await translateHtmlContent(
      englishArticle.detailed_content,
      targetLanguage,
      apiKey
    );

    // Generate slug from translated headline
    const slug = metadata.headline
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    // Add random suffix for uniqueness
    const uniqueSlug = `${slug}-${englishArticle.cluster_number || 0}-${Math.random().toString(36).slice(2, 6)}`;

    // Truncate fields
    const truncatedMetaDescription = String(metadata.meta_description ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    const truncatedMetaTitle = String(metadata.meta_title ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 70);

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
      
      // Keep same images
      featured_image_url: englishArticle.featured_image_url,
      diagram_url: englishArticle.diagram_url,
      diagram_description: englishArticle.diagram_description,
      diagram_alt: englishArticle.diagram_alt,
      diagram_caption: englishArticle.diagram_caption,
      
      // Set proper metadata
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
      return translateArticleWithRetry(englishArticle, targetLanguage, apiKey, retryCount + 1);
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
  
  // Group by cluster_number
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
  
  // Build update payloads
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
  
  // Process updates with concurrency limit (10 at a time for speed)
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log(`[translate-cluster] Starting translation for job ${jobId}`);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('cluster_generations')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Fetch English articles for this cluster
    const { data: englishArticles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('*')
      .eq('cluster_id', jobId)
      .eq('language', 'en')
      .order('cluster_number', { ascending: true });

    if (articlesError || !englishArticles?.length) {
      throw new Error('No English articles found for this cluster. Generate English first.');
    }

    console.log(`[translate-cluster] Found ${englishArticles.length} English articles to translate`);
    const expectedCount = englishArticles.length;

    // Determine which language to translate
    const languagesQueue = job.languages_queue || TARGET_LANGUAGES;
    const languageStatus = { ...(job.language_status || {}) };

    // Find next language to translate
    currentLanguage = targetLanguage || '';
    if (!currentLanguage) {
      for (const lang of languagesQueue) {
        if (lang === 'en') continue;

        // Check if this language is already done
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
      // All translations complete
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

    // Fetch existing translations for this language so the function can safely resume
    const { data: existingForLang, error: existingForLangError } = await supabase
      .from('blog_articles')
      .select('id, cluster_number')
      .eq('cluster_id', jobId)
      .eq('language', currentLanguage);

    if (existingForLangError) {
      console.warn(
        `[translate-cluster] Could not fetch existing translations for ${currentLanguage}:`,
        existingForLangError
      );
    }

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
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    let translatedCount = 0;
    const translatedArticles: any[] = [];

    // Translate all English articles
    for (let i = 0; i < englishArticles.length; i++) {
      currentArticleIndex = i + 1;
      
      // Check timeout
      if (Date.now() - FUNCTION_START_TIME > MAX_RUNTIME) {
        console.log(`[translate-cluster] ⚠️ Timeout approaching, stopping at ${i} articles`);
        break;
      }

      const englishArticle = englishArticles[i];
      const clusterNumber = englishArticle.cluster_number;

      // Skip if already translated for this language (safe resume)
      if (typeof clusterNumber === 'number' && existingClusterNumbers.has(clusterNumber)) {
        console.log(
          `[translate-cluster] ⏭️ Skipping article ${i + 1}/${expectedCount} (cluster_number ${clusterNumber}) - already exists for ${currentLanguage}`
        );
        continue;
      }

      try {
        console.log(
          `[translate-cluster] Translating article ${i + 1}/${expectedCount}: ${englishArticle.headline}`
        );

        const translated = await translateArticleWithRetry(englishArticle, currentLanguage, LOVABLE_API_KEY);

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
          // If the button is pressed again mid-run, we may hit duplicates.
          if (saveError.code === '23505') {
            const { data: existingArticle, error: existingFetchError } = await supabase
              .from('blog_articles')
              .select('*')
              .eq('cluster_id', translated.cluster_id)
              .eq('language', translated.language)
              .eq('cluster_number', translated.cluster_number)
              .maybeSingle();

            if (!existingFetchError && existingArticle) {
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

        // Update progress
        await supabase
          .from('cluster_generations')
          .update({
            progress: {
              message: `Translating to ${LANGUAGE_NAMES[currentLanguage] || currentLanguage}: ${totalNow}/${expectedCount} articles...`,
              current_language: currentLanguage,
              articles_translated: totalNow,
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

      } catch (error: any) {
        console.error(`[translate-cluster] Error translating article ${i + 1}:`, error);
        
        // Log error to job for visibility in UI
        await updateJobError(supabase, jobId, error.message || String(error), {
          language: currentLanguage,
          articleIndex: i + 1
        });
        
        throw error;
      }
    }

    // Determine language completion based on what's in the database (idempotent)
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
      languageStatus[currentLanguage] = (languageCount || 0) > 0 ? 'partial' : 'partial';
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

    // Try to update job with error if we have jobId
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
