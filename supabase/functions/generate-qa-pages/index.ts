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

// Process ONE article at a time (called per-article, not background)
async function processOneArticle(
  supabase: any,
  article: any,
  targetLanguages: string[],
  lovableApiKey: string,
  jobId: string
): Promise<{ success: boolean; generatedPages: number; error?: string }> {
  console.log(`[Process] Processing article: ${article.headline}`);
  const results: any[] = [];
  let generatedPages = 0;

  try {
    const sourceLanguageName = LANGUAGE_NAMES[article.language] || 'English';

    // Check if this article already has tracking
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
      
      console.log(`[Process] Using existing hreflang groups for article ${article.id}`);
      
      await supabase
        .from('qa_article_tracking')
        .update({ status: 'in_progress' })
        .eq('id', trackingId);
    } else {
      hreflangGroupCore = crypto.randomUUID();
      hreflangGroupDecision = crypto.randomUUID();
      
      console.log(`[Process] Creating new hreflang groups for article ${article.id}`);
      
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
        console.error('[Process] Failed to create tracking record:', trackingError);
        throw trackingError;
      }
      
      trackingId = newTracking.id;
    }

    // Filter out already generated languages
    const languagesToGenerate = targetLanguages.filter((lang: string) => !existingLanguages.includes(lang));
    
    if (languagesToGenerate.length === 0) {
      console.log(`[Process] All languages already generated for article ${article.id}`);
      return { success: true, generatedPages: 0 };
    }

    console.log(`[Process] Generating Q&As for languages: ${languagesToGenerate.join(', ')}`);

    // Generate Q&As for each language
    for (const lang of languagesToGenerate) {
      const targetLanguageName = LANGUAGE_NAMES[lang] || 'English';
      const isTranslation = lang !== article.language;
      
      const translationInstruction = isTranslation 
        ? `\n\nIMPORTANT: The source article is in ${sourceLanguageName}. You MUST translate all content to ${targetLanguageName}. Do not leave any text in ${sourceLanguageName}.`
        : '';
      
      const prompt = `CRITICAL: ALL OUTPUT MUST BE WRITTEN ENTIRELY IN ${targetLanguageName}.
Do NOT use English unless the target language IS English.
Every word, phrase, and sentence must be native ${targetLanguageName}.${translationInstruction}

You are generating 2 standalone Q&A pages derived from this blog article:

ARTICLE TITLE: ${article.headline}
ARTICLE CONTENT: ${article.detailed_content?.substring(0, 4000)}
SOURCE LANGUAGE: ${sourceLanguageName}
TARGET LANGUAGE: ${targetLanguageName}

Generate exactly 2 Q&A pages with DIFFERENT angles:

Q&A PAGE #1 (TYPE: "core"):
- Focus: Core explanation, how-to, educational
- Main question should be "What is..." or "How to..." style
- Answer should be comprehensive, helpful, structured

Q&A PAGE #2 (TYPE: "decision"):  
- Focus: Decision-making, comparison, common mistakes
- Main question should be "Should I...", "What to avoid...", "Best way to..." style
- Answer should help readers make informed decisions

For EACH Q&A page, return a JSON object with these exact fields:
{
  "qa_type": "core" or "decision",
  "title": "Full page title in ${targetLanguageName} (50-60 chars)",
  "slug": "url-friendly-slug-in-target-language",
  "question_main": "The primary question in ${targetLanguageName}",
  "answer_main": "Complete, citeable, helpful answer in HTML format (300-500 words) in ${targetLanguageName}",
  "related_qas": [
    {"question": "Related Q1 in ${targetLanguageName}", "answer": "Answer in ${targetLanguageName}"},
    {"question": "Related Q2 in ${targetLanguageName}", "answer": "Answer in ${targetLanguageName}"}
  ],
  "speakable_answer": "Short, citation-ready voice answer (50-80 words) in ${targetLanguageName}",
  "meta_title": "SEO title ≤60 chars in ${targetLanguageName}",
  "meta_description": "SEO description ≤160 chars in ${targetLanguageName}"
}

Return a JSON array with exactly 2 objects. No markdown, no explanation, just valid JSON.`;

      const MAX_RETRIES = 2;
      let qaPagesData;
      let lastError;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: 'You are an expert SEO content generator and translator. Return only valid JSON, no markdown or explanation.' },
                { role: 'user', content: prompt }
              ],
            }),
          });

          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error('[Process] AI API error:', errorText);
            throw new Error(`AI API error: ${aiResponse.status}`);
          }

          const aiData = await aiResponse.json();
          let content = aiData.choices?.[0]?.message?.content || '';
          
          // Robust JSON cleanup
          content = content
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .replace(/^\s+|\s+$/g, '')
            .replace(/,\s*]/g, ']')
            .replace(/,\s*}/g, '}')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[\x00-\x1F\x7F]/g, '');

          try {
            qaPagesData = JSON.parse(content);
          } catch {
            const start = content.indexOf('[');
            const end = content.lastIndexOf(']');
            if (start !== -1 && end !== -1 && end > start) {
              const extracted = content.slice(start, end + 1);
              qaPagesData = JSON.parse(extracted);
              console.log(`[Process] Fallback JSON extraction succeeded`);
            } else {
              throw new Error('Failed to parse AI response as JSON');
            }
          }

          if (!Array.isArray(qaPagesData) || qaPagesData.length === 0) {
            throw new Error('AI response is not a valid array of QA pages');
          }

          break;

        } catch (error) {
          lastError = error;
          if (attempt < MAX_RETRIES) {
            console.log(`[Process] Retry attempt ${attempt + 1} for lang ${lang}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }

      if (!qaPagesData) {
        console.error(`[Process] Failed to generate Q&A for ${lang}:`, lastError);
        continue;
      }

      // Save each Q&A page
      for (const qaData of qaPagesData) {
        const baseSlug = qaData.slug || `qa-${article.slug}-${qaData.qa_type}`;
        const slug = baseSlug;
        
        // Check for existing slug
        const { data: existing } = await supabase
          .from('qa_pages')
          .select('id')
          .eq('slug', slug)
          .eq('language', lang)
          .single();

        if (existing) {
          console.log(`[Process] Q&A page already exists: ${slug}`);
          continue;
        }

        const hreflangGroupId = qaData.qa_type === 'core' ? hreflangGroupCore : hreflangGroupDecision;

        const { error: insertError } = await supabase
          .from('qa_pages')
          .insert({
            source_article_id: article.id,
            language: lang,
            source_language: 'en',
            hreflang_group_id: hreflangGroupId,
            tracking_id: trackingId,
            qa_type: qaData.qa_type,
            title: qaData.title,
            slug,
            canonical_url: `https://www.delsolprimehomes.com/${lang}/qa/${slug}`,
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
        results.push({
          source_article_id: article.id,
          language: lang,
          qa_type: qaData.qa_type,
          title: qaData.title,
          slug,
          hreflang_group_id: hreflangGroupId,
        });
      }

      existingLanguages.push(lang);
    }

    // Update tracking record
    const totalQaPages = existingLanguages.length * 2;
    await supabase
      .from('qa_article_tracking')
      .update({
        languages_generated: existingLanguages,
        total_qa_pages: totalQaPages,
        status: 'completed',
      })
      .eq('id', trackingId);

    // Link translations between Q&A pages from same hreflang group
    const qaPagesByGroup: Record<string, any[]> = {};
    for (const result of results) {
      if (result.hreflang_group_id) {
        const key = result.hreflang_group_id;
        if (!qaPagesByGroup[key]) qaPagesByGroup[key] = [];
        qaPagesByGroup[key].push(result);
      }
    }

    for (const [groupId] of Object.entries(qaPagesByGroup)) {
      const { data: existingPages } = await supabase
        .from('qa_pages')
        .select('id, language, slug')
        .eq('hreflang_group_id', groupId);
      
      if (existingPages && existingPages.length > 0) {
        const fullTranslations: Record<string, string> = {};
        for (const p of existingPages) {
          fullTranslations[p.language] = p.slug;
        }
        
        for (const p of existingPages) {
          await supabase
            .from('qa_pages')
            .update({ translations: fullTranslations })
            .eq('id', p.id);
        }
      }
    }

    console.log(`[Process] Completed article ${article.id}: ${generatedPages} pages generated`);
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleIds, mode = 'single', languages = ['en'], jobId: existingJobId, resumeFromIndex = 0 } = await req.json();

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine target languages
    const isAllLanguages = languages.includes('all') || languages[0] === 'all';
    const targetLanguages = isAllLanguages ? ALL_SUPPORTED_LANGUAGES : languages;
    const effectiveLanguageCount = targetLanguages.length;

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

    // Create new job or use existing one
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
      // Resume existing job - get current progress
      const { data: existingJob } = await supabase
        .from('qa_generation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (existingJob) {
        currentIndex = existingJob.processed_articles || 0;
        console.log(`[Main] Resuming job ${jobId} from article index ${currentIndex}`);
        
        // Update job status back to running
        await supabase
          .from('qa_generation_jobs')
          .update({ 
            status: 'running',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
    }

    // If we've already processed all articles, mark as complete
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

    // Process ONE article (the next one)
    const articleIdToProcess = articleIds[currentIndex];
    
    // Fetch the article
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, headline, detailed_content, meta_description, language, featured_image_url, featured_image_alt, featured_image_caption, slug, author_id, cluster_id, category')
      .eq('id', articleIdToProcess)
      .eq('status', 'published');

    if (articlesError) throw articlesError;
    
    const article = articles?.[0];
    if (!article) {
      // Article not found, skip to next
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

    // Process this one article
    const result = await processOneArticle(supabase, article, targetLanguages, lovableApiKey, jobId);
    
    // Update job progress
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
        ? `Completed! Generated ${newGeneratedPages} Q&A pages` 
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
