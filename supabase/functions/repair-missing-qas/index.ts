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

// FIX 5: Correct interface matching actual qa_pages schema
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    // FIX 2: Use Lovable AI Gateway instead of OpenAI direct
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

    // Get English Q&As as reference (they should be complete)
    const englishQAs = qasByLanguage['en'] || [];
    
    if (englishQAs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, repaired: 0, message: 'No English Q&As found to use as reference' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[repair-missing-qas] Using ${englishQAs.length} English Q&As as reference`);

    // Determine target languages to check
    const targetLanguages = languages && languages.length > 0 
      ? languages.filter((l: string) => l !== 'en' && SUPPORTED_LANGUAGES.includes(l))
      : SUPPORTED_LANGUAGES.filter(l => l !== 'en');

    let repairedCount = 0;
    const repairLog: { lang: string; qaType: string; sourceArticleId: string }[] = [];

    // For each English Q&A, check if translations exist
    for (const englishQA of englishQAs) {
      const { source_article_id, qa_type, hreflang_group_id } = englishQA;

      for (const targetLang of targetLanguages) {
        // Check if this Q&A exists in target language
        const existingQA = (qasByLanguage[targetLang] || []).find(
          qa => qa.source_article_id === source_article_id && qa.qa_type === qa_type
        );

        if (existingQA) continue; // Already exists

        // Need to find the translated article for source_article_id
        const { data: englishArticle } = await supabase
          .from('blog_articles')
          .select('id, slug, headline, hreflang_group_id, translations')
          .eq('id', source_article_id)
          .single();

        if (!englishArticle) {
          console.warn(`[repair-missing-qas] English article ${source_article_id} not found`);
          continue;
        }

        // Find the translated article using hreflang_group_id
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

        // Translate the Q&A using Lovable AI Gateway
        const translatedQA = await translateQA(englishQA, targetLang, lovableApiKey);

        if (!translatedQA) {
          console.error(`[repair-missing-qas] Failed to translate Q&A to ${targetLang}`);
          continue;
        }

        // Generate slug from translated question with UUID suffix to prevent collisions
        const uuidSuffix = crypto.randomUUID().substring(0, 8);
        const translatedSlug = `${generateSlug(translatedQA.question)}-${uuidSuffix}`;

        // FIX 4: Translate image alt text
        const translatedImageAlt = await translateAltText(
          englishQA.featured_image_alt || 'Q&A about Costa del Sol real estate',
          targetLang,
          lovableApiKey
        );

        // Build canonical URL
        const canonicalUrl = `https://www.delsolprimehomes.com/${targetLang}/qa/${translatedSlug}`;

        // FIX 1 & 4: Insert with correct column names and all required fields
        const { error: insertError } = await supabase
          .from('qa_pages')
          .insert({
            // FIX 1: Correct column names
            question_main: translatedQA.question,
            answer_main: translatedQA.answer,
            speakable_answer: translatedQA.speakable_answer,
            meta_title: translatedQA.meta_title,
            meta_description: translatedQA.meta_description,
            slug: translatedSlug,
            
            // FIX 4: Required fields that were missing
            title: translatedQA.question,
            featured_image_url: englishQA.featured_image_url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
            featured_image_alt: translatedImageAlt,
            canonical_url: canonicalUrl,
            translations: {}, // Empty JSONB, will be synced by hreflang repair
            
            // Standard fields
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
        console.log(`[repair-missing-qas] Created ${targetLang} ${qa_type} Q&A for ${translatedArticle.slug}`);
      }
    }

    console.log(`[repair-missing-qas] Repair complete. Created ${repairedCount} missing Q&As`);

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

// FIX 2 & 3: Updated to use Lovable AI Gateway with correct GPT-5 parameters
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
    // FIX 2: Use Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        // FIX 3: Correct model and parameters for GPT-5
        model: 'openai/gpt-5-mini',
        messages: [
          { role: 'system', content: 'You are a professional translator. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 2500,
        // No temperature - not supported by GPT-5
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Lovable AI Gateway error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return null;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Translation error:', error);
    return null;
  }
}

// New helper function to translate image alt text
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
          { role: 'system', content: `Translate to ${languageName}. Return ONLY the translation.` },
          { role: 'user', content: altText }
        ],
        max_completion_tokens: 100,
      }),
    });

    if (!response.ok) return altText; // Fallback to original

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || altText;
  } catch {
    return altText; // Fallback to original on error
  }
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Multiple hyphens to single
    .substring(0, 70) // Limit length (reduced to leave room for UUID suffix)
    .replace(/^-|-$/g, ''); // Trim hyphens
}
