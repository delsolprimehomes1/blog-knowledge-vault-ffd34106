import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

const MAX_CONTENT_LENGTH = 6000; // Characters before chunking (reduced for reliability)
const REQUEST_TIMEOUT_MS = 45000; // 45 seconds per chunk (edge functions timeout at 60s)
const FUNCTION_START_TIME = Date.now();
const FUNCTION_TIMEOUT_MS = 55000; // 55 seconds total function time limit

/**
 * Repair malformed JSON from AI responses
 */
function repairJson(text: string): any {
  // Remove markdown code fences
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  
  // Remove control characters except newlines
  text = text.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // First try direct parse
  try {
    return JSON.parse(text);
  } catch (e) {
    console.log('[JSON Repair] Direct parse failed, attempting repair...');
  }
  
  // Try to extract JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.log('[JSON Repair] Extracted JSON parse failed, trying fixes...');
    }
    
    // Try to fix common issues
    let fixed = jsonMatch[0];
    
    // Fix unescaped newlines in strings
    fixed = fixed.replace(/(?<!\\)\\n(?![\"\\])/g, '\\\\n');
    
    // If truncated, try to complete
    if (!fixed.trim().endsWith('}')) {
      console.log('[JSON Repair] JSON appears truncated, attempting to complete...');
      // Find last complete key-value pair
      const lastCompleteValue = fixed.lastIndexOf('",');
      if (lastCompleteValue > 0) {
        fixed = fixed.substring(0, lastCompleteValue + 1) + '}';
      }
    }
    
    try {
      return JSON.parse(fixed);
    } catch (e) {
      console.log('[JSON Repair] Fixed JSON still invalid');
    }
  }
  
  throw new Error('Could not repair JSON response');
}

/**
 * Split HTML content by H2 headings for chunked translation
 */
function splitContentByHeadings(html: string): string[] {
  if (!html || html.length < MAX_CONTENT_LENGTH) {
    return [html];
  }
  
  // Split by H2 tags but keep the tag with the content
  const parts = html.split(/(?=<h2[^>]*>)/i);
  
  // Combine small chunks to reduce API calls
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const part of parts) {
    if ((currentChunk + part).length < MAX_CONTENT_LENGTH / 2) {
      currentChunk += part;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = part;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  
  console.log(`[Chunking] Split content into ${chunks.length} chunks`);
  return chunks;
}

/**
 * Translate a single chunk of content
 */
async function translateContentChunk(
  chunk: string,
  targetLanguageName: string,
  apiKey: string,
  chunkIndex: number = 0,
  totalChunks: number = 1
): Promise<string> {
  // Check if we're approaching function timeout
  const elapsed = Date.now() - FUNCTION_START_TIME;
  if (elapsed > FUNCTION_TIMEOUT_MS - 15000) {
    throw new Error(`Approaching function timeout (${Math.round(elapsed/1000)}s elapsed), aborting at chunk ${chunkIndex + 1}/${totalChunks}`);
  }

  const prompt = `Translate this HTML content from English to ${targetLanguageName}.
Keep ALL HTML tags exactly as-is. Only translate the text content.
Keep proper nouns like "Costa del Sol" unchanged.

Content:
${chunk}

Respond with ONLY the translated HTML, no explanations.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 8000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Chunk ${chunkIndex + 1}/${totalChunks} timed out after ${REQUEST_TIMEOUT_MS/1000}s`);
    }
    throw error;
  }
}

/**
 * Translates an English article to target language using AI
 */
async function translateArticle(
  englishArticle: any,
  targetLanguage: string,
  apiKey: string
): Promise<any> {
  const targetLanguageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  const contentLength = englishArticle.detailed_content?.length || 0;
  
  console.log(`[Translation] Translating article "${englishArticle.headline}" to ${targetLanguageName}...`);
  console.log(`[Translation] Content length: ${contentLength} characters`);

  // For very long content, use chunked translation
  let translatedContent = englishArticle.detailed_content;
  if (contentLength > MAX_CONTENT_LENGTH) {
    console.log(`[Translation] Content is long (${contentLength} chars), using chunked translation...`);
    const chunks = splitContentByHeadings(englishArticle.detailed_content);
    const translatedChunks: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const elapsed = Date.now() - FUNCTION_START_TIME;
      console.log(`[Translation] Translating chunk ${i + 1}/${chunks.length}... (${Math.round(elapsed/1000)}s elapsed)`);
      
      // Check function-level timeout before each chunk
      if (elapsed > FUNCTION_TIMEOUT_MS - 15000) {
        throw new Error(`Function timeout approaching (${Math.round(elapsed/1000)}s), completed ${i}/${chunks.length} chunks`);
      }
      
      const translated = await translateContentChunk(chunks[i], targetLanguageName, apiKey, i, chunks.length);
      translatedChunks.push(translated);
    }
    
    translatedContent = translatedChunks.join('\n');
    console.log(`[Translation] All ${chunks.length} chunks translated successfully in ${Math.round((Date.now() - FUNCTION_START_TIME)/1000)}s`);
  }

  // Now translate metadata (smaller payload, more reliable)
  const metadataPrompt = `You are a professional translator for luxury real estate content.

Translate these fields from English to ${targetLanguageName}:

**Headline:** ${englishArticle.headline}
**Meta Title (max 60 chars):** ${englishArticle.meta_title}
**Meta Description (max 155 chars):** ${englishArticle.meta_description}
**Speakable Answer (50-80 words):** ${englishArticle.speakable_answer}
**Image Alt:** ${englishArticle.featured_image_alt}
**Image Caption:** ${englishArticle.featured_image_caption || ''}
**FAQs:** ${JSON.stringify(englishArticle.qa_entities || [], null, 2)}

${contentLength > MAX_CONTENT_LENGTH ? '' : `**Content (HTML - keep all tags):** ${englishArticle.detailed_content}`}

RESPOND IN JSON ONLY (no markdown):
{
  "headline": "...",
  "meta_title": "... (max 60 chars)",
  "meta_description": "... (max 155 chars)",
  "speakable_answer": "...",
  "featured_image_alt": "...",
  "featured_image_caption": "...",
  "qa_entities": [{"question": "...", "answer": "..."}]${contentLength > MAX_CONTENT_LENGTH ? '' : ',\n  "detailed_content": "..."'}
}`;

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;
  let translated: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      console.log(`[Translation] Metadata attempt ${attempt}/${MAX_RETRIES}...`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: metadataPrompt }],
          max_tokens: contentLength > MAX_CONTENT_LENGTH ? 4000 : 16000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Translation API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const translatedText = data.choices[0].message.content.trim();
      
      // Use robust JSON repair
      translated = repairJson(translatedText);
      
      // If we used chunked translation, use that content instead
      if (contentLength > MAX_CONTENT_LENGTH) {
        translated.detailed_content = translatedContent;
      }
      
      break; // Success
    } catch (error) {
      clearTimeout(timeout);
      
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new Error('Request timed out after 55 seconds');
        console.error(`[Translation] Attempt ${attempt} timed out`);
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[Translation] Attempt ${attempt} failed:`, lastError.message);
      }
      
      if (attempt < MAX_RETRIES) {
        const delay = attempt * 2000;
        console.log(`[Translation] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  if (!translated) {
    throw lastError || new Error('Translation failed after all retries');
  }

  // Truncate meta fields if needed
  if (translated.meta_description && translated.meta_description.length > 160) {
    console.log(`[Translation] Truncating meta_description from ${translated.meta_description.length} to 157 chars`);
    translated.meta_description = translated.meta_description.substring(0, 157) + '...';
  }

  if (translated.meta_title && translated.meta_title.length > 60) {
    console.log(`[Translation] Truncating meta_title from ${translated.meta_title.length} to 60 chars`);
    translated.meta_title = translated.meta_title.substring(0, 57) + '...';
  }

  // Generate slug from translated headline
  const slug = translated.headline
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return {
    language: targetLanguage,
    headline: translated.headline,
    slug: slug,
    meta_title: translated.meta_title,
    meta_description: translated.meta_description,
    speakable_answer: translated.speakable_answer,
    detailed_content: translated.detailed_content,
    qa_entities: translated.qa_entities,
    featured_image_alt: translated.featured_image_alt,
    featured_image_caption: translated.featured_image_caption || englishArticle.featured_image_caption,
    
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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { englishArticle, targetLanguage } = await req.json();

    if (!englishArticle || !targetLanguage) {
      throw new Error('englishArticle and targetLanguage are required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log(`[translate-article] Translating to ${targetLanguage}...`);

    const translatedArticle = await translateArticle(englishArticle, targetLanguage, OPENAI_API_KEY);

    console.log(`[translate-article] ✅ Translation complete: ${translatedArticle.headline}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        article: translatedArticle,
        translatedArticle: translatedArticle 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[translate-article] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
