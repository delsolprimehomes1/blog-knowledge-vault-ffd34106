import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_NAMES: Record<string, string> = {
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

function generateSlug(headline: string, qaType: string, lang: string): string {
  const baseSlug = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 45);
  
  const suffix = crypto.randomUUID().substring(0, 8);
  return `${baseSlug}-${qaType}-${lang}-${suffix}`;
}

async function translateQAContent(
  englishQA: { question_main: string; answer_main: string; meta_title: string; meta_description: string; speakable_answer: string; featured_image_alt: string },
  targetLanguage: string
): Promise<{
  question: string;
  answer: string;
  metaTitle: string;
  metaDescription: string;
  speakableAnswer: string;
  imageAlt: string;
}> {
  const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  
  const prompt = `Translate this Q&A content to ${languageName}. Keep the same meaning and SEO optimization.

ENGLISH CONTENT:
Question: ${englishQA.question_main}
Answer: ${englishQA.answer_main}
Meta Title: ${englishQA.meta_title}
Meta Description: ${englishQA.meta_description}
Speakable: ${englishQA.speakable_answer}
Image Alt: ${englishQA.featured_image_alt}

Return JSON with translations:
{
  "question": "translated question",
  "answer": "translated answer (keep same structure and length)",
  "metaTitle": "translated SEO title under 60 chars",
  "metaDescription": "translated SEO description 120-155 chars",
  "speakableAnswer": "translated voice answer under 100 words",
  "imageAlt": "translated alt text"
}`;

  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You are an expert translator. Translate content to ${languageName} while maintaining SEO quality. Always respond with valid JSON.` },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.3,
    }),
  }, 30000); // 30 second timeout

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in translation response');
  }

  return JSON.parse(content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { clusterId, targetLanguage } = await req.json();

    if (!clusterId || !targetLanguage) {
      throw new Error('clusterId and targetLanguage are required');
    }

    if (targetLanguage === 'en') {
      throw new Error('Cannot translate to English - use generate-english-article-qas instead');
    }

    if (!LANGUAGE_NAMES[targetLanguage]) {
      throw new Error(`Invalid target language: ${targetLanguage}. Valid: ${Object.keys(LANGUAGE_NAMES).join(', ')}`);
    }

    console.log(`[TranslateQAs] Starting translation to ${targetLanguage} for cluster ${clusterId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all English Q&As for this cluster
    const { data: englishQAs, error: qaError } = await supabase
      .from('qa_pages')
      .select('*')
      .eq('cluster_id', clusterId)
      .eq('language', 'en')
      .order('created_at', { ascending: true });

    if (qaError || !englishQAs) {
      throw new Error(`Failed to fetch English Q&As: ${qaError?.message || 'No data'}`);
    }

    console.log(`[TranslateQAs] Found ${englishQAs.length} English Q&As to translate`);

    if (englishQAs.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No English Q&As found to translate',
        translated: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check which Q&As already exist in target language
    const { data: existingQAs } = await supabase
      .from('qa_pages')
      .select('hreflang_group_id')
      .eq('cluster_id', clusterId)
      .eq('language', targetLanguage);

    const existingGroupIds = new Set((existingQAs || []).map(q => q.hreflang_group_id));
    console.log(`[TranslateQAs] ${existingGroupIds.size} Q&As already exist in ${targetLanguage}`);

    // Filter to only translate missing Q&As
    const qasToTranslate = englishQAs.filter(qa => !existingGroupIds.has(qa.hreflang_group_id));
    console.log(`[TranslateQAs] ${qasToTranslate.length} Q&As need translation`);

    if (qasToTranslate.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: `All Q&As already translated to ${targetLanguage}`,
        translated: 0,
        alreadyExist: existingGroupIds.size,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get target language articles (to find correct source_article_id)
    const { data: targetArticles } = await supabase
      .from('blog_articles')
      .select('id, hreflang_group_id, featured_image_alt, slug')
      .eq('cluster_id', clusterId)
      .eq('language', targetLanguage);

    const articlesByHreflang = new Map(
      (targetArticles || []).map(a => [a.hreflang_group_id, a])
    );

    // Get English articles for hreflang lookup
    const { data: englishArticles } = await supabase
      .from('blog_articles')
      .select('id, hreflang_group_id')
      .eq('cluster_id', clusterId)
      .eq('language', 'en');

    const englishArticleHreflangMap = new Map(
      (englishArticles || []).map(a => [a.id, a.hreflang_group_id])
    );

    const translatedQAs: string[] = [];
    const errors: string[] = [];

    // Translate each Q&A
    for (let i = 0; i < qasToTranslate.length; i++) {
      const englishQA = qasToTranslate[i];
      
      try {
        console.log(`[TranslateQAs] Translating ${i + 1}/${qasToTranslate.length}: ${englishQA.qa_type}`);

        // Find the target language article
        const englishArticleHreflang = englishArticleHreflangMap.get(englishQA.source_article_id);
        const targetArticle = englishArticleHreflang ? articlesByHreflang.get(englishArticleHreflang) : null;

        if (!targetArticle) {
          console.warn(`[TranslateQAs] No ${targetLanguage} article found for Q&A ${englishQA.id}`);
          errors.push(`No ${targetLanguage} article for: ${englishQA.title}`);
          continue;
        }

        // Translate content
        const translated = await translateQAContent(
          {
            question_main: englishQA.question_main,
            answer_main: englishQA.answer_main,
            meta_title: englishQA.meta_title,
            meta_description: englishQA.meta_description,
            speakable_answer: englishQA.speakable_answer,
            featured_image_alt: englishQA.featured_image_alt || 'Property image',
          },
          targetLanguage
        );

        const slug = generateSlug(translated.question, englishQA.qa_type, targetLanguage);

        // Build translated Q&A record
        const translatedQARecord = {
          source_article_id: targetArticle.id,
          cluster_id: clusterId,
          language: targetLanguage,
          qa_type: englishQA.qa_type,
          title: translated.question,
          slug: slug,
          question_main: translated.question,
          answer_main: translated.answer,
          meta_title: translated.metaTitle,
          meta_description: translated.metaDescription,
          speakable_answer: translated.speakableAnswer,
          featured_image_url: englishQA.featured_image_url,
          featured_image_alt: translated.imageAlt,
          hreflang_group_id: englishQA.hreflang_group_id, // JOIN the same group!
          source_language: 'en',
          translations: {}, // Will be synced after all insertions
          related_qas: [],
          internal_links: englishQA.internal_links || [],
          funnel_stage: englishQA.funnel_stage,
          status: 'published',
          source_article_slug: targetArticle.slug,
        };

        // Insert translated Q&A
        const { data: insertedQA, error: insertError } = await supabase
          .from('qa_pages')
          .insert(translatedQARecord)
          .select('id')
          .single();

        if (insertError) {
          console.error(`[TranslateQAs] Insert error:`, insertError);
          errors.push(`${englishQA.qa_type}: ${insertError.message}`);
          continue;
        }

        console.log(`[TranslateQAs] ✅ Created ${targetLanguage} Q&A: ${slug}`);
        translatedQAs.push(insertedQA.id);

        // Small delay between translations to avoid rate limits
        if (i < qasToTranslate.length - 1) {
          await new Promise(r => setTimeout(r, 500));
        }

      } catch (error) {
        console.error(`[TranslateQAs] Error translating ${englishQA.qa_type}:`, error);
        errors.push(`${englishQA.qa_type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // After all translations, sync the translations JSONB for all affected hreflang groups
    console.log(`[TranslateQAs] Syncing translations JSONB...`);

    const affectedGroupIds = [...new Set(qasToTranslate.map(qa => qa.hreflang_group_id))];
    
    for (const groupId of affectedGroupIds) {
      try {
        // Get all Q&As in this hreflang group
        const { data: groupQAs } = await supabase
          .from('qa_pages')
          .select('id, language, slug')
          .eq('hreflang_group_id', groupId);

        if (!groupQAs || groupQAs.length === 0) continue;

        // Build complete translations object
        const translations: Record<string, string> = {};
        for (const qa of groupQAs) {
          translations[qa.language] = qa.slug;
        }

        // Update all Q&As in the group with complete translations
        const { error: updateError } = await supabase
          .from('qa_pages')
          .update({ translations })
          .eq('hreflang_group_id', groupId);

        if (updateError) {
          console.error(`[TranslateQAs] Error syncing translations for group ${groupId}:`, updateError);
        } else {
          console.log(`[TranslateQAs] ✅ Synced translations for group ${groupId}: ${Object.keys(translations).length} languages`);
        }
      } catch (error) {
        console.error(`[TranslateQAs] Error syncing group ${groupId}:`, error);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[TranslateQAs] Complete in ${duration}s: ${translatedQAs.length}/${qasToTranslate.length} translated to ${targetLanguage}`);

    return new Response(JSON.stringify({
      success: true,
      targetLanguage,
      translated: translatedQAs.length,
      expected: qasToTranslate.length,
      alreadyExisted: existingGroupIds.size,
      errors: errors.length > 0 ? errors : undefined,
      durationSeconds: parseFloat(duration),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[TranslateQAs] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
