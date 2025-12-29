import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

const ALL_SUPPORTED_LANGUAGES = ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];
const TRANSLATION_LANGUAGES = ['de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];
const ALL_QA_TYPES = ['core', 'decision', 'practical', 'problem'];

/**
 * Translate a Q&A page from English to target language
 */
async function translateQAPage(
  englishQA: any,
  targetLanguage: string,
  lovableApiKey: string
): Promise<any> {
  const targetLanguageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  console.log(`[Translation] Translating to ${targetLanguageName}...`);

  const translationPrompt = `Translate this Q&A page from English to ${targetLanguageName}.

CRITICAL: Translate EVERYTHING while keeping ALL HTML tags intact.

English Q&A Page:

**Title:**
${englishQA.title}

**Main Question:**
${englishQA.question_main}

**Main Answer (HTML):**
${englishQA.answer_main}

**Related Q&As:**
${JSON.stringify(englishQA.related_qas, null, 2)}

**Meta Title:**
${englishQA.meta_title}

**Meta Description:**
${englishQA.meta_description}

**Speakable Answer:**
${englishQA.speakable_answer}

---

Respond in JSON format ONLY:
{
  "title": "translated title",
  "slug": "url-friendly-slug-in-${targetLanguage}",
  "question_main": "translated main question",
  "answer_main": "translated HTML answer (keep all tags)",
  "related_qas": [
    {"question": "translated", "answer": "translated"},
    {"question": "translated", "answer": "translated"}
  ],
  "meta_title": "translated (max 60 chars)",
  "meta_description": "translated (max 160 chars)",
  "speakable_answer": "translated (50-80 words)"
}`;

  const MAX_RETRIES = 2;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `You are an expert translator. Translate all content to ${targetLanguageName}. Return only valid JSON.` },
            { role: 'user', content: translationPrompt }
          ],
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || '';
      
      // Robust JSON cleanup
      content = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/[\x00-\x1F\x7F]/g, '');

      let translated;
      try {
        translated = JSON.parse(content);
      } catch {
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          translated = JSON.parse(content.slice(start, end + 1));
        } else {
          throw new Error('Failed to parse translation JSON');
        }
      }

      // Merge with original English data, replacing translated fields
      return {
        ...englishQA,
        language: targetLanguage,
        title: translated.title || englishQA.title,
        slug: translated.slug || `${englishQA.slug}-${targetLanguage}`,
        question_main: translated.question_main || englishQA.question_main,
        answer_main: translated.answer_main || englishQA.answer_main,
        related_qas: translated.related_qas || englishQA.related_qas,
        meta_title: (translated.meta_title || englishQA.meta_title).substring(0, 60),
        meta_description: (translated.meta_description || englishQA.meta_description).substring(0, 160),
        speakable_answer: translated.speakable_answer || englishQA.speakable_answer,
      };

    } catch (error) {
      console.error(`[Translation] Attempt ${attempt + 1} failed:`, error);
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Translation failed after all retries');
}

/**
 * Generate English Q&A pages for an article - NOW 4 TYPES
 */
async function generateEnglishQAPages(
  article: any,
  lovableApiKey: string,
  specificTypes?: string[]
): Promise<any[]> {
  console.log(`[Generate] Creating English Q&A pages for: ${article.headline}`);

  const typesToGenerate = specificTypes || ALL_QA_TYPES;
  const typeCount = typesToGenerate.length;

  const prompt = `You are generating ${typeCount} standalone Q&A pages derived from this blog article:

ARTICLE TITLE: ${article.headline}
ARTICLE CONTENT: ${article.detailed_content?.substring(0, 4000)}
LANGUAGE: English

Generate exactly ${typeCount} Q&A pages with DIFFERENT angles:

${typesToGenerate.includes('core') ? `Q&A PAGE (TYPE: "core"):
- Focus: Core explanation, how-to, educational
- Main question should be "What is..." or "How to..." style
- Answer should be comprehensive, helpful, structured

` : ''}${typesToGenerate.includes('decision') ? `Q&A PAGE (TYPE: "decision"):  
- Focus: Decision-making, comparison, best approaches
- Main question should be "Should I...", "Best way to...", "Which is better..." style
- Answer should help readers make informed decisions

` : ''}${typesToGenerate.includes('practical') ? `Q&A PAGE (TYPE: "practical"):
- Focus: Step-by-step guides, practical tips, timing
- Main question should be "When should I...", "How do I...", "What steps..." style
- Answer should provide actionable, practical guidance

` : ''}${typesToGenerate.includes('problem') ? `Q&A PAGE (TYPE: "problem"):
- Focus: Common mistakes, problems to avoid, troubleshooting
- Main question should be "What mistakes...", "What problems...", "How to avoid..." style
- Answer should help readers avoid common pitfalls

` : ''}For EACH Q&A page, return a JSON object with these exact fields:
{
  "qa_type": "${typesToGenerate.join('" or "')}",
  "title": "Full page title (50-60 chars)",
  "slug": "url-friendly-slug",
  "question_main": "The primary question",
  "answer_main": "Complete, citeable, helpful answer in HTML format (300-500 words)",
  "related_qas": [
    {"question": "Related Q1", "answer": "Answer"},
    {"question": "Related Q2", "answer": "Answer"}
  ],
  "speakable_answer": "Short, citation-ready voice answer (50-80 words)",
  "meta_title": "SEO title ≤60 chars",
  "meta_description": "SEO description ≤160 chars"
}

Return a JSON array with exactly ${typeCount} objects. No markdown, no explanation, just valid JSON.`;

  const MAX_RETRIES = 2;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are an expert SEO content generator. Return only valid JSON, no markdown or explanation.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4096,
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      let content = aiData.choices?.[0]?.message?.content || '';
      
      content = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/[\x00-\x1F\x7F]/g, '');

      let qaPagesData;
      try {
        qaPagesData = JSON.parse(content);
      } catch {
        const start = content.indexOf('[');
        const end = content.lastIndexOf(']');
        if (start !== -1 && end !== -1 && end > start) {
          qaPagesData = JSON.parse(content.slice(start, end + 1));
        } else {
          throw new Error('Failed to parse AI response as JSON');
        }
      }

      if (!Array.isArray(qaPagesData) || qaPagesData.length === 0) {
        throw new Error('AI response is not a valid array of QA pages');
      }

      return qaPagesData.map((qa: any) => ({
        ...qa,
        language: 'en',
        source_article_id: article.id,
        source_article_slug: article.slug,
      }));

    } catch (error) {
      console.error(`[Generate] Attempt ${attempt + 1} failed:`, error);
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('English QA generation failed after all retries');
}

/**
 * Background processing for completeMissing mode
 * Processes all articles and updates job progress in database
 */
async function processAllMissingQAs(
  supabase: any,
  jobId: string,
  articleIds: string[],
  targetLanguages: string[],
  openaiApiKey: string,
  clusterId?: string
) {
  console.log(`[Background] Starting background processing for job ${jobId}, ${articleIds.length} articles`);
  
  let totalGenerated = 0;
  let processedArticles = 0;
  
  try {
    for (const articleId of articleIds) {
      // Get article data
      const { data: article, error: articleError } = await supabase
        .from('blog_articles')
        .select('id, headline, detailed_content, meta_description, language, featured_image_url, featured_image_alt, featured_image_caption, slug, author_id, cluster_id, category')
        .eq('id', articleId)
        .in('status', ['draft', 'published'])
        .single();
      
      if (articleError || !article) {
        console.log(`[Background] Article ${articleId} not found, skipping`);
        processedArticles++;
        continue;
      }

      // Update job with current article
      await supabase
        .from('qa_generation_jobs')
        .update({
          current_article_headline: article.headline,
          processed_articles: processedArticles,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      // Get existing Q&A pages for this article
      const { data: existingPages } = await supabase
        .from('qa_pages')
        .select('language, qa_type, hreflang_group_id')
        .eq('source_article_id', articleId);

      const existingCombos = new Set((existingPages || []).map((p: any) => `${p.language}_${p.qa_type}`));
      
      // Get or create hreflang groups
      let hreflangGroupCore = existingPages?.find((p: any) => p.qa_type === 'core')?.hreflang_group_id || crypto.randomUUID();
      let hreflangGroupDecision = existingPages?.find((p: any) => p.qa_type === 'decision')?.hreflang_group_id || crypto.randomUUID();
      let hreflangGroupPractical = existingPages?.find((p: any) => p.qa_type === 'practical')?.hreflang_group_id || crypto.randomUUID();
      let hreflangGroupProblem = existingPages?.find((p: any) => p.qa_type === 'problem')?.hreflang_group_id || crypto.randomUUID();
      
      const getHreflangGroup = (qaType: string) => {
        switch (qaType) {
          case 'core': return hreflangGroupCore;
          case 'decision': return hreflangGroupDecision;
          case 'practical': return hreflangGroupPractical;
          case 'problem': return hreflangGroupProblem;
          default: return crypto.randomUUID();
        }
      };
      
      // Find missing combinations
      const missingCombos: { language: string; qaType: string }[] = [];
      for (const lang of targetLanguages) {
        for (const qaType of ALL_QA_TYPES) {
          if (!existingCombos.has(`${lang}_${qaType}`)) {
            missingCombos.push({ language: lang, qaType });
          }
        }
      }

      if (missingCombos.length === 0) {
        console.log(`[Background] All QAs exist for article ${articleId}`);
        processedArticles++;
        continue;
      }

      console.log(`[Background] ${missingCombos.length} missing QAs for article: ${article.headline}`);
      
      // Get or create tracking
      const { data: tracking } = await supabase
        .from('qa_article_tracking')
        .select('id, languages_generated')
        .eq('source_article_id', articleId)
        .single();

      let trackingId = tracking?.id;
      let languagesGenerated = tracking?.languages_generated || [];

      if (!trackingId) {
        const { data: newTracking } = await supabase
          .from('qa_article_tracking')
          .insert({
            source_article_id: article.id,
            source_article_headline: article.headline,
            source_article_slug: article.slug,
            hreflang_group_core: hreflangGroupCore,
            hreflang_group_decision: hreflangGroupDecision,
            languages_generated: [],
            total_qa_pages: 0,
            status: 'in_progress',
          })
          .select()
          .single();
        trackingId = newTracking?.id;
      }

      // Get English QA pages (generate if missing)
      let englishQAPages: any[] = [];
      const missingEnglishTypes = ALL_QA_TYPES.filter(t => !existingCombos.has(`en_${t}`));
      
      if (missingEnglishTypes.length > 0) {
        const newEnglishPages = await generateEnglishQAPages(article, openaiApiKey, missingEnglishTypes);
        const { data: existingEnglish } = await supabase
          .from('qa_pages')
          .select('*')
          .eq('source_article_id', articleId)
          .eq('language', 'en');
        englishQAPages = [...(existingEnglish || []), ...newEnglishPages];
      } else {
        const { data: existingEnglish } = await supabase
          .from('qa_pages')
          .select('*')
          .eq('source_article_id', articleId)
          .eq('language', 'en');
        englishQAPages = existingEnglish || [];
      }

      // Group missing by language
      const missingByLang: Record<string, string[]> = {};
      for (const combo of missingCombos) {
        if (!missingByLang[combo.language]) missingByLang[combo.language] = [];
        missingByLang[combo.language].push(combo.qaType);
      }

      // Generate/translate missing pages
      for (const [lang, qaTypes] of Object.entries(missingByLang)) {
        // Update current language in job
        await supabase
          .from('qa_generation_jobs')
          .update({
            current_language: lang,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        if (lang === 'en') {
          // Save English pages directly
          for (const englishQA of englishQAPages) {
            if (!qaTypes.includes(englishQA.qa_type)) continue;
            
            const { error: insertError } = await supabase
              .from('qa_pages')
              .insert({
                source_article_id: article.id,
                cluster_id: article.cluster_id || clusterId || null,
                language: 'en',
                source_language: 'en',
                hreflang_group_id: getHreflangGroup(englishQA.qa_type),
                tracking_id: trackingId,
                qa_type: englishQA.qa_type,
                title: englishQA.title,
                slug: englishQA.slug,
                canonical_url: `https://www.delsolprimehomes.com/en/qa/${englishQA.slug}`,
                question_main: englishQA.question_main,
                answer_main: englishQA.answer_main,
                related_qas: englishQA.related_qas || [],
                speakable_answer: englishQA.speakable_answer,
                meta_title: englishQA.meta_title?.substring(0, 60),
                meta_description: englishQA.meta_description?.substring(0, 160),
                featured_image_url: article.featured_image_url,
                featured_image_alt: article.featured_image_alt,
                source_article_slug: article.slug,
                author_id: article.author_id,
                category: article.category,
                status: 'draft',
              });

            if (!insertError) {
              totalGenerated++;
              // Update progress
              await supabase
                .from('qa_generation_jobs')
                .update({
                  generated_faq_pages: totalGenerated,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', jobId);
            }
          }
        } else {
          // Translate from English
          for (const englishQA of englishQAPages) {
            if (!qaTypes.includes(englishQA.qa_type)) continue;
            
            try {
              const translatedQA = await translateQAPage(englishQA, lang, openaiApiKey);
              
              const { error: insertError } = await supabase
                .from('qa_pages')
                .insert({
                  source_article_id: article.id,
                  cluster_id: article.cluster_id || clusterId || null,
                  language: lang,
                  source_language: 'en',
                  hreflang_group_id: getHreflangGroup(translatedQA.qa_type),
                  tracking_id: trackingId,
                  qa_type: translatedQA.qa_type,
                  title: translatedQA.title,
                  slug: translatedQA.slug,
                  canonical_url: `https://www.delsolprimehomes.com/${lang}/qa/${translatedQA.slug}`,
                  question_main: translatedQA.question_main,
                  answer_main: translatedQA.answer_main,
                  related_qas: translatedQA.related_qas || [],
                  speakable_answer: translatedQA.speakable_answer,
                  meta_title: translatedQA.meta_title?.substring(0, 60),
                  meta_description: translatedQA.meta_description?.substring(0, 160),
                  featured_image_url: article.featured_image_url,
                  featured_image_alt: article.featured_image_alt,
                  source_article_slug: article.slug,
                  author_id: article.author_id,
                  category: article.category,
                  status: 'draft',
                });

              if (!insertError) {
                totalGenerated++;
                // Update progress
                await supabase
                  .from('qa_generation_jobs')
                  .update({
                    generated_faq_pages: totalGenerated,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', jobId);
              }
            } catch (error) {
              console.error(`[Background] Failed to translate to ${lang}:`, error);
            }
          }
        }

        if (!languagesGenerated.includes(lang)) {
          languagesGenerated.push(lang);
        }
      }

      // Update tracking
      if (trackingId) {
        await supabase
          .from('qa_article_tracking')
          .update({
            languages_generated: languagesGenerated,
            total_qa_pages: languagesGenerated.length * 4,
            status: 'completed',
          })
          .eq('id', trackingId);
      }

      // Update source blog article with all QA page IDs
      const { data: allQAPages } = await supabase
        .from('qa_pages')
        .select('id')
        .eq('source_article_id', articleId);
      
      if (allQAPages && allQAPages.length > 0) {
        await supabase
          .from('blog_articles')
          .update({ 
            generated_qa_page_ids: allQAPages.map((qa: { id: string }) => qa.id),
            updated_at: new Date().toISOString()
          })
          .eq('id', articleId);
      }

      processedArticles++;
      
      // Update processed count
      await supabase
        .from('qa_generation_jobs')
        .update({
          processed_articles: processedArticles,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    // Mark job as completed
    await supabase
      .from('qa_generation_jobs')
      .update({
        status: 'completed',
        processed_articles: processedArticles,
        generated_faq_pages: totalGenerated,
        current_article_headline: null,
        current_language: null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`[Background] Job ${jobId} completed. Generated ${totalGenerated} QA pages.`);

  } catch (error) {
    console.error(`[Background] Job ${jobId} failed:`, error);
    
    await supabase
      .from('qa_generation_jobs')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      articleIds, 
      mode = 'single', 
      languages = ['en'], 
      jobId: existingJobId, 
      resumeFromIndex = 0, 
      completeMissing = false,
      clusterId,
      backgroundMode = false 
    } = await req.json();

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'articleIds is required and must be a non-empty array' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine target languages
    const isAllLanguages = languages.includes('all') || languages[0] === 'all';
    const targetLanguages = isAllLanguages ? ALL_SUPPORTED_LANGUAGES : languages;
    const effectiveLanguageCount = targetLanguages.length;

    // BACKGROUND MODE: Return immediately and process in background
    if (completeMissing && backgroundMode) {
      console.log(`[Main] Starting BACKGROUND processing for ${articleIds.length} articles`);
      
      // Calculate expected total (articles × 4 QA types × languages)
      const maxPossible = articleIds.length * ALL_QA_TYPES.length * targetLanguages.length;
      
      // Create job record
      const { data: job, error: jobError } = await supabase
        .from('qa_generation_jobs')
        .insert({
          user_id: null,
          status: 'running',
          mode: 'background',
          languages: targetLanguages,
          article_ids: articleIds,
          cluster_id: clusterId || null,
          total_articles: articleIds.length,
          total_faq_pages: maxPossible,
          processed_articles: 0,
          generated_faq_pages: 0,
          current_article_headline: 'Starting...',
          current_language: null,
          results: [],
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (jobError) {
        console.error('[Main] Failed to create job:', jobError);
        throw jobError;
      }

      const jobId = job.id;
      console.log(`[Main] Created background job ${jobId}`);

      // Start background processing without awaiting
      // @ts-ignore - EdgeRuntime.waitUntil is a Deno Deploy feature
      EdgeRuntime.waitUntil(
        processAllMissingQAs(supabase, jobId, articleIds, targetLanguages, openaiApiKey, clusterId)
      );

      // Return immediately with job ID
      return new Response(JSON.stringify({
        success: true,
        jobId,
        status: 'running',
        message: `Background processing started for ${articleIds.length} articles`,
        totalArticles: articleIds.length,
        totalExpected: maxPossible,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // COMPLETE MISSING MODE (synchronous, single article)
    if (completeMissing && articleIds.length === 1) {
      const articleId = articleIds[0];
      console.log(`[CompleteMissing] Finding missing pages for article ${articleId}`);
      
      const { data: article, error: articleError } = await supabase
        .from('blog_articles')
        .select('id, headline, detailed_content, meta_description, language, featured_image_url, featured_image_alt, featured_image_caption, slug, author_id, cluster_id, category')
        .eq('id', articleId)
        .in('status', ['draft', 'published'])
        .single();
      
      if (articleError || !article) {
        return new Response(JSON.stringify({ success: false, error: 'Article not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: existingPages } = await supabase
        .from('qa_pages')
        .select('language, qa_type, hreflang_group_id')
        .eq('source_article_id', articleId);

      const existingCombos = new Set((existingPages || []).map((p: any) => `${p.language}_${p.qa_type}`));
      
      let hreflangGroupCore = existingPages?.find((p: any) => p.qa_type === 'core')?.hreflang_group_id || crypto.randomUUID();
      let hreflangGroupDecision = existingPages?.find((p: any) => p.qa_type === 'decision')?.hreflang_group_id || crypto.randomUUID();
      let hreflangGroupPractical = existingPages?.find((p: any) => p.qa_type === 'practical')?.hreflang_group_id || crypto.randomUUID();
      let hreflangGroupProblem = existingPages?.find((p: any) => p.qa_type === 'problem')?.hreflang_group_id || crypto.randomUUID();
      
      const getHreflangGroup = (qaType: string) => {
        switch (qaType) {
          case 'core': return hreflangGroupCore;
          case 'decision': return hreflangGroupDecision;
          case 'practical': return hreflangGroupPractical;
          case 'problem': return hreflangGroupProblem;
          default: return crypto.randomUUID();
        }
      };
      
      const missingCombos: { language: string; qaType: string }[] = [];
      for (const lang of targetLanguages) {
        for (const qaType of ALL_QA_TYPES) {
          if (!existingCombos.has(`${lang}_${qaType}`)) {
            missingCombos.push({ language: lang, qaType });
          }
        }
      }

      if (missingCombos.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'All Q&A pages already exist for this article',
          generatedPages: 0,
          missingCombos: [],
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log(`[CompleteMissing] Found ${missingCombos.length} missing combinations`);
      
      let englishQAPages: any[] = [];
      const missingEnglishTypes = ALL_QA_TYPES.filter(t => !existingCombos.has(`en_${t}`));
      
      if (missingEnglishTypes.length > 0) {
        const newEnglishPages = await generateEnglishQAPages(article, openaiApiKey, missingEnglishTypes);
        const { data: existingEnglish } = await supabase
          .from('qa_pages')
          .select('*')
          .eq('source_article_id', articleId)
          .eq('language', 'en');
        englishQAPages = [...(existingEnglish || []), ...newEnglishPages];
      } else {
        const { data: existingEnglish } = await supabase
          .from('qa_pages')
          .select('*')
          .eq('source_article_id', articleId)
          .eq('language', 'en');
        englishQAPages = existingEnglish || [];
      }

      let generatedPages = 0;
      const { data: tracking } = await supabase
        .from('qa_article_tracking')
        .select('id, languages_generated')
        .eq('source_article_id', articleId)
        .single();

      let trackingId = tracking?.id;
      let languagesGenerated = tracking?.languages_generated || [];

      if (!trackingId) {
        const { data: newTracking } = await supabase
          .from('qa_article_tracking')
          .insert({
            source_article_id: article.id,
            source_article_headline: article.headline,
            source_article_slug: article.slug,
            hreflang_group_core: hreflangGroupCore,
            hreflang_group_decision: hreflangGroupDecision,
            languages_generated: [],
            total_qa_pages: 0,
            status: 'in_progress',
          })
          .select()
          .single();
        trackingId = newTracking?.id;
      }

      const missingByLang: Record<string, string[]> = {};
      for (const combo of missingCombos) {
        if (!missingByLang[combo.language]) missingByLang[combo.language] = [];
        missingByLang[combo.language].push(combo.qaType);
      }

      for (const [lang, qaTypes] of Object.entries(missingByLang)) {
        if (lang === 'en') {
          for (const englishQA of englishQAPages) {
            if (!qaTypes.includes(englishQA.qa_type)) continue;
            
            const { error: insertError } = await supabase
              .from('qa_pages')
              .insert({
                source_article_id: article.id,
                cluster_id: article.cluster_id || null,
                language: 'en',
                source_language: 'en',
                hreflang_group_id: getHreflangGroup(englishQA.qa_type),
                tracking_id: trackingId,
                qa_type: englishQA.qa_type,
                title: englishQA.title,
                slug: englishQA.slug,
                canonical_url: `https://www.delsolprimehomes.com/en/qa/${englishQA.slug}`,
                question_main: englishQA.question_main,
                answer_main: englishQA.answer_main,
                related_qas: englishQA.related_qas || [],
                speakable_answer: englishQA.speakable_answer,
                meta_title: englishQA.meta_title?.substring(0, 60),
                meta_description: englishQA.meta_description?.substring(0, 160),
                featured_image_url: article.featured_image_url,
                featured_image_alt: article.featured_image_alt,
                source_article_slug: article.slug,
                author_id: article.author_id,
                category: article.category,
                status: 'draft',
              });

            if (!insertError) {
              generatedPages++;
            }
          }
        } else {
          for (const englishQA of englishQAPages) {
            if (!qaTypes.includes(englishQA.qa_type)) continue;
            
            try {
              const translatedQA = await translateQAPage(englishQA, lang, openaiApiKey);
              
              const { error: insertError } = await supabase
                .from('qa_pages')
                .insert({
                  source_article_id: article.id,
                  cluster_id: article.cluster_id || null,
                  language: lang,
                  source_language: 'en',
                  hreflang_group_id: getHreflangGroup(translatedQA.qa_type),
                  tracking_id: trackingId,
                  qa_type: translatedQA.qa_type,
                  title: translatedQA.title,
                  slug: translatedQA.slug,
                  canonical_url: `https://www.delsolprimehomes.com/${lang}/qa/${translatedQA.slug}`,
                  question_main: translatedQA.question_main,
                  answer_main: translatedQA.answer_main,
                  related_qas: translatedQA.related_qas || [],
                  speakable_answer: translatedQA.speakable_answer,
                  meta_title: translatedQA.meta_title?.substring(0, 60),
                  meta_description: translatedQA.meta_description?.substring(0, 160),
                  featured_image_url: article.featured_image_url,
                  featured_image_alt: article.featured_image_alt,
                  source_article_slug: article.slug,
                  author_id: article.author_id,
                  category: article.category,
                  status: 'draft',
                });

              if (!insertError) {
                generatedPages++;
              }
            } catch (error) {
              console.error(`[CompleteMissing] Failed to translate to ${lang}:`, error);
            }
          }
        }

        if (!languagesGenerated.includes(lang)) {
          languagesGenerated.push(lang);
        }
      }

      if (trackingId) {
        await supabase
          .from('qa_article_tracking')
          .update({
            languages_generated: languagesGenerated,
            total_qa_pages: languagesGenerated.length * 4,
            status: 'completed',
          })
          .eq('id', trackingId);
      }

      if (generatedPages > 0) {
        const { data: allQAPages } = await supabase
          .from('qa_pages')
          .select('id')
          .eq('source_article_id', articleId);
        
        if (allQAPages && allQAPages.length > 0) {
          await supabase
            .from('blog_articles')
            .update({ 
              generated_qa_page_ids: allQAPages.map((qa: { id: string }) => qa.id),
              updated_at: new Date().toISOString()
            })
            .eq('id', articleId);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Generated ${generatedPages} missing Q&A pages using English-first translation`,
        generatedPages,
        missingCombos,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Quick validation: Check for non-English articles
    const { data: articlesToCheck, error: checkError } = await supabase
      .from('blog_articles')
      .select('id, headline, language')
      .in('id', articleIds);

    if (checkError) throw checkError;

    const nonEnglishArticles = (articlesToCheck || []).filter((a: any) => a.language !== 'en');
    if (nonEnglishArticles.length > 0) {
      const nonEnglishHeadlines = nonEnglishArticles.map((a: any) => `${a.headline} (${a.language})`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Q&A generation requires English source articles only. Non-English articles detected.',
        nonEnglishArticles: nonEnglishHeadlines,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let jobId = existingJobId;
    let currentIndex = resumeFromIndex;

    if (!jobId) {
      const { data: job, error: jobError } = await supabase
        .from('qa_generation_jobs')
        .insert({
          user_id: null,
          status: 'running',
          mode,
          languages,
          article_ids: articleIds,
          total_articles: articleIds.length,
          total_faq_pages: articleIds.length * 2 * effectiveLanguageCount,
          processed_articles: 0,
          generated_faq_pages: 0,
          results: [],
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (jobError) throw jobError;
      jobId = job.id;
      console.log(`[Main] Created new job ${jobId}`);
    } else {
      const { data: existingJob } = await supabase
        .from('qa_generation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (existingJob) {
        currentIndex = existingJob.processed_articles || 0;
        console.log(`[Main] Resuming job ${jobId} from article index ${currentIndex}`);
        
        await supabase
          .from('qa_generation_jobs')
          .update({ 
            status: 'running',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
    }

    if (currentIndex >= articleIds.length) {
      await supabase
        .from('qa_generation_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return new Response(JSON.stringify({
        success: true,
        jobId,
        status: 'completed',
        message: 'All articles already processed',
        processedArticles: currentIndex,
        totalArticles: articleIds.length,
        continueProcessing: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process one article at a time (non-background mode)
    const articleIdToProcess = articleIds[currentIndex];
    
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, headline, detailed_content, meta_description, language, featured_image_url, featured_image_alt, featured_image_caption, slug, author_id, cluster_id, category')
      .eq('id', articleIdToProcess)
      .in('status', ['draft', 'published']);

    if (articlesError) throw articlesError;
    
    const article = articles?.[0];
    if (!article) {
      currentIndex++;
      await supabase
        .from('qa_generation_jobs')
        .update({
          processed_articles: currentIndex,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return new Response(JSON.stringify({
        success: true,
        jobId,
        status: 'running',
        message: `Article ${articleIdToProcess} not found, skipped`,
        processedArticles: currentIndex,
        totalArticles: articleIds.length,
        continueProcessing: currentIndex < articleIds.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Legacy processOneArticle function for non-background mode
    const result = await processOneArticleLegacy(supabase, article, targetLanguages, openaiApiKey, jobId);
    
    currentIndex++;
    const { data: jobData } = await supabase
      .from('qa_generation_jobs')
      .select('generated_faq_pages, results')
      .eq('id', jobId)
      .single();

    const newGeneratedPages = (jobData?.generated_faq_pages || 0) + result.generatedPages;
    const existingResults = jobData?.results || [];
    const newResults = [...existingResults, {
      articleId: article.id,
      headline: article.headline,
      success: result.success,
      generatedPages: result.generatedPages,
      error: result.error,
    }];

    const isComplete = currentIndex >= articleIds.length;

    await supabase
      .from('qa_generation_jobs')
      .update({
        processed_articles: currentIndex,
        generated_faq_pages: newGeneratedPages,
        results: newResults,
        status: isComplete ? 'completed' : 'running',
        completed_at: isComplete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`[Main] Article ${currentIndex}/${articleIds.length} processed. Pages: ${result.generatedPages}. Continue: ${!isComplete}`);

    return new Response(JSON.stringify({
      success: true,
      jobId,
      status: isComplete ? 'completed' : 'running',
      message: isComplete 
        ? `Completed! Generated ${newGeneratedPages} Q&A pages using English-first translation` 
        : `Processed article ${currentIndex}/${articleIds.length}`,
      processedArticles: currentIndex,
      totalArticles: articleIds.length,
      generatedPages: newGeneratedPages,
      continueProcessing: !isComplete,
      lastArticle: {
        id: article.id,
        headline: article.headline,
        pagesGenerated: result.generatedPages,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Q&A generation:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Legacy process one article function (kept for backwards compatibility with non-background mode)
 */
async function processOneArticleLegacy(
  supabase: any,
  article: any,
  targetLanguages: string[],
  lovableApiKey: string,
  jobId: string
): Promise<{ success: boolean; generatedPages: number; error?: string }> {
  console.log(`[Process] Processing article: ${article.headline}`);
  let generatedPages = 0;

  try {
    const { data: existingTracking } = await supabase
      .from('qa_article_tracking')
      .select('*')
      .eq('source_article_id', article.id)
      .single();

    let hreflangGroupCore: string;
    let hreflangGroupDecision: string;
    let existingLanguages: string[] = [];
    let trackingId: string;

    if (existingTracking) {
      hreflangGroupCore = existingTracking.hreflang_group_core;
      hreflangGroupDecision = existingTracking.hreflang_group_decision;
      existingLanguages = existingTracking.languages_generated || [];
      trackingId = existingTracking.id;
      
      await supabase
        .from('qa_article_tracking')
        .update({ status: 'in_progress' })
        .eq('id', trackingId);
    } else {
      hreflangGroupCore = crypto.randomUUID();
      hreflangGroupDecision = crypto.randomUUID();
      
      const { data: newTracking, error: trackingError } = await supabase
        .from('qa_article_tracking')
        .insert({
          source_article_id: article.id,
          source_article_headline: article.headline,
          source_article_slug: article.slug,
          hreflang_group_core: hreflangGroupCore,
          hreflang_group_decision: hreflangGroupDecision,
          languages_generated: [],
          total_qa_pages: 0,
          status: 'in_progress',
        })
        .select()
        .single();

      if (trackingError) {
        throw trackingError;
      }
      
      trackingId = newTracking.id;
    }

    const languagesToGenerate = targetLanguages.filter((lang: string) => !existingLanguages.includes(lang));
    
    if (languagesToGenerate.length === 0) {
      return { success: true, generatedPages: 0 };
    }

    let englishQAPages: any[] = [];
    
    if (languagesToGenerate.includes('en')) {
      englishQAPages = await generateEnglishQAPages(article, lovableApiKey);
    } else {
      const { data: existingEnglish } = await supabase
        .from('qa_pages')
        .select('*')
        .eq('source_article_id', article.id)
        .eq('language', 'en');
      
      if (existingEnglish && existingEnglish.length > 0) {
        englishQAPages = existingEnglish;
      } else {
        englishQAPages = await generateEnglishQAPages(article, lovableApiKey);
      }
    }

    const allQAPages: any[] = [];

    if (languagesToGenerate.includes('en')) {
      for (const englishQA of englishQAPages) {
        allQAPages.push({
          ...englishQA,
          hreflang_group_id: englishQA.qa_type === 'core' ? hreflangGroupCore : hreflangGroupDecision,
          tracking_id: trackingId,
        });
      }
      existingLanguages.push('en');
    }

    const translationLanguages = languagesToGenerate.filter((lang: string) => lang !== 'en');
    
    for (const targetLang of translationLanguages) {
      for (const englishQA of englishQAPages) {
        try {
          const translatedQA = await translateQAPage(englishQA, targetLang, lovableApiKey);
          
          allQAPages.push({
            ...translatedQA,
            hreflang_group_id: translatedQA.qa_type === 'core' ? hreflangGroupCore : hreflangGroupDecision,
            tracking_id: trackingId,
            source_article_id: article.id,
            source_article_slug: article.slug,
          });
        } catch (error) {
          console.error(`[Process] Failed to translate ${englishQA.qa_type} to ${targetLang}:`, error);
        }
      }
      
      existingLanguages.push(targetLang);
    }

    for (const qaData of allQAPages) {
      const baseSlug = qaData.slug || `qa-${article.slug}-${qaData.qa_type}`;
      
      const { data: existing } = await supabase
        .from('qa_pages')
        .select('id')
        .eq('slug', baseSlug)
        .eq('language', qaData.language)
        .single();

      if (existing) {
        continue;
      }

      const { error: insertError } = await supabase
        .from('qa_pages')
        .insert({
          source_article_id: article.id,
          cluster_id: article.cluster_id || null,
          language: qaData.language,
          source_language: 'en',
          hreflang_group_id: qaData.hreflang_group_id,
          tracking_id: trackingId,
          qa_type: qaData.qa_type,
          title: qaData.title,
          slug: baseSlug,
          canonical_url: `https://www.delsolprimehomes.com/${qaData.language}/qa/${baseSlug}`,
          question_main: qaData.question_main,
          answer_main: qaData.answer_main,
          related_qas: qaData.related_qas || [],
          speakable_answer: qaData.speakable_answer,
          meta_title: qaData.meta_title?.substring(0, 60) || qaData.title.substring(0, 60),
          meta_description: qaData.meta_description?.substring(0, 160) || '',
          featured_image_url: article.featured_image_url,
          featured_image_alt: article.featured_image_alt || qaData.title,
          featured_image_caption: article.featured_image_caption,
          source_article_slug: article.slug,
          author_id: article.author_id,
          category: article.category,
          status: 'draft',
        });

      if (insertError) {
        console.error('[Process] Insert error:', insertError);
        continue;
      }

      generatedPages++;
    }

    const totalQaPages = existingLanguages.length * 2;
    await supabase
      .from('qa_article_tracking')
      .update({
        languages_generated: existingLanguages,
        total_qa_pages: totalQaPages,
        status: 'completed',
      })
      .eq('id', trackingId);

    for (const groupId of [hreflangGroupCore, hreflangGroupDecision]) {
      const { data: pagesInGroup } = await supabase
        .from('qa_pages')
        .select('id, language, slug')
        .eq('hreflang_group_id', groupId);
      
      if (pagesInGroup && pagesInGroup.length > 0) {
        const translations: Record<string, string> = {};
        for (const p of pagesInGroup) {
          translations[p.language] = p.slug;
        }
        
        for (const p of pagesInGroup) {
          await supabase
            .from('qa_pages')
            .update({ translations })
            .eq('id', p.id);
        }
      }
    }

    if (generatedPages > 0) {
      const { data: generatedQAPages } = await supabase
        .from('qa_pages')
        .select('id')
        .eq('source_article_id', article.id);
      
      if (generatedQAPages && generatedQAPages.length > 0) {
        const qaPageIds = generatedQAPages.map((qa: { id: string }) => qa.id);
        
        await supabase
          .from('blog_articles')
          .update({ 
            generated_qa_page_ids: qaPageIds,
            updated_at: new Date().toISOString()
          })
          .eq('id', article.id);
      }
    }

    return { success: true, generatedPages };

  } catch (error) {
    console.error(`[Process] Error processing article ${article.id}:`, error);
    return { 
      success: false, 
      generatedPages, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
