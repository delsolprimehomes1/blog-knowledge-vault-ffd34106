import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPPORTED_LANGUAGES = ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];

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

// FIX 1: Batch limits to prevent timeouts
const MAX_REPAIRS_PER_BATCH = 5;
const MAX_RUNTIME_MS = 25000; // Return within 25 seconds

interface QAPage {
  id: string;
  question_main: string;
  answer_main: string;
  speakable_answer: string;
  meta_title: string;
  meta_description: string;
  slug: string;
  title: string;
  featured_image_url: string;
  featured_image_alt: string;
  canonical_url: string;
  language: string;
  cluster_id: string;
  source_article_id: string;
  source_article_slug: string;
  source_language: string;
  qa_type: string;
  hreflang_group_id: string;
  translations: Record<string, string>;
  status: string;
}

// Robust JSON parsing with repair logic
function parseJSONSafe(content: string): any | null {
  if (!content || content.trim() === '') {
    console.error('[parseJSONSafe] Empty content');
    return null;
  }
  
  try {
    return JSON.parse(content);
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (e2) {
        console.log('[parseJSONSafe] Failed to parse from code block');
      }
    }
    
    // Try to find raw JSON object
    const rawMatch = content.match(/\{[\s\S]*\}/);
    if (rawMatch) {
      try {
        let repaired = rawMatch[0]
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/[\x00-\x1F\x7F]/g, ' ');
        return JSON.parse(repaired);
      } catch (e3) {
        console.error('[parseJSONSafe] Failed to parse repaired JSON:', e3);
      }
    }
    
    console.error('[parseJSONSafe] All parsing attempts failed');
    return null;
  }
}

// FIX 3: Fetch with timeout using AbortController
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

// Retry wrapper with exponential backoff
async function translateWithRetry(
  englishQA: QAPage,
  targetLang: string,
  lovableApiKey: string,
  maxRetries = 3
): Promise<{ question: string; answer: string; speakable_answer: string; meta_title: string; meta_description: string } | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await translateQA(englishQA, targetLang, lovableApiKey);
      if (result) {
        console.log(`[translateWithRetry] Success for ${targetLang} on attempt ${attempt}`);
        return result;
      }
    } catch (error) {
      console.error(`[translateWithRetry] Attempt ${attempt} failed for ${targetLang}:`, error);
    }
    
    if (attempt < maxRetries) {
      const delay = attempt * 3000; // 3s, 6s, 9s
      console.log(`[translateWithRetry] Retry ${attempt}/${maxRetries} for ${targetLang} in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error(`[translateWithRetry] All ${maxRetries} attempts failed for ${targetLang}`);
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let repairedCount = 0;
  let totalMissing = 0;

  try {
    const { clusterId, languages } = await req.json();

    if (!clusterId) {
      throw new Error('clusterId is required');
    }

    console.log(`[repair-missing-qas] Starting repair for cluster ${clusterId}, languages: ${languages?.join(', ') || 'all'}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get all Q&A pages for this cluster
    const { data: allQAs, error: qaError } = await supabase
      .from('qa_pages')
      .select('*')
      .eq('cluster_id', clusterId);

    if (qaError) throw qaError;

    console.log(`[repair-missing-qas] Found ${allQAs?.length || 0} Q&As for cluster`);

    // Group Q&As by language
    const qasByLanguage: Record<string, QAPage[]> = {};
    for (const qa of (allQAs || [])) {
      if (!qasByLanguage[qa.language]) {
        qasByLanguage[qa.language] = [];
      }
      qasByLanguage[qa.language].push(qa as QAPage);
    }

    // Get English Q&As as reference
    const englishQAs = qasByLanguage['en'] || [];
    
    if (englishQAs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, repaired: 0, partial: false, remaining: 0, message: 'No English Q&As found to use as reference' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[repair-missing-qas] Using ${englishQAs.length} English Q&As as reference`);

    // Determine target languages
    const targetLanguages = languages && languages.length > 0 
      ? languages.filter((l: string) => l !== 'en' && SUPPORTED_LANGUAGES.includes(l))
      : SUPPORTED_LANGUAGES.filter(l => l !== 'en');

    const repairLog: { lang: string; qaType: string; sourceArticleId: string }[] = [];

    // Build list of missing translations first
    const missingTranslations: { englishQA: QAPage; targetLang: string }[] = [];
    
    for (const englishQA of englishQAs) {
      const { qa_type, hreflang_group_id } = englishQA;

      for (const targetLang of targetLanguages) {
        // FIX 4: Improved existence check - match hreflang_group_id + qa_type + language
        const existingQA = (qasByLanguage[targetLang] || []).find(
          qa => qa.hreflang_group_id === hreflang_group_id && 
                qa.qa_type === qa_type && 
                qa.language === targetLang
        );

        if (!existingQA) {
          missingTranslations.push({ englishQA, targetLang });
        }
      }
    }

    totalMissing = missingTranslations.length;
    console.log(`[repair-missing-qas] Found ${totalMissing} missing translations to repair`);

    if (totalMissing === 0) {
      return new Response(
        JSON.stringify({ success: true, repaired: 0, partial: false, remaining: 0, message: 'All translations are complete!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process missing translations with batch limits
    for (const { englishQA, targetLang } of missingTranslations) {
      // FIX 1: Check batch limit
      if (repairedCount >= MAX_REPAIRS_PER_BATCH) {
        console.log(`[repair-missing-qas] ✅ Batch limit reached (${repairedCount} repaired)`);
        break;
      }

      // FIX 1: Check time limit
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.log(`[repair-missing-qas] ⏱️ Time limit reached (${Date.now() - startTime}ms)`);
        break;
      }

      const { source_article_id, qa_type, hreflang_group_id } = englishQA;

      // Find source English article
      const { data: englishArticle } = await supabase
        .from('blog_articles')
        .select('id, slug, headline, hreflang_group_id, translations')
        .eq('id', source_article_id)
        .single();

      if (!englishArticle) {
        console.warn(`[repair-missing-qas] English article ${source_article_id} not found`);
        continue;
      }

      // FIX 2: Find translated article WITH image fields
      const { data: translatedArticle } = await supabase
        .from('blog_articles')
        .select('id, slug, headline, featured_image_url, featured_image_alt')
        .eq('hreflang_group_id', englishArticle.hreflang_group_id)
        .eq('language', targetLang)
        .single();

      if (!translatedArticle) {
        console.warn(`[repair-missing-qas] No ${targetLang} translation found for article ${source_article_id}`);
        continue;
      }

      console.log(`[repair-missing-qas] Translating ${qa_type} Q&A to ${targetLang} for article ${translatedArticle.slug}`);

      // Throttle: 500ms between calls
      await new Promise(r => setTimeout(r, 500));

      // Translate with retry logic
      const translatedQA = await translateWithRetry(englishQA, targetLang, lovableApiKey);

      if (!translatedQA) {
        console.error(`[repair-missing-qas] Failed to translate Q&A to ${targetLang} after all retries`);
        continue;
      }

      // Generate slug
      const uuidSuffix = crypto.randomUUID().substring(0, 8);
      const translatedSlug = `${generateSlug(translatedQA.question)}-${uuidSuffix}`;

      // FIX 2: Use article's existing image alt instead of calling AI
      const imageAlt = translatedArticle.featured_image_alt || englishQA.featured_image_alt || 'Q&A about Costa del Sol real estate';
      const imageUrl = translatedArticle.featured_image_url || englishQA.featured_image_url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200';

      const canonicalUrl = `https://www.delsolprimehomes.com/${targetLang}/qa/${translatedSlug}`;

      // Insert new Q&A
      const { error: insertError } = await supabase
        .from('qa_pages')
        .insert({
          question_main: translatedQA.question,
          answer_main: translatedQA.answer,
          speakable_answer: translatedQA.speakable_answer,
          meta_title: translatedQA.meta_title,
          meta_description: translatedQA.meta_description,
          slug: translatedSlug,
          title: translatedQA.question,
          featured_image_url: imageUrl,
          featured_image_alt: imageAlt,
          canonical_url: canonicalUrl,
          translations: {},
          language: targetLang,
          source_language: 'en',
          cluster_id: clusterId,
          source_article_id: translatedArticle.id,
          source_article_slug: translatedArticle.slug,
          qa_type: qa_type,
          hreflang_group_id: hreflang_group_id,
          status: englishQA.status || 'published',
        });

      if (insertError) {
        console.error(`[repair-missing-qas] Failed to insert ${targetLang} Q&A:`, insertError);
        continue;
      }

      repairedCount++;
      repairLog.push({ lang: targetLang, qaType: qa_type, sourceArticleId: translatedArticle.id });
      console.log(`[repair-missing-qas] ✅ Created ${targetLang} ${qa_type} Q&A: ${translatedSlug}`);
    }

    const remaining = totalMissing - repairedCount;
    const isPartial = remaining > 0;

    console.log(`[repair-missing-qas] Batch complete. Created ${repairedCount} Q&As, ${remaining} remaining, in ${Date.now() - startTime}ms`);

    // FIX 1: Return partial status for auto-retry
    return new Response(
      JSON.stringify({ 
        success: true, 
        repaired: repairedCount,
        partial: isPartial,
        remaining: remaining,
        repairLog,
        message: isPartial 
          ? `Created ${repairedCount} Q&As. ${remaining} still missing.`
          : `All missing Q&As created (${repairedCount} total).`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[repair-missing-qas] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, repaired: repairedCount }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// FIX 3: translateQA now uses fetchWithTimeout
async function translateQA(
  englishQA: QAPage, 
  targetLang: string,
  lovableApiKey: string
): Promise<{ question: string; answer: string; speakable_answer: string; meta_title: string; meta_description: string } | null> {
  const languageName = LANGUAGE_NAMES[targetLang] || targetLang;

  const prompt = `Translate the following Q&A content from English to ${languageName}. 
Maintain the same meaning and format. Keep it natural and fluent in ${languageName}.

English Q&A:
Question: ${englishQA.question_main}
Answer: ${englishQA.answer_main}
Speakable Answer: ${englishQA.speakable_answer}
Meta Title: ${englishQA.meta_title}
Meta Description: ${englishQA.meta_description}

Return ONLY valid JSON with these fields:
{
  "question": "translated question",
  "answer": "translated answer (HTML preserved)",
  "speakable_answer": "translated speakable answer",
  "meta_title": "translated meta title (max 60 chars)",
  "meta_description": "translated meta description (max 160 chars)"
}`;

  try {
    // FIX 3: Use 15 second timeout
    const response = await fetchWithTimeout(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          messages: [
            { role: 'system', content: 'You are a professional translator. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_completion_tokens: 2500,
          response_format: { type: "json_object" },
        }),
      },
      15000 // 15 second timeout
    );

    // Rate limit handling
    if (response.status === 429) {
      console.log(`[translateQA] Rate limited for ${targetLang}, waiting 15s...`);
      await new Promise(r => setTimeout(r, 15000));
      return null; // Will be retried
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[translateQA] AI Gateway error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log(`[translateQA] Response for ${targetLang}: status=${response.status}, contentLen=${content?.length || 0}`);
    
    if (!content) {
      console.error(`[translateQA] Empty content from AI for ${targetLang}`);
      return null;
    }

    const parsed = parseJSONSafe(content);
    if (!parsed) {
      console.error(`[translateQA] Failed to parse JSON for ${targetLang}`);
      return null;
    }

    console.log(`[translateQA] Successfully parsed ${targetLang} translation`);
    return parsed;
  } catch (error) {
    console.error(`[translateQA] Error for ${targetLang}:`, error);
    return null;
  }
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 70)
    .replace(/^-|-$/g, '');
}
