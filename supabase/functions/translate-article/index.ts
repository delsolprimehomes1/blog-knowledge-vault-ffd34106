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

/**
 * Translates an English article to target language using AI
 * Keeps same images, structure, and metadata
 */
async function translateArticle(
  englishArticle: any,
  targetLanguage: string,
  lovableApiKey: string
): Promise<any> {
  const targetLanguageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  console.log(`[Translation] Translating article "${englishArticle.headline}" to ${targetLanguageName}...`);

  const translationPrompt = `You are a professional translator specializing in luxury real estate content.

TASK: Translate this article from English to ${targetLanguageName}.

CRITICAL REQUIREMENTS:
- Translate EVERYTHING (headline, content, meta tags, FAQs, speakable answer)
- Keep ALL HTML tags intact (<h2>, <p>, <strong>, <a>, etc.)
- Maintain the same structure and formatting
- Keep tone professional and natural in ${targetLanguageName}
- Do NOT add or remove content
- Keep all links and citations as-is (just translate surrounding text)
- Keep proper nouns like "Costa del Sol" unchanged
- Keep brand names unchanged

**CRITICAL LENGTH LIMITS:**
- meta_title: MUST be 60 characters or less
- meta_description: MUST be 155 characters or less (HARD LIMIT - no exceptions!)
- speakable_answer: 50-80 words

ENGLISH ARTICLE TO TRANSLATE:

**Headline:**
${englishArticle.headline}

**Meta Title (max 60 chars):**
${englishArticle.meta_title}

**Meta Description (MUST be ≤155 chars):**
${englishArticle.meta_description}

**Speakable Answer (50-80 words):**
${englishArticle.speakable_answer}

**Main Content (HTML):**
${englishArticle.detailed_content}

**FAQs:**
${JSON.stringify(englishArticle.qa_entities || [], null, 2)}

**Featured Image Alt Text:**
${englishArticle.featured_image_alt}

**Featured Image Caption:**
${englishArticle.featured_image_caption || ''}

---

RESPOND IN JSON FORMAT ONLY (no markdown code blocks):
{
  "headline": "translated headline",
  "meta_title": "translated meta title (max 60 chars)",
  "meta_description": "translated meta description (MUST be ≤155 chars)",
  "speakable_answer": "translated speakable answer (50-80 words)",
  "detailed_content": "translated HTML content (keep all tags and links)",
  "qa_entities": [
    {"question": "translated question", "answer": "translated answer"},
    ...
  ],
  "featured_image_alt": "translated alt text",
  "featured_image_caption": "translated caption"
}`;

  // Retry logic for AI translation
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;
  let translated: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Translation] Attempt ${attempt}/${MAX_RETRIES}...`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: translationPrompt }],
          max_tokens: 16000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Translation API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      let translatedText = data.choices[0].message.content.trim();

      // Remove markdown code fences if present
      translatedText = translatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      try {
        translated = JSON.parse(translatedText);
      } catch (parseError) {
        // Try to extract JSON from text
        const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          translated = JSON.parse(jsonMatch[0]);
        } else {
          console.error(`[Translation] JSON parse failed on attempt ${attempt}. Raw response:`, translatedText.substring(0, 500));
          throw new Error(`Failed to parse translation response: ${parseError}`);
        }
      }

      // Success - break out of retry loop
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Translation] Attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < MAX_RETRIES) {
        // Wait before retry (exponential backoff)
        const delay = attempt * 2000;
        console.log(`[Translation] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  if (!translated) {
    throw lastError || new Error('Translation failed after all retries');
  }

  // CRITICAL: Truncate meta_description if over 160 chars (database constraint)
  if (translated.meta_description && translated.meta_description.length > 160) {
    console.log(`[Translation] Truncating meta_description from ${translated.meta_description.length} to 157 chars`);
    translated.meta_description = translated.meta_description.substring(0, 157) + '...';
  }

  // Also truncate meta_title if over 60 chars
  if (translated.meta_title && translated.meta_title.length > 60) {
    console.log(`[Translation] Truncating meta_title from ${translated.meta_title.length} to 60 chars`);
    translated.meta_title = translated.meta_title.substring(0, 57) + '...';
  }

  // Generate slug from translated headline
  const slug = translated.headline
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Create translated article object
  return {
    // Override with translations
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
    
    // Keep same images (no regeneration!)
    featured_image_url: englishArticle.featured_image_url,
    diagram_url: englishArticle.diagram_url,
    diagram_description: englishArticle.diagram_description,
    diagram_alt: englishArticle.diagram_alt,
    diagram_caption: englishArticle.diagram_caption,
    
    // Set proper metadata
    source_language: 'en',
    is_primary: false, // English is primary
    hreflang_group_id: englishArticle.hreflang_group_id, // Same group!
    cluster_id: englishArticle.cluster_id,
    cluster_number: englishArticle.cluster_number,
    cluster_theme: englishArticle.cluster_theme,
    funnel_stage: englishArticle.funnel_stage,
    category: englishArticle.category,
    content_type: englishArticle.content_type,
    read_time: englishArticle.read_time,
    
    // Keep same author/reviewer
    author_id: englishArticle.author_id,
    reviewer_id: englishArticle.reviewer_id,
    
    // Keep citations (don't translate URLs)
    external_citations: englishArticle.external_citations,
    internal_links: [], // Will be populated later with same-language links
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
        // Also include as translatedArticle for backwards compatibility
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
