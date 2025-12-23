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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleIds, mode = 'single', languages = ['en'], jobId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine if generating all languages
    const isAllLanguages = languages.includes('all') || languages[0] === 'all';
    const targetLanguages = isAllLanguages ? ALL_SUPPORTED_LANGUAGES : languages;
    const effectiveLanguageCount = targetLanguages.length;

    // Create or get job
    let job;
    if (jobId) {
      const { data } = await supabase.from('qa_generation_jobs').select('*').eq('id', jobId).single();
      job = data;
    } else {
      const { data, error } = await supabase
        .from('qa_generation_jobs')
        .insert({
          user_id: null,
          status: 'running',
          mode,
          languages,
          article_ids: articleIds,
          total_articles: articleIds.length,
          total_faq_pages: articleIds.length * 2 * effectiveLanguageCount,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      job = data;
    }

    // Fetch articles with category
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, headline, detailed_content, meta_description, language, featured_image_url, featured_image_alt, featured_image_caption, slug, author_id, cluster_id, category')
      .in('id', articleIds)
      .eq('status', 'published');

    if (articlesError) throw articlesError;

    // English-first validation: Only accept English source articles
    const nonEnglishArticles = (articles || []).filter(a => a.language !== 'en');
    if (nonEnglishArticles.length > 0) {
      const nonEnglishIds = nonEnglishArticles.map(a => a.id);
      const nonEnglishHeadlines = nonEnglishArticles.map(a => `${a.headline} (${a.language})`);
      console.error('English-first validation failed. Non-English articles:', nonEnglishHeadlines);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Q&A generation requires English source articles only. Non-English articles detected.',
        nonEnglishArticles: nonEnglishHeadlines,
        articleIds: nonEnglishIds,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];
    let processedArticles = 0;
    let generatedQaPages = 0;

    for (const article of articles || []) {
      try {
        const sourceLanguageName = LANGUAGE_NAMES[article.language] || 'English';

        // =====================================================
        // CRITICAL FIX: Generate hreflang group IDs ONCE per article
        // These IDs are SHARED across all language versions
        // =====================================================
        
        // Check if this article already has tracking (for adding languages)
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
          // Use existing hreflang groups for continuity
          hreflangGroupCore = existingTracking.hreflang_group_core;
          hreflangGroupDecision = existingTracking.hreflang_group_decision;
          existingLanguages = existingTracking.languages_generated || [];
          trackingId = existingTracking.id;
          
          console.log(`Using existing hreflang groups for article ${article.id}: core=${hreflangGroupCore}, decision=${hreflangGroupDecision}`);
          
          // Update status to in_progress
          await supabase
            .from('qa_article_tracking')
            .update({ status: 'in_progress' })
            .eq('id', trackingId);
        } else {
          // Create NEW hreflang groups for first-time generation
          hreflangGroupCore = crypto.randomUUID();
          hreflangGroupDecision = crypto.randomUUID();
          
          console.log(`Creating new hreflang groups for article ${article.id}: core=${hreflangGroupCore}, decision=${hreflangGroupDecision}`);
          
          // Create tracking record
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
            console.error('Failed to create tracking record:', trackingError);
            throw trackingError;
          }
          
          trackingId = newTracking.id;
        }

        // Filter out languages that are already generated
        const languagesToGenerate = targetLanguages.filter((lang: string) => !existingLanguages.includes(lang));
        
        if (languagesToGenerate.length === 0) {
          console.log(`All requested languages already generated for article ${article.id}`);
          continue;
        }

        console.log(`Generating Q&As for languages: ${languagesToGenerate.join(', ')}`);

        // Generate Q&As for each language using the SHARED hreflang group IDs
        for (const lang of languagesToGenerate) {
          const targetLanguageName = LANGUAGE_NAMES[lang] || 'English';
          const isTranslation = lang !== article.language;
          
          // Build the translation instruction if needed
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
                console.error('AI API error:', errorText);
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
                  console.log(`Fallback JSON extraction succeeded for article ${article.id}`);
                } else {
                  console.error('JSON parse failed - Content length:', content.length);
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
                console.log(`Retry attempt ${attempt + 1} for article ${article.id}, lang ${lang}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
              }
            }
          }

          if (!qaPagesData) {
            throw lastError || new Error('Failed to generate QA pages after retries');
          }

          // Save each Q&A page with the SHARED hreflang group ID
          for (const qaData of qaPagesData) {
            const baseSlug = qaData.slug || `qa-${article.slug}-${qaData.qa_type}`;
            const slug = `${baseSlug}-${lang}`;
            
            // Check for existing slug
            const { data: existing } = await supabase
              .from('qa_pages')
              .select('id')
              .eq('slug', slug)
              .eq('language', lang)
              .single();

            if (existing) {
              console.log(`Q&A page already exists: ${slug}`);
              continue;
            }

            // Use the SHARED hreflang_group_id based on Q&A type
            const hreflangGroupId = qaData.qa_type === 'core' ? hreflangGroupCore : hreflangGroupDecision;

            const { data: qaPage, error: insertError } = await supabase
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
              })
              .select()
              .single();

            if (insertError) {
              console.error('Insert error:', insertError);
              throw insertError;
            }

            generatedQaPages++;
            results.push({
              qa_page_id: qaPage.id,
              source_article_id: article.id,
              language: lang,
              qa_type: qaData.qa_type,
              title: qaData.title,
              slug,
              hreflang_group_id: hreflangGroupId,
            });
          }

          // Update tracking with this language
          existingLanguages.push(lang);
        }

        // Update tracking record with all generated languages
        const totalQaPages = existingLanguages.length * 2;
        await supabase
          .from('qa_article_tracking')
          .update({
            languages_generated: existingLanguages,
            total_qa_pages: totalQaPages,
            status: 'completed',
          })
          .eq('id', trackingId);

        processedArticles++;
        
        // Update job progress
        await supabase
          .from('qa_generation_jobs')
          .update({
            processed_articles: processedArticles,
            generated_faq_pages: generatedQaPages,
            results,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

      } catch (articleError) {
        console.error(`Error processing article ${article.id}:`, articleError);
        results.push({
          source_article_id: article.id,
          error: articleError instanceof Error ? articleError.message : 'Unknown error',
        });
      }
    }

    // Link translations between Q&A pages from same hreflang group
    const qaPagesByGroup: Record<string, any[]> = {};
    for (const result of results) {
      if (result.qa_page_id && result.hreflang_group_id) {
        const key = result.hreflang_group_id;
        if (!qaPagesByGroup[key]) qaPagesByGroup[key] = [];
        qaPagesByGroup[key].push(result);
      }
    }

    for (const [groupId, pages] of Object.entries(qaPagesByGroup)) {
      if (pages.length > 1) {
        const translations: Record<string, string> = {};
        for (const page of pages) {
          translations[page.language] = page.slug;
        }
        
        // Update all pages in this group with translations
        for (const page of pages) {
          await supabase
            .from('qa_pages')
            .update({ translations })
            .eq('id', page.qa_page_id);
        }
        
        // Also update any existing pages in this hreflang group
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
    }

    // Mark job as completed
    await supabase
      .from('qa_generation_jobs')
      .update({
        status: 'completed',
        processed_articles: processedArticles,
        generated_faq_pages: generatedQaPages,
        results,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return new Response(JSON.stringify({
      success: true,
      jobId: job.id,
      processedArticles,
      generatedQaPages,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-qa-pages:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
