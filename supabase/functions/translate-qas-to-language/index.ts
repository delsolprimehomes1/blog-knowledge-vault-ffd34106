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

// ENHANCEMENT 1: Batch translation - translate 4 Q&As in a single API call
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
  id: string;
  question: string;
  answer: string;
  metaTitle: string;
  metaDescription: string;
  speakableAnswer: string;
  imageAlt: string;
}

async function translateQABatch(
  qaGroup: QAContent[],
  targetLanguage: string
): Promise<TranslatedQAContent[]> {
  const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  
  const qasForPrompt = qaGroup.map(qa => ({
    id: qa.id,
    question: qa.question_main,
    answer: qa.answer_main,
    metaTitle: qa.meta_title,
    metaDescription: qa.meta_description,
    speakableAnswer: qa.speakable_answer,
    imageAlt: qa.featured_image_alt || 'Property image',
  }));

  const prompt = `Translate these ${qaGroup.length} Q&As to ${languageName}. Keep the same meaning and SEO optimization.

INPUT Q&As:
${JSON.stringify(qasForPrompt, null, 2)}

Return a JSON object with "translations" array containing each translated Q&A with SAME id:
{
  "translations": [
    {
      "id": "original-id-here",
      "question": "translated question",
      "answer": "translated answer (keep same structure and length)",
      "metaTitle": "translated SEO title under 60 chars",
      "metaDescription": "translated SEO description 120-155 chars",
      "speakableAnswer": "translated voice answer under 100 words",
      "imageAlt": "translated alt text"
    }
  ]
}`;

  // Use Lovable AI Gateway instead of direct OpenAI
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
      max_tokens: 6000,
    }),
  }, 120000);

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
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
  return parsed.translations || [];
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
${existingQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

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

    console.log(`[TranslateQAs] Starting BATCH translation to ${targetLanguage} for cluster ${clusterId}`);

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

    // ENHANCEMENT 2: Resume capability - check which Q&As already exist
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

    // Process fixed batch of 4 Q&As regardless of which article they belong to
    const BATCH_SIZE = 4;
    const qaGroup = qasToTranslate.slice(0, BATCH_SIZE);
    const qasRemaining = qasToTranslate.length - qaGroup.length;
    
    console.log(`[TranslateQAs] Processing batch of ${qaGroup.length} Q&As (${qasRemaining} remaining after this batch)`);

    try {
      // Prepare Q&As for batch translation
      const qaContents: QAContent[] = qaGroup.map(qa => ({
        id: qa.id,
        question_main: qa.question_main,
        answer_main: qa.answer_main,
        meta_title: qa.meta_title,
        meta_description: qa.meta_description,
        speakable_answer: qa.speakable_answer,
        featured_image_alt: qa.featured_image_alt || 'Property image',
        qa_type: qa.qa_type,
      }));

      // Batch translate all Q&As in this batch
      const translations = await translateQABatch(qaContents, targetLanguage);
      console.log(`[TranslateQAs] Received ${translations.length} translations`);
      console.log(`[TranslateQAs] Sent IDs: ${qaContents.map(q => q.id).join(', ')}`);
      console.log(`[TranslateQAs] Received IDs: ${translations.map(t => t.id).join(', ')}`);

      // Create translation lookup by ID
      const translationMap = new Map(translations.map(t => [t.id, t]));

      // Insert each translated Q&A (may be from different articles)
      for (let i = 0; i < qaGroup.length; i++) {
        const englishQA = qaGroup[i];
        let translation = translationMap.get(englishQA.id);
        
        // Fallback: If ID lookup fails but array lengths match, use index-based matching
        if (!translation && translations.length === qaGroup.length) {
          console.log(`[TranslateQAs] Using index-based fallback for ${englishQA.qa_type} (index ${i})`);
          translation = translations[i];
        }
        
        // Fallback for single item
        if (!translation && qaGroup.length === 1 && translations.length === 1) {
          console.log(`[TranslateQAs] Using single-item fallback for ${englishQA.qa_type}`);
          translation = translations[0];
        }
        
        if (!translation) {
          console.error(`[TranslateQAs] ❌ No translation found for ${englishQA.qa_type} (ID: ${englishQA.id})`);
          errors.push(`Missing translation for ${englishQA.qa_type}`);
          continue;
        }

        // Find target article for THIS specific Q&A
        const englishArticleHreflang = englishArticleHreflangMap.get(englishQA.source_article_id);
        const targetArticle = englishArticleHreflang ? articlesByHreflang.get(englishArticleHreflang) : null;

        if (!targetArticle) {
          // FALLBACK: Use the English article's source_article_id and find ANY target language article
          console.log(`[TranslateQAs] ⚠️ No hreflang match for article ${englishQA.source_article_id}, trying fallback...`);
          
          // Try to find a target article by cluster_id directly
          const fallbackArticle = targetArticles?.[0];
          if (!fallbackArticle) {
            console.error(`[TranslateQAs] ❌ No ${targetLanguage} article found at all for cluster ${clusterId}`);
            errors.push(`No ${targetLanguage} article found for Q&A from article ${englishQA.source_article_id}`);
            continue;
          }
          
          console.log(`[TranslateQAs] Using fallback article: ${fallbackArticle.id}`);
          
          // Use fallback article
          const slug = generateSlug(translation.question, englishQA.qa_type, targetLanguage);
          
          // Build translated Q&A record with fallback article
          const now = new Date().toISOString();
          const translatedQARecord = {
            source_article_id: fallbackArticle.id,
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
            source_article_slug: fallbackArticle.slug,
            author_id: '738c1e24-025b-4f15-ac7c-541bb8a5dade',
            date_published: now,
            date_modified: now,
          };

          // Insert directly with fallback
          const { data: insertedQA, error: insertError } = await supabase
            .from('qa_pages')
            .insert(translatedQARecord)
            .select('id')
            .single();

          if (insertError) {
            console.error(`[TranslateQAs] ❌ Insert error (fallback):`, insertError);
            errors.push(`${englishQA.qa_type}: ${insertError.message}`);
          } else {
            console.log(`[TranslateQAs] ✅ Created ${targetLanguage} Q&A (fallback): ${slug}`);
            translatedQAs.push(insertedQA.id);
          }
          continue;
        }

        const slug = generateSlug(translation.question, englishQA.qa_type, targetLanguage);

        // Build translated Q&A record with authority signals (Hans' E-E-A-T requirements)
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
          // Authority signals for AI ranking
          author_id: '738c1e24-025b-4f15-ac7c-541bb8a5dade', // Hans Beeckman
          date_published: now,
          date_modified: now,
        };

        // Fetch ALL existing question_main texts for this cluster/language to check for collisions
        const { data: allExistingQAs } = await supabase
          .from('qa_pages')
          .select('id, hreflang_group_id, question_main')
          .eq('cluster_id', clusterId)
          .eq('language', targetLanguage);

        const existingQuestionTexts = new Set((allExistingQAs || []).map(q => q.question_main));
        
        // Check if this specific question already exists
        const existingByQuestion = (allExistingQAs || []).filter(q => q.question_main === translation.question);
        
        const safeToAdopt = existingByQuestion.find(q => 
          q.hreflang_group_id === null || 
          q.hreflang_group_id === englishQA.hreflang_group_id
        );
        const belongsToDifferentGroup = existingByQuestion.find(q => 
          q.hreflang_group_id && q.hreflang_group_id !== englishQA.hreflang_group_id
        );

        // Determine final question text (may need rephrasing if collision)
        let finalQuestion = translation.question;
        
        if (belongsToDifferentGroup && !safeToAdopt) {
          // Collision detected: same question text belongs to a DIFFERENT hreflang group
          // We need to REPHRASE the question to make it unique
          console.log(`[TranslateQAs] ⚠️ Question collision detected! "${translation.question}" already exists for group ${belongsToDifferentGroup.hreflang_group_id}, but we need group ${englishQA.hreflang_group_id}`);
          
          const MAX_REPHRASE_ATTEMPTS = 3;
          let rephraseAttempt = 0;
          let rephrased = false;
          
          while (rephraseAttempt < MAX_REPHRASE_ATTEMPTS && !rephrased) {
            rephraseAttempt++;
            console.log(`[TranslateQAs] 🔄 Rephrase attempt ${rephraseAttempt}/${MAX_REPHRASE_ATTEMPTS}...`);
            
            try {
              const newQuestion = await rephraseQuestion(
                translation.question,
                Array.from(existingQuestionTexts),
                targetLanguage,
                englishQA.qa_type,
                englishQA.question_main // English headline as context
              );
              
              if (!existingQuestionTexts.has(newQuestion)) {
                console.log(`[TranslateQAs] ✅ Rephrased successfully: "${newQuestion}"`);
                finalQuestion = newQuestion;
                rephrased = true;
              } else {
                console.log(`[TranslateQAs] ⚠️ Rephrased question still collides: "${newQuestion}"`);
              }
            } catch (rephraseError) {
              console.error(`[TranslateQAs] Rephrase attempt ${rephraseAttempt} failed:`, rephraseError);
            }
          }
          
          // If rephrasing failed, add deterministic suffix
          if (!rephrased) {
            const suffix = ` (${englishQA.qa_type})`;
            finalQuestion = translation.question + suffix;
            console.log(`[TranslateQAs] ⚠️ Rephrasing failed, using fallback suffix: "${finalQuestion}"`);
            
            // If STILL colliding, add UUID fragment
            if (existingQuestionTexts.has(finalQuestion)) {
              const uuidFragment = englishQA.hreflang_group_id.substring(0, 8);
              finalQuestion = translation.question + ` [${uuidFragment}]`;
              console.log(`[TranslateQAs] ⚠️ Still colliding, using UUID suffix: "${finalQuestion}"`);
            }
          }
        }

        if (safeToAdopt) {
          // Update existing orphan record with correct hreflang_group_id
          console.log(`[TranslateQAs] Adopting orphan Q&A ${safeToAdopt.id} for group ${englishQA.hreflang_group_id}`);
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
            console.error(`[TranslateQAs] Update error:`, updateError);
            errors.push(`${englishQA.qa_type}: ${updateError.message}`);
            continue;
          }

          console.log(`[TranslateQAs] ✅ Adopted existing ${targetLanguage} Q&A: ${slug}`);
          translatedQAs.push(safeToAdopt.id);
        } else {
          // Insert new record (either no collision, or we rephrased to avoid it)
          const recordToInsert = {
            ...translatedQARecord,
            question_main: finalQuestion,
            title: finalQuestion,
          };
          
          const { data: insertedQA, error: insertError } = await supabase
            .from('qa_pages')
            .insert(recordToInsert)
            .select('id')
            .single();

          if (insertError) {
            // Check if it's a unique constraint violation
            const isUniqueViolation = insertError.code === '23505' || 
              insertError.message?.includes('unique') || 
              insertError.message?.includes('duplicate');
            
            if (isUniqueViolation) {
              console.error(`[TranslateQAs] ❌ Unique constraint violation even after rephrasing! Question: "${finalQuestion}"`);
              errors.push(`${englishQA.qa_type}: Duplicate question - ${insertError.message}`);
            } else {
              console.error(`[TranslateQAs] Insert error:`, insertError);
              errors.push(`${englishQA.qa_type}: ${insertError.message}`);
            }
            continue;
          }

          console.log(`[TranslateQAs] ✅ Created ${targetLanguage} Q&A: ${slug} (group: ${englishQA.hreflang_group_id})`);
          translatedQAs.push(insertedQA.id);
        }
      }

    } catch (error) {
      console.error(`[TranslateQAs] Error translating batch:`, error);
      errors.push(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // After all translations, sync the translations JSONB for all affected hreflang groups
    console.log(`[TranslateQAs] Syncing translations JSONB...`);

    const affectedGroupIds = [...new Set(qasToTranslate.map(qa => qa.hreflang_group_id))];
    
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

    // ENHANCEMENT 4: Update cluster progress in database
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

      console.log(`[TranslateQAs] Updated progress: ${translatedLangs.length} languages translated`);
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
    const isPartial = qasRemaining > 0;
    const currentCount = actualCount || 0;
    const remaining = 24 - currentCount;
    
    if (isPartial) {
      console.log(`[TranslateQAs] ✅ Batch complete in ${duration}s: ${translatedQAs.length} Q&As translated, now at ${currentCount}/24 (${remaining} remaining)`);
    } else {
      console.log(`[TranslateQAs] ✅ All done in ${duration}s: ${currentCount}/24 Q&As in ${targetLanguage}`);
    }

    return new Response(JSON.stringify({
      success: true,
      partial: isPartial || remaining > 0,
      targetLanguage,
      translated: translatedQAs.length,
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
