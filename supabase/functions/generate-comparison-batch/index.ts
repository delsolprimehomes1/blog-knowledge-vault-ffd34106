import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALL_SUPPORTED_LANGUAGES = ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];

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

const BASE_URL = 'https://www.delsolprimehomes.com';

const MASTER_PROMPT = `You are an expert comparison content strategist and answer-engine optimizer.

Create a **decision-focused comparison page** designed to be cited by AI systems (ChatGPT, Perplexity, Google AI Overviews, Bing Copilot).

### Comparison Topic
**[OPTION_A] vs [OPTION_B]**

### Context
* Industry/Niche: [NICHE]
* Location: Costa del Sol, Spain
* Audience: [AUDIENCE]
* Intent Stage: Decision / Evaluation
[SUGGESTED_HEADLINE_SECTION]

### Requirements

Produce content as JSON with this exact structure:

{
  "headline": "[HEADLINE_INSTRUCTION]",
  "meta_title": "Short SEO title under 60 characters, include location (Spain/Marbella) and year (2025) where natural",
  "meta_description": "Meta description under 160 characters with target keyword naturally integrated",
  "speakable_answer": "SINGLE PARAGRAPH verdict (80-120 words, max 150) answering 'Which is better and why?'. NO lists, NO bullets, NO line breaks. Complete sentences ending with period. Self-contained and AI-quotable. Neutral, factual tone.",
  "quick_comparison_table": [
    {"criterion": "Cost", "option_a_value": "Brief 10-15 word summary", "option_b_value": "Brief 10-15 word summary"},
    {"criterion": "Pros", "option_a_value": "2-3 key benefits, comma-separated", "option_b_value": "2-3 key benefits, comma-separated"},
    {"criterion": "Cons", "option_a_value": "1-2 drawbacks, brief", "option_b_value": "1-2 drawbacks, brief"},
    {"criterion": "Best for", "option_a_value": "One-liner ideal buyer type", "option_b_value": "One-liner ideal buyer type"},
    {"criterion": "Risks", "option_a_value": "Main risk in 5-10 words", "option_b_value": "Main risk in 5-10 words"},
    {"criterion": "Time to results", "option_a_value": "Brief timeline", "option_b_value": "Brief timeline"},
    {"criterion": "Flexibility", "option_a_value": "Brief flexibility note", "option_b_value": "Brief flexibility note"}
  ],
  "option_a_overview": "CONCISE HTML (MAX 300 WORDS). Use <p>, <h3>, <ul>, <li>, <strong>. Include ONLY: What it is (1 paragraph), When it makes sense (1 paragraph), Ideal user (1 short list of 3-4 bullet points). Do NOT include common mistakes or hidden risks here.",
  "option_b_overview": "CONCISE HTML (MAX 300 WORDS). Same structure as option_a_overview.",
  "side_by_side_breakdown": "CONCISE HTML (MAX 400 WORDS). Brief bullet-point comparison covering: Cost, Expertise required, Control level, Risk factors, Long-term value. Use <ul><li> format, not paragraphs.",
  "use_case_scenarios": "CONCISE HTML (MAX 250 WORDS). Three short scenarios: When Option A wins, When Option B wins, When neither is ideal. 2-3 sentences each.",
  "final_verdict": "HTML (MAX 150 WORDS). Balanced recommendation depending on user goals. Direct and actionable.",
  "qa_entities": [
    {"question": "Natural language question matching how users ask AI assistants", "answer": "Clear, objective answer in 30-50 words"},
    {"question": "...", "answer": "..."}
  ],
  "suggested_slug": "url-friendly-slug-with-location-context",
  "image_prompt": "Professional real estate photography style image showing: [describe a visual that represents the comparison topic]. Modern, clean, Costa del Sol setting. No text overlays."
}

CRITICAL RULES:
1. CONCISENESS IS KEY: AI systems extract short, focused content. Long content gets diluted.
2. WORD LIMITS ARE STRICT: option_a_overview and option_b_overview MAX 300 words each. side_by_side_breakdown MAX 400 words. use_case_scenarios MAX 250 words. final_verdict MAX 150 words.
3. NO MARKDOWN in HTML fields. Use ONLY: <p>, <ul>, <li>, <strong>, <em>, <h3>, <h4>
4. Every list must use <ul><li>...</li></ul> format
5. Wrap paragraphs in <p> tags
6. Use <strong> for emphasis, not **
7. NO fluff, filler words, or repetitive content
8. Each sentence must add unique value
9. HEADLINE FORMAT: Use natural question formats that match AI queries like "X vs Y: Which Should You Buy in 2025?" or "X vs Y: Where Should You Invest?"

Tone: Authoritative, Neutral, Evidence-based, Human-readable, AI-friendly. Avoid hype, exaggeration, or sales language.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      option_a, 
      option_b, 
      niche, 
      target_audience,
      suggested_headline = '',
      save_to_database = true,
      publish_immediately = false,
    } = await req.json();

    if (!option_a || !option_b) {
      return new Response(
        JSON.stringify({ error: 'option_a and option_b are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Generate shared hreflang_group_id for all 10 language versions
    const hreflangGroupId = crypto.randomUUID();
    const comparisonTopic = `${option_a} vs ${option_b}`;
    
    console.log(`Starting batch generation for "${comparisonTopic}" with hreflang_group_id: ${hreflangGroupId}`);
    console.log(`Target: ${ALL_SUPPORTED_LANGUAGES.length} languages`);

    const results: { language: string; success: boolean; slug?: string; error?: string; id?: string }[] = [];
    const allSlugs: Record<string, string> = {};
    let englishContent: any = null;

    // STEP 1: Generate English content first (source of truth)
    console.log('Step 1: Generating English content...');
    
    const headlineInstruction = suggested_headline 
      ? `Use exactly: "${suggested_headline}"`
      : `Create an AI-query friendly headline like "[Option A] vs [Option B]: Which Should You [Choose/Buy/Invest in] in 2025?" Include location context (Spain/Marbella/Costa del Sol) where natural.`;
    
    const suggestedHeadlineSection = suggested_headline 
      ? `* Suggested Headline: "${suggested_headline}" (USE THIS EXACTLY)`
      : '';

    const englishPrompt = MASTER_PROMPT
      .replace(/\[OPTION_A\]/g, option_a)
      .replace(/\[OPTION_B\]/g, option_b)
      .replace('[NICHE]', niche || 'real-estate')
      .replace('[AUDIENCE]', target_audience || 'property buyers and investors')
      .replace('[HEADLINE_INSTRUCTION]', headlineInstruction)
      .replace('[SUGGESTED_HEADLINE_SECTION]', suggestedHeadlineSection);

    const englishResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Generate all content in English. STRICTLY follow all word limits specified in the prompt.' },
          { role: 'user', content: englishPrompt }
        ],
        temperature: 0.7,
        max_tokens: 6000,
      }),
    });

    if (!englishResponse.ok) {
      const errorText = await englishResponse.text();
      console.error('English generation failed:', englishResponse.status, errorText);
      throw new Error(`Failed to generate English content: ${englishResponse.status}`);
    }

    const englishAiData = await englishResponse.json();
    const englishResponseContent = englishAiData.choices?.[0]?.message?.content;

    if (!englishResponseContent) {
      throw new Error('No content received from AI for English');
    }

    try {
      const jsonMatch = englishResponseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        englishContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in English response');
      }
    } catch (parseError) {
      console.error('JSON parse error for English:', parseError);
      throw new Error('Failed to parse English AI response');
    }

    // Generate English slug
    const baseSlug = englishContent.suggested_slug || 
      `${option_a}-vs-${option_b}-costa-del-sol-2025`
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    
    allSlugs['en'] = baseSlug;
    
    console.log(`English content generated. Base slug: ${baseSlug}`);

    // STEP 2: Generate translations for remaining 9 languages
    console.log('Step 2: Generating translations for 9 languages...');
    
    for (const lang of ALL_SUPPORTED_LANGUAGES) {
      if (lang === 'en') continue; // Already have English
      
      const languageName = LANGUAGE_NAMES[lang];
      console.log(`Translating to ${languageName} (${lang})...`);
      
      const translationPrompt = `Translate this comparison page content from English to ${languageName}.

CRITICAL RULES:
1. Keep the JSON structure EXACTLY the same
2. Translate ALL text content to ${languageName}
3. Maintain the same authoritative, neutral, evidence-based tone
4. Keep HTML tags intact (<p>, <ul>, <li>, <strong>, <em>, <h3>, <h4>)
5. Do NOT translate: option names, URLs, or technical terms that should remain in English
6. For quick_comparison_table: translate criterion names and values
7. For qa_entities: translate both questions and answers
8. Keep word limits similar to original
9. Generate a suggested_slug in ${languageName} (URL-friendly, lowercase, dashes, include -${lang} suffix)

Source content (English):
${JSON.stringify(englishContent, null, 2)}

Return ONLY valid JSON with all content in ${languageName}, no markdown, no explanation.`;

      try {
        const translationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { 
                role: 'system', 
                content: `You are a professional translator specializing in real estate content. Translate all content to ${languageName} while maintaining the exact JSON structure. Preserve HTML formatting.`
              },
              { role: 'user', content: translationPrompt }
            ],
            temperature: 0.3,
            max_tokens: 8000,
          }),
        });

        if (!translationResponse.ok) {
          console.error(`Translation failed for ${lang}:`, translationResponse.status);
          results.push({ language: lang, success: false, error: `API error: ${translationResponse.status}` });
          continue;
        }

        const translationAiData = await translationResponse.json();
        const translationContent = translationAiData.choices?.[0]?.message?.content;

        if (!translationContent) {
          results.push({ language: lang, success: false, error: 'No content received' });
          continue;
        }

        let parsedTranslation;
        try {
          const jsonMatch = translationContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedTranslation = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found');
          }
        } catch {
          results.push({ language: lang, success: false, error: 'Failed to parse response' });
          continue;
        }

        // Generate language-specific slug
        const langSlug = parsedTranslation.suggested_slug || `${baseSlug}-${lang}`;
        allSlugs[lang] = langSlug;
        
        // Store parsed translation for later
        (parsedTranslation as any)._langSlug = langSlug;
        (parsedTranslation as any)._parsed = true;
        
        // Attach to results temporarily
        results.push({ 
          language: lang, 
          success: true, 
          slug: langSlug,
          ...parsedTranslation 
        });
        
        console.log(`${languageName} (${lang}) translated: ${langSlug}`);
        
      } catch (error) {
        console.error(`Error translating to ${lang}:`, error);
        results.push({ language: lang, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Add English to results
    results.unshift({ 
      language: 'en', 
      success: true, 
      slug: baseSlug,
      ...englishContent 
    });

    console.log(`Translation complete. ${results.filter(r => r.success).length}/${ALL_SUPPORTED_LANGUAGES.length} languages generated`);

    // STEP 3: Build translations JSONB (all 10 slugs including self-reference)
    console.log('Step 3: Building translations JSONB...');
    
    // STEP 4: Insert all pages into database
    if (save_to_database) {
      console.log('Step 4: Inserting into database...');
      
      const insertedIds: string[] = [];
      
      for (const result of results) {
        if (!result.success) continue;
        
        const lang = result.language;
        const slug = allSlugs[lang];
        
        // Build translations without self-reference (per your memory requirements, self IS included)
        const translations: Record<string, string> = { ...allSlugs };
        
        const canonicalUrl = `${BASE_URL}/${lang}/compare/${slug}`;
        
        const comparisonData = {
          option_a,
          option_b,
          comparison_topic: comparisonTopic,
          niche: niche || 'real-estate',
          target_audience: target_audience || 'property buyers and investors',
          language: lang,
          source_language: 'en',
          hreflang_group_id: hreflangGroupId,
          slug,
          canonical_url: canonicalUrl,
          translations,
          headline: (result as any).headline || englishContent.headline,
          meta_title: (result as any).meta_title || englishContent.meta_title,
          meta_description: (result as any).meta_description || englishContent.meta_description,
          speakable_answer: (result as any).speakable_answer || englishContent.speakable_answer,
          quick_comparison_table: (result as any).quick_comparison_table || englishContent.quick_comparison_table || [],
          option_a_overview: (result as any).option_a_overview || englishContent.option_a_overview,
          option_b_overview: (result as any).option_b_overview || englishContent.option_b_overview,
          side_by_side_breakdown: (result as any).side_by_side_breakdown || englishContent.side_by_side_breakdown,
          use_case_scenarios: (result as any).use_case_scenarios || englishContent.use_case_scenarios,
          final_verdict: (result as any).final_verdict || englishContent.final_verdict,
          qa_entities: (result as any).qa_entities || englishContent.qa_entities || [],
          status: publish_immediately ? 'published' : 'draft',
          date_published: publish_immediately ? new Date().toISOString() : null,
          date_modified: new Date().toISOString(),
        };

        const { data: inserted, error: insertError } = await supabase
          .from('comparison_pages')
          .insert(comparisonData)
          .select('id')
          .single();

        if (insertError) {
          console.error(`Failed to insert ${lang}:`, insertError);
          result.success = false;
          result.error = insertError.message;
        } else {
          result.id = inserted.id;
          insertedIds.push(inserted.id);
          console.log(`Inserted ${lang}: ${slug} (${inserted.id})`);
        }
      }
      
      console.log(`Inserted ${insertedIds.length} comparison pages`);
    }

    // Summary
    const successCount = results.filter(r => r.success).length;
    const failedLanguages = results.filter(r => !r.success).map(r => r.language);
    
    console.log(`=== BATCH GENERATION COMPLETE ===`);
    console.log(`Success: ${successCount}/${ALL_SUPPORTED_LANGUAGES.length}`);
    if (failedLanguages.length > 0) {
      console.log(`Failed: ${failedLanguages.join(', ')}`);
    }

    return new Response(
      JSON.stringify({ 
        success: successCount === ALL_SUPPORTED_LANGUAGES.length,
        hreflang_group_id: hreflangGroupId,
        comparison_topic: comparisonTopic,
        languages_generated: successCount,
        languages_total: ALL_SUPPORTED_LANGUAGES.length,
        failed_languages: failedLanguages,
        results: results.map(r => ({
          language: r.language,
          success: r.success,
          slug: r.slug,
          id: r.id,
          error: r.error,
        })),
        slugs: allSlugs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-comparison-batch:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
