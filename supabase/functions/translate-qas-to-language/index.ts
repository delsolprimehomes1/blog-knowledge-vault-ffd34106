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

// BULLETPROOF: Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s exponential backoff
const REQUEST_TIMEOUT = 60000; // 60s timeout (smaller payload = faster)
const DELAY_BETWEEN_QAS = 1500; // 1.5s delay between Q&A translations

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

// Single Q&A content for translation
interface QAContent {
  id: string;
  question_main: string;
  answer_main: string;
  meta_title: string;
  meta_description: string;
  speakable_answer: string;
  featured_image_alt: string;
  qa_type: string;
}

interface TranslatedQAContent {
  question: string;
  answer: string;
  metaTitle: string;
  metaDescription: string;
  speakableAnswer: string;
  imageAlt: string;
}

// BULLETPROOF: Translate a SINGLE Q&A with retry logic
async function translateSingleQA(
  qa: QAContent,
  targetLanguage: string,
  retryCount: number = 0
): Promise<TranslatedQAContent> {
  const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  
  const prompt = `Translate this Q&A to ${languageName}. Keep the same meaning and SEO optimization.

ORIGINAL Q&A:
Question: ${qa.question_main}
Answer: ${qa.answer_main}
Meta Title: ${qa.meta_title}
Meta Description: ${qa.meta_description}
Speakable Answer: ${qa.speakable_answer}
Image Alt: ${qa.featured_image_alt || 'Property image'}

Return ONLY a JSON object (no markdown, no code blocks):
{
  "question": "translated question",
  "answer": "translated answer (keep same structure and length)",
  "metaTitle": "translated SEO title under 60 chars",
  "metaDescription": "translated SEO description 120-155 chars",
  "speakableAnswer": "translated voice answer under 100 words",
  "imageAlt": "translated alt text"
}`;

  try {
    console.log(`[TranslateSingle] Translating ${qa.qa_type} to ${targetLanguage}...`);
    
    const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: `You are an expert translator. Translate content to ${languageName} while maintaining SEO quality. Always respond with valid JSON only, no markdown.` },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
      }),
    }, REQUEST_TIMEOUT);

    if (!response.ok) {
      const errorText = await response.text();
      const isRetryable = response.status === 503 || response.status === 429 || response.status >= 500;
      
      if (isRetryable && retryCount < MAX_RETRIES) {
        console.log(`[TranslateSingle] ⚠️ ${response.status} error, retry ${retryCount + 1}/${MAX_RETRIES} in ${RETRY_DELAYS[retryCount]}ms...`);
        await sleep(RETRY_DELAYS[retryCount]);
        return translateSingleQA(qa, targetLanguage, retryCount + 1);
      }
      
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.');
      }
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in translation response');
    }

    // Parse JSON - handle potential markdown code blocks
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonContent);
    console.log(`[TranslateSingle] ✅ Translated ${qa.qa_type} successfully`);
    return parsed;
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isRetryable = errorMessage.includes('timeout') || 
                        errorMessage.includes('503') || 
                        errorMessage.includes('network') ||
                        errorMessage.includes('connect');
    
    if (isRetryable && retryCount < MAX_RETRIES) {
      console.log(`[TranslateSingle] ⚠️ ${errorMessage}, retry ${retryCount + 1}/${MAX_RETRIES} in ${RETRY_DELAYS[retryCount]}ms...`);
      await sleep(RETRY_DELAYS[retryCount]);
      return translateSingleQA(qa, targetLanguage, retryCount + 1);
    }
    
    throw error;
  }
}

// Rephrase a question to make it unique when collision is detected
async function rephraseQuestion(
  originalQuestion: string,
  existingQuestions: string[],
  targetLanguage: string,
  qaType: string,
  articleHeadline?: string
): Promise<string> {
  const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  
  const prompt = `You need to rephrase this ${languageName} question to be UNIQUE while keeping the same meaning.

ORIGINAL QUESTION (must rephrase):
"${originalQuestion}"

EXISTING QUESTIONS (the rephrased version must NOT match any of these):
${existingQuestions.slice(0, 10).map((q, i) => `${i + 1}. "${q}"`).join('\n')}

Q&A TYPE: ${qaType}
${articleHeadline ? `ARTICLE CONTEXT: ${articleHeadline}` : ''}

Requirements:
- Keep the same core meaning and intent
- Make it clearly different from the existing questions
- Use different phrasing, word order, or synonyms
- Stay natural and SEO-friendly in ${languageName}
- Return ONLY the rephrased question, nothing else`;

  const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: `You are a ${languageName} language expert. Rephrase questions to be unique while preserving meaning.` },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
    }),
  }, 30000);

  if (!response.ok) {
    throw new Error(`Rephrase API error: ${response.status}`);
  }

  const data = await response.json();
  const rephrased = data.choices?.[0]?.message?.content?.trim();
  
  if (!rephrased) {
    throw new Error('No rephrased content returned');
  }

  // Clean up any quotes or extra formatting
  return rephrased.replace(/^["']|["']$/g, '').trim();
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

    console.log(`[TranslateQAs] 🚀 Starting BULLETPROOF translation to ${targetLanguage} for cluster ${clusterId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all English Q&As for this cluster
    const { data: englishQAs, error: qaError } = await supabase
      .from('qa_pages')
      .select('*')
      .eq('cluster_id', clusterId)
      .eq('language', 'en')
      .order('source_article_id', { ascending: true })
      .order('qa_type', { ascending: true });

    if (qaError || !englishQAs) {
      throw new Error(`Failed to fetch English Q&As: ${qaError?.message || 'No data'}`);
    }

    console.log(`[TranslateQAs] Found ${englishQAs.length} English Q&As`);

    if (englishQAs.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No English Q&As found to translate',
        translated: 0,
        resumed: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resume capability - check which Q&As already exist
    const { data: existingQAs } = await supabase
      .from('qa_pages')
      .select('hreflang_group_id')
      .eq('cluster_id', clusterId)
      .eq('language', targetLanguage);

    const existingGroupIds = new Set((existingQAs || []).map(q => q.hreflang_group_id));
    const skippedCount = existingGroupIds.size;
    console.log(`[TranslateQAs] ${skippedCount} Q&As already exist in ${targetLanguage} (will skip)`);

    // Filter to only translate missing Q&As
    const qasToTranslate = englishQAs.filter(qa => !existingGroupIds.has(qa.hreflang_group_id));
    console.log(`[TranslateQAs] ${qasToTranslate.length} Q&As need translation`);

    if (qasToTranslate.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: `All Q&As already translated to ${targetLanguage}`,
        translated: 0,
        skipped: skippedCount,
        resumed: skippedCount > 0,
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
    const failedQAIds: string[] = [];

    // BULLETPROOF: Process Q&As ONE AT A TIME with retry logic
    const BATCH_SIZE = 6; // Process 6 Q&As per function invocation (safe limit)
    const qaGroup = qasToTranslate.slice(0, BATCH_SIZE);
    const qasRemaining = qasToTranslate.length - qaGroup.length;
    
    console.log(`[TranslateQAs] Processing ${qaGroup.length} Q&As one-at-a-time (${qasRemaining} remaining after this batch)`);

    for (let i = 0; i < qaGroup.length; i++) {
      const englishQA = qaGroup[i];
      const qaIndex = skippedCount + i + 1;
      
      console.log(`[TranslateQAs] ━━━ Q&A ${qaIndex}/24: ${englishQA.qa_type} ━━━`);

      try {
        // Prepare Q&A content for translation
        const qaContent: QAContent = {
          id: englishQA.id,
          question_main: englishQA.question_main,
          answer_main: englishQA.answer_main,
          meta_title: englishQA.meta_title,
          meta_description: englishQA.meta_description,
          speakable_answer: englishQA.speakable_answer,
          featured_image_alt: englishQA.featured_image_alt || 'Property image',
          qa_type: englishQA.qa_type,
        };

        // BULLETPROOF: Translate single Q&A with retry
        const translation = await translateSingleQA(qaContent, targetLanguage);

        // Find target article for this Q&A
        const englishArticleHreflang = englishArticleHreflangMap.get(englishQA.source_article_id);
        let targetArticle = englishArticleHreflang ? articlesByHreflang.get(englishArticleHreflang) : null;

        // Fallback to any target article if no hreflang match
        if (!targetArticle) {
          console.log(`[TranslateQAs] ⚠️ No hreflang match for article ${englishQA.source_article_id}, using fallback...`);
          targetArticle = targetArticles?.[0];
          
          if (!targetArticle) {
            console.error(`[TranslateQAs] ❌ No ${targetLanguage} article found at all`);
            errors.push(`No ${targetLanguage} article found for Q&A ${englishQA.qa_type}`);
            failedQAIds.push(englishQA.id);
            continue;
          }
          
          // Check if Q&A already exists for fallback article
          const { data: existingFallbackQA } = await supabase
            .from('qa_pages')
            .select('id')
            .eq('source_article_id', targetArticle.id)
            .eq('qa_type', englishQA.qa_type)
            .eq('language', targetLanguage)
            .neq('status', 'archived')
            .limit(1)
            .maybeSingle();
          
          if (existingFallbackQA) {
            console.log(`[TranslateQAs] ⚠️ Skipping - Q&A already exists for fallback article`);
            continue;
          }
        }

        const slug = generateSlug(translation.question, englishQA.qa_type, targetLanguage);

        // Build translated Q&A record
        const now = new Date().toISOString();
        const translatedQARecord = {
          source_article_id: targetArticle.id,
          cluster_id: clusterId,
          language: targetLanguage,
          qa_type: englishQA.qa_type,
          title: translation.question,
          slug: slug,
          question_main: translation.question,
          answer_main: translation.answer,
          meta_title: translation.metaTitle,
          meta_description: translation.metaDescription,
          speakable_answer: translation.speakableAnswer,
          featured_image_url: englishQA.featured_image_url,
          featured_image_alt: translation.imageAlt,
          hreflang_group_id: englishQA.hreflang_group_id,
          source_language: 'en',
          translations: {},
          related_qas: [],
          internal_links: englishQA.internal_links || [],
          funnel_stage: englishQA.funnel_stage,
          status: 'published',
          source_article_slug: targetArticle.slug,
          author_id: '738c1e24-025b-4f15-ac7c-541bb8a5dade',
          date_published: now,
          date_modified: now,
        };

        // Check for question collisions
        const { data: allExistingQAs } = await supabase
          .from('qa_pages')
          .select('id, hreflang_group_id, question_main')
          .eq('cluster_id', clusterId)
          .eq('language', targetLanguage);

        const existingQuestionTexts = new Set((allExistingQAs || []).map(q => q.question_main));
        const existingByQuestion = (allExistingQAs || []).filter(q => q.question_main === translation.question);
        
        const safeToAdopt = existingByQuestion.find(q => 
          q.hreflang_group_id === null || 
          q.hreflang_group_id === englishQA.hreflang_group_id
        );
        const belongsToDifferentGroup = existingByQuestion.find(q => 
          q.hreflang_group_id && q.hreflang_group_id !== englishQA.hreflang_group_id
        );

        let finalQuestion = translation.question;
        
        if (belongsToDifferentGroup && !safeToAdopt) {
          console.log(`[TranslateQAs] ⚠️ Question collision detected, rephrasing...`);
          
          let rephrased = false;
          for (let attempt = 1; attempt <= 3 && !rephrased; attempt++) {
            try {
              const newQuestion = await rephraseQuestion(
                translation.question,
                Array.from(existingQuestionTexts),
                targetLanguage,
                englishQA.qa_type,
                englishQA.question_main
              );
              
              if (!existingQuestionTexts.has(newQuestion)) {
                finalQuestion = newQuestion;
                rephrased = true;
                console.log(`[TranslateQAs] ✅ Rephrased successfully`);
              }
            } catch (rephraseError) {
              console.error(`[TranslateQAs] Rephrase attempt ${attempt} failed`);
            }
          }
          
          if (!rephrased) {
            const suffix = ` (${englishQA.qa_type})`;
            finalQuestion = translation.question + suffix;
            if (existingQuestionTexts.has(finalQuestion)) {
              const uuidFragment = englishQA.hreflang_group_id.substring(0, 8);
              finalQuestion = translation.question + ` [${uuidFragment}]`;
            }
          }
        }

        if (safeToAdopt) {
          // Update existing orphan record
          const { error: updateError } = await supabase
            .from('qa_pages')
            .update({
              ...translatedQARecord,
              question_main: finalQuestion,
              title: finalQuestion,
              hreflang_group_id: englishQA.hreflang_group_id,
            })
            .eq('id', safeToAdopt.id);

          if (updateError) {
            console.error(`[TranslateQAs] ❌ Update error:`, updateError);
            errors.push(`${englishQA.qa_type}: ${updateError.message}`);
            failedQAIds.push(englishQA.id);
          } else {
            console.log(`[TranslateQAs] ✅ Adopted existing Q&A`);
            translatedQAs.push(safeToAdopt.id);
          }
        } else {
          // Insert new record
          const { data: insertedQA, error: insertError } = await supabase
            .from('qa_pages')
            .insert({
              ...translatedQARecord,
              question_main: finalQuestion,
              title: finalQuestion,
            })
            .select('id')
            .single();

          if (insertError) {
            console.error(`[TranslateQAs] ❌ Insert error:`, insertError);
            errors.push(`${englishQA.qa_type}: ${insertError.message}`);
            failedQAIds.push(englishQA.id);
          } else {
            console.log(`[TranslateQAs] ✅ Created Q&A: ${slug}`);
            translatedQAs.push(insertedQA.id);
          }
        }

        // Delay between Q&As to avoid rate limiting
        if (i < qaGroup.length - 1) {
          await sleep(DELAY_BETWEEN_QAS);
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[TranslateQAs] ❌ Failed ${englishQA.qa_type} after all retries:`, errorMessage);
        errors.push(`${englishQA.qa_type}: ${errorMessage}`);
        failedQAIds.push(englishQA.id);
        // Continue with next Q&A instead of stopping
      }
    }

    // Sync translations JSONB for all affected hreflang groups
    console.log(`[TranslateQAs] Syncing translations JSONB...`);

    const affectedGroupIds = [...new Set(qaGroup.map(qa => qa.hreflang_group_id))];
    
    for (const groupId of affectedGroupIds) {
      try {
        const { data: groupQAs } = await supabase
          .from('qa_pages')
          .select('id, language, slug')
          .eq('hreflang_group_id', groupId);

        if (!groupQAs || groupQAs.length === 0) continue;

        const translations: Record<string, string> = {};
        for (const qa of groupQAs) {
          translations[qa.language] = qa.slug;
        }

        await supabase
          .from('qa_pages')
          .update({ translations })
          .eq('hreflang_group_id', groupId);
      } catch (error) {
        console.error(`[TranslateQAs] Error syncing group ${groupId}:`, error);
      }
    }

    // Update cluster progress in database
    try {
      const { data: progressData } = await supabase
        .from('cluster_completion_progress')
        .select('languages_status')
        .eq('cluster_id', clusterId)
        .single();

      const currentStatus = (progressData?.languages_status as Record<string, unknown>) || {};
      const qaGeneration = (currentStatus.qa_generation as Record<string, unknown>) || {};
      const translatedLangs = (qaGeneration.languages_translated as string[]) || [];
      
      if (!translatedLangs.includes(targetLanguage)) {
        translatedLangs.push(targetLanguage);
      }

      await supabase
        .from('cluster_completion_progress')
        .upsert({
          cluster_id: clusterId,
          languages_status: {
            ...currentStatus,
            qa_generation: {
              ...qaGeneration,
              languages_translated: translatedLangs,
              last_updated: new Date().toISOString(),
            },
          },
          last_updated: new Date().toISOString(),
        });
    } catch (error) {
      console.error(`[TranslateQAs] Error updating progress:`, error);
    }

    // Get the ACTUAL count from database after all operations
    const { count: actualCount } = await supabase
      .from('qa_pages')
      .select('*', { count: 'exact', head: true })
      .eq('cluster_id', clusterId)
      .eq('language', targetLanguage);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const currentCount = actualCount || 0;
    const remaining = 24 - currentCount;
    const isPartial = remaining > 0;
    
    console.log(`[TranslateQAs] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[TranslateQAs] ✅ Batch complete in ${duration}s`);
    console.log(`[TranslateQAs]    Translated: ${translatedQAs.length}`);
    console.log(`[TranslateQAs]    Failed: ${failedQAIds.length}`);
    console.log(`[TranslateQAs]    Total: ${currentCount}/24 (${remaining} remaining)`);
    console.log(`[TranslateQAs] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return new Response(JSON.stringify({
      success: true,
      partial: isPartial,
      targetLanguage,
      translated: translatedQAs.length,
      failed: failedQAIds.length,
      actualCount: currentCount,
      remaining,
      qasRemaining,
      skipped: skippedCount,
      resumed: skippedCount > 0,
      errors: errors.length > 0 ? errors : undefined,
      durationSeconds: parseFloat(duration),
      message: remaining > 0 
        ? `Now at ${currentCount}/24 Q&As. ${remaining} remaining.`
        : `Completed! All 24 Q&As translated to ${LANGUAGE_NAMES[targetLanguage]}`,
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
