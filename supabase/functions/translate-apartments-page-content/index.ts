import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TARGET_LANGUAGES = [
  { code: 'nl', name: 'Dutch' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'fi', name: 'Finnish' },
  { code: 'pl', name: 'Polish' },
  { code: 'da', name: 'Danish' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase config missing');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the English content from the database
    const { data: englishRow, error: fetchError } = await supabase
      .from('apartments_page_content')
      .select('*')
      .eq('language', 'en')
      .maybeSingle();

    if (fetchError) throw new Error(`Failed to fetch English content: ${fetchError.message}`);
    if (!englishRow) throw new Error('No English content found. Please save English content first.');

    const { headline, subheadline, cta_text, hero_image_alt, meta_title, meta_description } = englishRow;

    if (!headline) throw new Error('English headline is empty. Please fill in content before translating.');

    console.log('Translating apartments page content to 9 languages...');

    // Single prompt translating all 6 fields for all 9 languages at once
    const prompt = `Translate the following luxury real estate website content into the specified languages. Keep the same marketing tone, style, and brand voice.

FIELDS TO TRANSLATE:
1. headline: "${headline || ''}"
2. subheadline: "${subheadline || ''}"
3. cta_text: "${cta_text || ''}"
4. hero_image_alt: "${hero_image_alt || ''}"
5. meta_title: "${meta_title || ''}"
6. meta_description: "${meta_description || ''}"

Return ONLY a valid JSON object with language codes as keys. No markdown, no explanation:
{
  "nl": { "headline": "", "subheadline": "", "cta_text": "", "hero_image_alt": "", "meta_title": "", "meta_description": "" },
  "fr": { "headline": "", "subheadline": "", "cta_text": "", "hero_image_alt": "", "meta_title": "", "meta_description": "" },
  "de": { "headline": "", "subheadline": "", "cta_text": "", "hero_image_alt": "", "meta_title": "", "meta_description": "" },
  "fi": { "headline": "", "subheadline": "", "cta_text": "", "hero_image_alt": "", "meta_title": "", "meta_description": "" },
  "pl": { "headline": "", "subheadline": "", "cta_text": "", "hero_image_alt": "", "meta_title": "", "meta_description": "" },
  "da": { "headline": "", "subheadline": "", "cta_text": "", "hero_image_alt": "", "meta_title": "", "meta_description": "" },
  "hu": { "headline": "", "subheadline": "", "cta_text": "", "hero_image_alt": "", "meta_title": "", "meta_description": "" },
  "sv": { "headline": "", "subheadline": "", "cta_text": "", "hero_image_alt": "", "meta_title": "", "meta_description": "" },
  "no": { "headline": "", "subheadline": "", "cta_text": "", "hero_image_alt": "", "meta_title": "", "meta_description": "" }
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are a professional translator specializing in luxury real estate marketing for a Spanish property company. Return only valid JSON with no markdown formatting.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      if (aiResponse.status === 429) throw new Error('Rate limit exceeded. Please try again later.');
      if (aiResponse.status === 402) throw new Error('AI usage credits exhausted.');
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error('No content in AI response');

    console.log('Raw AI response preview:', rawContent.substring(0, 300));

    // Extract JSON (handle potential markdown code blocks)
    let jsonStr = rawContent;
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      const rawJsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (rawJsonMatch) jsonStr = rawJsonMatch[0];
    }

    const translations = JSON.parse(jsonStr);

    // Build upsert payloads — copy non-translatable fields from English row
    const upsertPayloads = TARGET_LANGUAGES.map(({ code }) => {
      const t = translations[code] || {};
      return {
        language: code,
        headline: t.headline || headline,
        subheadline: t.subheadline || subheadline,
        cta_text: t.cta_text || cta_text,
        hero_image_alt: t.hero_image_alt || hero_image_alt,
        meta_title: t.meta_title || meta_title,
        meta_description: t.meta_description || meta_description,
        // Copy as-is from English
        hero_image_url: englishRow.hero_image_url,
        video_enabled: englishRow.video_enabled,
        video_url: englishRow.video_url,
        video_thumbnail_url: englishRow.video_thumbnail_url,
        reviews_enabled: englishRow.reviews_enabled,
        elfsight_embed_code: englishRow.elfsight_embed_code,
        is_published: englishRow.is_published,
        updated_at: new Date().toISOString(),
      };
    });

    // Upsert all 9 language rows
    const { error: upsertError } = await supabase
      .from('apartments_page_content')
      .upsert(upsertPayloads, { onConflict: 'language' });

    if (upsertError) throw new Error(`Failed to save translations: ${upsertError.message}`);

    console.log('All 9 language translations saved successfully');

    return new Response(
      JSON.stringify({ success: true, languages_updated: TARGET_LANGUAGES.map(l => l.code) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Translation error:', error);
    const message = error instanceof Error ? error.message : 'Translation failed';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
