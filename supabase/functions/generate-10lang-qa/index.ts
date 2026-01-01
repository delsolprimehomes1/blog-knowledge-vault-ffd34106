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

const ALL_LANGUAGES = ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];
const QA_TYPES = ['core', 'decision', 'practical', 'problem'];

const LANGUAGE_WORD_COUNTS: Record<string, { min: number; max: number }> = {
  'en': { min: 300, max: 800 },
  'de': { min: 250, max: 750 },
  'nl': { min: 250, max: 750 },
  'fr': { min: 260, max: 780 },
  'pl': { min: 220, max: 700 },
  'sv': { min: 220, max: 750 },
  'da': { min: 220, max: 750 },
  'hu': { min: 220, max: 650 },
  'fi': { min: 200, max: 600 },
  'no': { min: 220, max: 750 },
};

/**
 * Generate a single Q&A in a specific language
 */
async function generateQAInLanguage(
  sourceContent: { headline: string; content: string; clusterId: string; category: string },
  qaType: string,
  language: string,
  hreflangGroupId: string,
  apiKey: string
): Promise<any | null> {
  const languageName = LANGUAGE_NAMES[language];
  const thresholds = LANGUAGE_WORD_COUNTS[language];
  
  const typeInstructions: Record<string, string> = {
    'core': 'CORE question - fundamental "What is...", "How does..." question',
    'decision': 'DECISION question - helps users choose: "Should I...", "Which is better..."',
    'practical': 'PRACTICAL question - actionable: "How do I...", "What steps..."',
    'problem': 'PROBLEM question - addresses challenges: "What mistakes...", "What risks..."',
  };

  const prompt = `Generate a Q&A page in ${languageName} about Costa del Sol real estate.

LANGUAGE: ${languageName.toUpperCase()} (code: ${language})
${language !== 'en' ? `⚠️ CRITICAL: Write ALL content in ${languageName}. NO English text.` : ''}

Q&A TYPE: ${typeInstructions[qaType]}

TOPIC CONTEXT:
Title: ${sourceContent.headline}
Summary: ${sourceContent.content.substring(0, 2000)}

REQUIREMENTS:
- Word count: ${thresholds.min}-${thresholds.max} words
- Structure: Short answer (80-120 words) + 3-4 H3 sections + closing paragraph
- Tone: Neutral, factual, advisory (no "we", no marketing, no CTAs)
- NO links, NO bullet points in short answer

Return ONLY valid JSON:
{
  "qa_type": "${qaType}",
  "question_main": "Question in ${languageName} ending with ?",
  "answer_main": "Complete markdown answer with H3 sections",
  "title": "Page title (50-60 chars)",
  "slug": "url-friendly-slug-in-${language}",
  "meta_title": "Meta title ≤60 chars",
  "meta_description": "Meta description ≤160 chars in ${languageName}",
  "speakable_answer": "Voice-ready summary (50-80 words) in ${languageName}"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: `You are an expert content generator. Write in ${languageName} ONLY. Return valid JSON only.` 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        console.log(`[Rate limit] Waiting before retry for ${language}/${qaType}...`);
        await new Promise(r => setTimeout(r, 5000));
        return null;
      }
      throw new Error(`API error: ${status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON found');
    
    const qaData = JSON.parse(content.slice(start, end + 1));
    
    // Validate word count
    const wordCount = (qaData.answer_main || '').split(/\s+/).filter((w: string) => w.length > 0).length;
    if (wordCount < thresholds.min * 0.8) {
      console.warn(`[Validation] ${language}/${qaType} too short: ${wordCount} words`);
    }
    
    return {
      ...qaData,
      language,
      qa_type: qaType,
      hreflang_group_id: hreflangGroupId,
    };
    
  } catch (error) {
    console.error(`[Generate] Failed ${language}/${qaType}:`, error);
    return null;
  }
}

/**
 * Main handler - generates ALL 10 languages for a cluster's Q&As
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clusterId, qaType, dryRun = false } = await req.json();
    
    if (!clusterId) {
      return new Response(JSON.stringify({ error: 'clusterId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Single Q&A type mode - generate 10 languages for one type
    const typesToGenerate = qaType ? [qaType] : QA_TYPES;
    
    if (!clusterId) {
      return new Response(JSON.stringify({ error: 'clusterId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const apiKey = Deno.env.get('OPENAI_API_KEY')!;

    console.log(`[Generate] Starting 10-language Q&A generation for cluster: ${clusterId}`);

    // Get English article as source (master content)
    const { data: englishArticle, error: articleError } = await supabase
      .from('blog_articles')
      .select('id, headline, slug, detailed_content, meta_description, category, cluster_theme, cluster_id, featured_image_url, featured_image_alt')
      .eq('cluster_id', clusterId)
      .eq('language', 'en')
      .eq('status', 'published')
      .limit(1)
      .single();

    if (articleError || !englishArticle) {
      return new Response(JSON.stringify({ 
        error: 'No published English article found for cluster',
        clusterId 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Generate] Source article: ${englishArticle.headline}`);

    // Check for existing Q&As in this cluster
    const { data: existingQAs } = await supabase
      .from('qa_pages')
      .select('id, language, qa_type, hreflang_group_id')
      .eq('cluster_id', clusterId);

    const existingCount = existingQAs?.length || 0;
    console.log(`[Generate] Existing Q&As for cluster: ${existingCount}`);

    if (existingCount > 0 && !dryRun) {
      // Delete existing to start fresh
      console.log(`[Generate] Deleting ${existingCount} existing Q&As...`);
      await supabase.from('qa_pages').delete().eq('cluster_id', clusterId);
    }

    // Get sibling articles in all languages
    const { data: siblingArticles } = await supabase
      .from('blog_articles')
      .select('id, language, slug, headline')
      .eq('cluster_id', clusterId)
      .eq('status', 'published');

    const articlesByLang: Record<string, any> = {};
    for (const article of siblingArticles || []) {
      articlesByLang[article.language] = article;
    }

    console.log(`[Generate] Available languages in cluster: ${Object.keys(articlesByLang).join(', ')}`);

    // Generate 4 Q&A types, each with all 10 languages
    const results: { created: number; failed: number; qaPages: any[] } = {
      created: 0,
      failed: 0,
      qaPages: [],
    };

    const sourceContent = {
      headline: englishArticle.headline,
      content: englishArticle.detailed_content || englishArticle.meta_description || '',
      clusterId: englishArticle.cluster_id,
      category: englishArticle.category || 'Real Estate',
    };

    for (const currentQaType of typesToGenerate) {
      // Create shared hreflang_group_id for this Q&A type
      const hreflangGroupId = crypto.randomUUID();
      const languageSlugs: Record<string, string> = {};
      const createdPages: any[] = [];

      console.log(`[Generate] Starting ${currentQaType} Q&A type with hreflang_group: ${hreflangGroupId}`);

      // Generate each language version
      for (const lang of ALL_LANGUAGES) {
        // Get language-specific source article if available
        const langArticle = articlesByLang[lang];
        
        console.log(`[Generate] Generating ${lang}/${currentQaType}...`);
        
        const qaData = await generateQAInLanguage(
          sourceContent,
          currentQaType,
          lang,
          hreflangGroupId,
          apiKey
        );

        if (qaData) {
          // Ensure slug has language suffix for uniqueness
          const baseSlug = qaData.slug || `${qaType}-${lang}-${Date.now()}`;
          const finalSlug = baseSlug.endsWith(`-${lang}`) ? baseSlug : `${baseSlug}-${lang}`;
          
          languageSlugs[lang] = finalSlug;
          
          // Translate image alt text to Q&A language
          let imageAlt = englishArticle.featured_image_alt || 'Costa del Sol property';
          
          if (lang !== 'en' && englishArticle.featured_image_alt) {
            try {
              const altResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini', // Fast + cheap for simple translation
                  messages: [
                    { role: 'system', content: `Translate to ${LANGUAGE_NAMES[lang]}. Return ONLY the translation, nothing else.` },
                    { role: 'user', content: englishArticle.featured_image_alt }
                  ],
                  max_tokens: 100,
                  temperature: 0.3,
                }),
              });
              
              if (altResponse.ok) {
                const altData = await altResponse.json();
                imageAlt = altData.choices?.[0]?.message?.content?.trim() || imageAlt;
                console.log(`[Generate] Translated alt for ${lang}: ${imageAlt}`);
              }
            } catch (err) {
              console.warn(`[Generate] Alt translation failed for ${lang}:`, err);
              // Falls back to English alt
            }
          }
          
          const pageData = {
            source_article_id: langArticle?.id || englishArticle.id,
            source_article_slug: langArticle?.slug || englishArticle.slug,
            cluster_id: clusterId,
            language: lang,
            source_language: 'en',
            hreflang_group_id: hreflangGroupId,
            qa_type: currentQaType,
            title: qaData.title,
            slug: finalSlug,
            canonical_url: `https://www.delsolprimehomes.com/${lang}/qa/${finalSlug}`,
            question_main: qaData.question_main,
            answer_main: qaData.answer_main,
            related_qas: [],
            speakable_answer: qaData.speakable_answer,
            meta_title: (qaData.meta_title || '').substring(0, 60),
            meta_description: (qaData.meta_description || '').substring(0, 160),
            featured_image_url: langArticle?.featured_image_url || englishArticle.featured_image_url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200',
            featured_image_alt: imageAlt, // Now language-specific
            category: sourceContent.category,
            status: 'published',
            translations: {}, // Will be filled after all languages created
          };

          createdPages.push(pageData);
          results.created++;
          
          // Rate limiting delay
          await new Promise(r => setTimeout(r, 1500));
        } else {
          results.failed++;
          console.error(`[Generate] Failed to generate ${lang}/${currentQaType}`);
        }
      }

      // Now update all pages with complete translations JSONB (including self-reference)
      console.log(`[Generate] Built translations JSONB with ${Object.keys(languageSlugs).length} languages:`, Object.keys(languageSlugs));
      for (const page of createdPages) {
        page.translations = { ...languageSlugs };
      }

      if (!dryRun && createdPages.length > 0) {
        // Insert all pages for this Q&A type as a batch
        console.log(`[Generate] Inserting ${createdPages.length} pages for ${currentQaType} with shared hreflang_group_id: ${hreflangGroupId}`);
        
        const { error: insertError, data: insertedData } = await supabase
          .from('qa_pages')
          .insert(createdPages)
          .select('id, language, slug, hreflang_group_id');

        if (insertError) {
          console.error(`[Generate] Insert error for ${currentQaType}:`, insertError);
          results.created -= createdPages.length;
          results.failed += createdPages.length;
        } else {
          console.log(`[Generate] ✅ Inserted ${insertedData?.length || createdPages.length} pages for ${currentQaType}`);
          
          // Verify all share same hreflang_group_id
          const uniqueGroups = new Set(insertedData?.map(p => p.hreflang_group_id));
          if (uniqueGroups.size !== 1) {
            console.error(`[Generate] ❌ CRITICAL: Multiple hreflang_group_ids found!`, Array.from(uniqueGroups));
          } else {
            console.log(`[Generate] ✅ All ${insertedData?.length} pages share hreflang_group_id: ${hreflangGroupId}`);
          }
          
          results.qaPages.push(...createdPages);
        }
      }

      // Delay between Q&A types
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`[Generate] Complete! Created: ${results.created}, Failed: ${results.failed}`);

    return new Response(JSON.stringify({
      success: true,
      clusterId,
      clusterTheme: englishArticle.cluster_theme,
      created: results.created,
      failed: results.failed,
      expected: QA_TYPES.length * ALL_LANGUAGES.length, // 40 pages
      qaPages: dryRun ? [] : results.qaPages.map(p => ({ 
        language: p.language, 
        qa_type: p.qa_type, 
        slug: p.slug,
        hreflang_group_id: p.hreflang_group_id,
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Generate] Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
