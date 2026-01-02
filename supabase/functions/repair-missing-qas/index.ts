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

// Timeout protection: return partial results after 2.5 minutes
const TIMEOUT_THRESHOLD_MS = 150000;

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

// Robust JSON parsing with repair logic (from generate-article-qas)
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
        // Attempt repair of common issues
        let repaired = rawMatch[0]
          .replace(/,\s*}/g, '}') // trailing commas
          .replace(/,\s*]/g, ']') // trailing commas in arrays
          .replace(/[\x00-\x1F\x7F]/g, ' '); // control characters
        return JSON.parse(repaired);
      } catch (e3) {
        console.error('[parseJSONSafe] Failed to parse repaired JSON:', e3);
      }
    }
    
    console.error('[parseJSONSafe] All parsing attempts failed');
    return null;
  }
}

// Retry wrapper with longer exponential backoff
async function translateWithRetry(
  englishQA: QAPage,
  targetLang: string,
  lovableApiKey: string,
  maxRetries = 3
): Promise<{ question: string; answer: string; speakable_answer: string; meta_title: string; meta_description: string } | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await translateQA(englishQA, targetLang, lovableApiKey);
    if (result) {
      console.log(`[translateWithRetry] Success for ${targetLang} on attempt ${attempt}`);
      return result;
    }
    
    if (attempt < maxRetries) {
      const delay = attempt * 3000; // 3s, 6s, 9s - longer delays
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
        JSON.stringify({ success: true, repaired: 0, message: 'No English Q&As found to use as reference' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[repair-missing-qas] Using ${englishQAs.length} English Q&As as reference`);

    // Determine target languages
    const targetLanguages = languages && languages.length > 0 
      ? languages.filter((l: string) => l !== 'en' && SUPPORTED_LANGUAGES.includes(l))
      : SUPPORTED_LANGUAGES.filter(l => l !== 'en');

    let repairedCount = 0;
    const repairLog: { lang: string; qaType: string; sourceArticleId: string }[] = [];

    // For each English Q&A, check if translations exist
    for (const englishQA of englishQAs) {
      const { source_article_id, qa_type, hreflang_group_id } = englishQA;

      for (const targetLang of targetLanguages) {
        // Timeout protection: return partial results before timeout
        if (Date.now() - startTime > TIMEOUT_THRESHOLD_MS) {
          console.log(`[repair-missing-qas] Timeout protection triggered after ${repairedCount} repairs`);
          return new Response(
            JSON.stringify({ 
              success: true, 
              repaired: repairedCount,
              repairLog,
              partial: true,
              message: `Timeout protection: Created ${repairedCount} Q&As. Run again to continue.`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if this Q&A exists in target language
        const existingQA = (qasByLanguage[targetLang] || []).find(
          qa => qa.hreflang_group_id === hreflang_group_id
        );

        if (existingQA) continue;

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

        // Find translated article
        const { data: translatedArticle } = await supabase
          .from('blog_articles')
          .select('id, slug, headline')
          .eq('hreflang_group_id', englishArticle.hreflang_group_id)
          .eq('language', targetLang)
          .single();

        if (!translatedArticle) {
          console.warn(`[repair-missing-qas] No ${targetLang} translation found for article ${source_article_id}`);
          continue;
        }

        console.log(`[repair-missing-qas] Translating ${qa_type} Q&A to ${targetLang} for article ${translatedArticle.slug}`);

        // Throttle: 500ms between all calls to reduce AI Gateway load
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

        // Translate image alt text
        const translatedImageAlt = await translateAltText(
          englishQA.featured_image_alt || 'Q&A about Costa del Sol real estate',
          targetLang,
          lovableApiKey
        );

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
            featured_image_url: englishQA.featured_image_url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
            featured_image_alt: translatedImageAlt,
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
        console.log(`[repair-missing-qas] Successfully created ${targetLang} ${qa_type} Q&A: ${translatedSlug}`);
      }
    }

    console.log(`[repair-missing-qas] Repair complete. Created ${repairedCount} missing Q&As in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        repaired: repairedCount,
        repairLog,
        message: `Created ${repairedCount} missing Q&As`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[repair-missing-qas] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
    });

    // Rate limit handling
    if (response.status === 429) {
      console.log(`[translateQA] Rate limited for ${targetLang}, waiting 15s...`);
      await new Promise(r => setTimeout(r, 15000));
      return null; // Will be retried by translateWithRetry
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[translateQA] Lovable AI Gateway error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log(`[translateQA] Response for ${targetLang}: status=${response.status}, contentLen=${content?.length || 0}`);
    
    if (!content) {
      console.error(`[translateQA] Empty content from AI for ${targetLang}`);
      return null;
    }

    // Use robust JSON parsing
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

async function translateAltText(
  altText: string,
  targetLang: string,
  lovableApiKey: string
): Promise<string> {
  if (!altText) return '';
  
  const languageName = LANGUAGE_NAMES[targetLang] || targetLang;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { role: 'system', content: `Translate to ${languageName}. Return JSON: {"translation": "your translation"}` },
          { role: 'user', content: altText }
        ],
        max_completion_tokens: 100,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return altText;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = parseJSONSafe(content);
    return parsed?.translation || altText;
  } catch {
    return altText;
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
