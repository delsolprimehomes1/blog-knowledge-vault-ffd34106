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

const BASE_URL = 'https://www.delsolprimehomes.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { comparison_id, target_language } = await req.json();

    if (!comparison_id || !target_language) {
      return new Response(
        JSON.stringify({ error: 'comparison_id and target_language are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPPORTED_LANGUAGES.includes(target_language)) {
      return new Response(
        JSON.stringify({ error: `Unsupported language: ${target_language}` }),
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

    // Fetch the source comparison (must be English)
    const { data: sourceComparison, error: fetchError } = await supabase
      .from('comparison_pages')
      .select('*')
      .eq('id', comparison_id)
      .single();

    if (fetchError || !sourceComparison) {
      return new Response(
        JSON.stringify({ error: 'Source comparison not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (sourceComparison.language !== 'en') {
      return new Response(
        JSON.stringify({ error: 'Source comparison must be English. Please translate from English version.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if translation already exists
    const { data: existingTranslation } = await supabase
      .from('comparison_pages')
      .select('id, slug')
      .eq('comparison_topic', sourceComparison.comparison_topic)
      .eq('language', target_language)
      .single();

    if (existingTranslation) {
      return new Response(
        JSON.stringify({ 
          error: `Translation already exists for ${LANGUAGE_NAMES[target_language]}`,
          existing_id: existingTranslation.id,
          existing_slug: existingTranslation.slug,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const languageName = LANGUAGE_NAMES[target_language];
    console.log(`Translating comparison "${sourceComparison.comparison_topic}" to ${languageName}...`);

    // Prepare content for translation
    const contentToTranslate = {
      headline: sourceComparison.headline,
      meta_title: sourceComparison.meta_title,
      meta_description: sourceComparison.meta_description,
      speakable_answer: sourceComparison.speakable_answer,
      option_a_overview: sourceComparison.option_a_overview,
      option_b_overview: sourceComparison.option_b_overview,
      side_by_side_breakdown: sourceComparison.side_by_side_breakdown,
      use_case_scenarios: sourceComparison.use_case_scenarios,
      final_verdict: sourceComparison.final_verdict,
      quick_comparison_table: sourceComparison.quick_comparison_table,
      qa_entities: sourceComparison.qa_entities,
      featured_image_alt: sourceComparison.featured_image_alt,
      featured_image_caption: sourceComparison.featured_image_caption,
    };

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

Source content (English):
${JSON.stringify(contentToTranslate, null, 2)}

Return ONLY valid JSON with all content in ${languageName}, no markdown, no explanation.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from AI');
    }

    // Parse translated JSON
    let translatedContent;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        translatedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Failed to parse translated content');
    }

    // Generate language-specific slug
    const baseSlug = sourceComparison.slug.replace(/-en$/, '');
    const newSlug = `${baseSlug}-${target_language}`;

    // Use same hreflang_group_id or create one
    const hreflangGroupId = sourceComparison.hreflang_group_id || sourceComparison.id;

    // Generate canonical URL
    const canonicalUrl = `${BASE_URL}/${target_language}/compare/${newSlug}`;

    // Build the translated comparison
    const translatedComparison = {
      option_a: sourceComparison.option_a,
      option_b: sourceComparison.option_b,
      comparison_topic: sourceComparison.comparison_topic,
      niche: sourceComparison.niche,
      target_audience: sourceComparison.target_audience,
      language: target_language,
      source_language: 'en',
      hreflang_group_id: hreflangGroupId,
      slug: newSlug,
      canonical_url: canonicalUrl,
      headline: translatedContent.headline || sourceComparison.headline,
      meta_title: translatedContent.meta_title || sourceComparison.meta_title,
      meta_description: translatedContent.meta_description || sourceComparison.meta_description,
      speakable_answer: translatedContent.speakable_answer || sourceComparison.speakable_answer,
      quick_comparison_table: translatedContent.quick_comparison_table || sourceComparison.quick_comparison_table,
      option_a_overview: translatedContent.option_a_overview || sourceComparison.option_a_overview,
      option_b_overview: translatedContent.option_b_overview || sourceComparison.option_b_overview,
      side_by_side_breakdown: translatedContent.side_by_side_breakdown || sourceComparison.side_by_side_breakdown,
      use_case_scenarios: translatedContent.use_case_scenarios || sourceComparison.use_case_scenarios,
      final_verdict: translatedContent.final_verdict || sourceComparison.final_verdict,
      qa_entities: translatedContent.qa_entities || sourceComparison.qa_entities,
      featured_image_url: sourceComparison.featured_image_url,
      featured_image_alt: translatedContent.featured_image_alt || sourceComparison.featured_image_alt,
      featured_image_caption: translatedContent.featured_image_caption || sourceComparison.featured_image_caption,
      internal_links: sourceComparison.internal_links || [],
      external_citations: sourceComparison.external_citations || [],
      author_id: sourceComparison.author_id,
      reviewer_id: sourceComparison.reviewer_id,
      status: 'draft',
      date_modified: new Date().toISOString(),
    };

    // Insert the translated comparison
    const { data: insertedComparison, error: insertError } = await supabase
      .from('comparison_pages')
      .insert(translatedComparison)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to save translation: ${insertError.message}`);
    }

    console.log(`Created translation: ${newSlug} (${target_language})`);

    // Update hreflang_group_id on source if not set
    if (!sourceComparison.hreflang_group_id) {
      await supabase
        .from('comparison_pages')
        .update({ hreflang_group_id: hreflangGroupId })
        .eq('id', sourceComparison.id);
    }

    // Fetch all siblings and build translations JSONB
    const { data: allSiblings } = await supabase
      .from('comparison_pages')
      .select('id, language, slug')
      .eq('comparison_topic', sourceComparison.comparison_topic);

    if (allSiblings && allSiblings.length > 0) {
      // Build translations map (include self-reference for each)
      const translationsMap: Record<string, string> = {};
      for (const sibling of allSiblings) {
        translationsMap[sibling.language] = sibling.slug;
      }

      // Update all siblings with full translations map
      for (const sibling of allSiblings) {
        const siblingCanonical = `${BASE_URL}/${sibling.language}/compare/${sibling.slug}`;
        await supabase
          .from('comparison_pages')
          .update({ 
            translations: translationsMap,
            hreflang_group_id: hreflangGroupId,
            canonical_url: siblingCanonical,
          })
          .eq('id', sibling.id);
      }

      console.log(`Updated translations JSONB for ${allSiblings.length} siblings`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        comparison: insertedComparison,
        slug: newSlug,
        language: target_language,
        hreflang_group_id: hreflangGroupId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in translate-comparison:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
