import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPPORTED_LANGUAGES = ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'] as const;

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

interface BrochureContentResult {
  hero_headline: string;
  hero_subtitle: string;
  description: string;
  features: string[];
  meta_title: string;
  meta_description: string;
}

interface ContentToolCall {
  suggest_brochure_content: {
    hero_headline: string;
    hero_subtitle: string;
    description: string;
    features: string[];
    meta_title: string;
    meta_description: string;
  };
}

/**
 * Generate brochure content for a single language using OpenAI GPT-4o
 */
async function generateContentForLanguage(
  cityName: string,
  citySlug: string,
  language: string,
  openaiApiKey: string
): Promise<BrochureContentResult> {
  const languageName = LANGUAGE_NAMES[language] || 'English';
  
  const systemPrompt = `You are an expert luxury real estate copywriter specializing in Costa del Sol, Spain. 
Generate premium, aspirational content that targets high-net-worth international buyers seeking luxury properties.
Your content should be sophisticated, confident, and emphasize exclusivity, lifestyle, and investment value.`;

  const userPrompt = `Generate brochure content for ${cityName} on the Costa del Sol, Spain.

TARGET LANGUAGE: ${languageName} (${language})
Write ALL content ONLY in ${languageName}. Do not use English if the target language is not English.

REQUIREMENTS:
1. hero_headline (max 60 characters): Attention-grabbing, luxury-focused headline
2. hero_subtitle (max 100 characters): Compelling value proposition
3. description (1500-2000 characters): Rich, detailed sales copy covering:
   - City's unique character and Mediterranean appeal
   - Luxury lifestyle benefits
   - Investment potential and rental yields
   - Key neighborhoods and areas
   - World-class amenities and attractions
   - Why international buyers choose this location
4. features (6-8 bullet points, each 50-80 characters): Key selling points covering:
   - Proximity to airport/connectivity
   - Beach quality and access
   - Golf courses (Costa del Sol has 70+ courses)
   - Fine dining and nightlife
   - Cultural attractions
   - Year-round sunshine (320+ days)
   - Investment statistics if relevant
   - International community
5. meta_title (max 60 characters): SEO-optimized title for search engines
6. meta_description (max 160 characters): SEO description with call-to-action

IMPORTANT: Write naturally in ${languageName}. Use local expressions and culturally appropriate phrasing.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'suggest_brochure_content',
            description: 'Return the generated brochure content',
            parameters: {
              type: 'object',
              properties: {
                hero_headline: { 
                  type: 'string', 
                  description: 'Attention-grabbing headline (max 60 chars)' 
                },
                hero_subtitle: { 
                  type: 'string', 
                  description: 'Compelling subtitle (max 100 chars)' 
                },
                description: { 
                  type: 'string', 
                  description: 'Rich sales copy (1500-2000 chars)' 
                },
                features: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: '6-8 feature bullet points (50-80 chars each)'
                },
                meta_title: { 
                  type: 'string', 
                  description: 'SEO title (max 60 chars)' 
                },
                meta_description: { 
                  type: 'string', 
                  description: 'SEO description (max 160 chars)' 
                },
              },
              required: ['hero_headline', 'hero_subtitle', 'description', 'features', 'meta_title', 'meta_description'],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'suggest_brochure_content' } },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenAI API error for ${language}:`, response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall?.function?.arguments) {
    throw new Error('No tool call response from OpenAI');
  }

  const result = JSON.parse(toolCall.function.arguments) as BrochureContentResult;
  return result;
}

/**
 * Update the database with generation progress
 */
async function updateGenerationStatus(
  supabase: any,
  brochureId: string,
  status: string,
  i18nData?: {
    hero_headline_i18n?: Record<string, string>;
    hero_subtitle_i18n?: Record<string, string>;
    description_i18n?: Record<string, string>;
    features_i18n?: Record<string, string[]>;
    meta_title_i18n?: Record<string, string>;
    meta_description_i18n?: Record<string, string>;
  }
) {
  const updateData: any = {
    generation_status: status,
  };

  if (status === 'complete') {
    updateData.content_generated = true;
    updateData.last_generated_at = new Date().toISOString();
  }

  if (i18nData) {
    Object.assign(updateData, i18nData);
  }

  const { error } = await supabase
    .from('city_brochures')
    .update(updateData)
    .eq('id', brochureId);

  if (error) {
    console.error('Failed to update generation status:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brochureId, languages } = await req.json();

    if (!brochureId) {
      throw new Error('brochureId is required');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the brochure
    const { data: brochure, error: fetchError } = await supabase
      .from('city_brochures')
      .select('*')
      .eq('id', brochureId)
      .single();

    if (fetchError || !brochure) {
      throw new Error(`Brochure not found: ${brochureId}`);
    }

    const cityName = brochure.name;
    const citySlug = brochure.slug;
    const targetLanguages = languages || SUPPORTED_LANGUAGES;

    console.log(`🚀 Starting content generation for ${cityName} in ${targetLanguages.length} languages`);

    // Set status to generating
    await updateGenerationStatus(supabase, brochureId, 'generating');

    // Initialize i18n objects (preserve existing content for languages not being regenerated)
    const hero_headline_i18n: Record<string, string> = { ...(brochure.hero_headline_i18n || {}) };
    const hero_subtitle_i18n: Record<string, string> = { ...(brochure.hero_subtitle_i18n || {}) };
    const description_i18n: Record<string, string> = { ...(brochure.description_i18n || {}) };
    const features_i18n: Record<string, string[]> = { ...(brochure.features_i18n || {}) };
    const meta_title_i18n: Record<string, string> = { ...(brochure.meta_title_i18n || {}) };
    const meta_description_i18n: Record<string, string> = { ...(brochure.meta_description_i18n || {}) };

    const results: Record<string, { success: boolean; error?: string }> = {};

    // Generate content for each language
    for (const lang of targetLanguages) {
      try {
        console.log(`📝 Generating content for ${cityName} in ${LANGUAGE_NAMES[lang]}...`);
        
        const content = await generateContentForLanguage(cityName, citySlug, lang, openaiApiKey);
        
        hero_headline_i18n[lang] = content.hero_headline;
        hero_subtitle_i18n[lang] = content.hero_subtitle;
        description_i18n[lang] = content.description;
        features_i18n[lang] = content.features;
        meta_title_i18n[lang] = content.meta_title;
        meta_description_i18n[lang] = content.meta_description;

        // Update database with progress after each language
        await supabase
          .from('city_brochures')
          .update({
            hero_headline_i18n,
            hero_subtitle_i18n,
            description_i18n,
            features_i18n,
            meta_title_i18n,
            meta_description_i18n,
          })
          .eq('id', brochureId);

        results[lang] = { success: true };
        console.log(`✅ ${LANGUAGE_NAMES[lang]} content generated successfully`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to generate ${LANGUAGE_NAMES[lang]} content:`, errorMessage);
        results[lang] = { success: false, error: errorMessage };
      }
    }

    // Check if all languages succeeded
    const allSucceeded = Object.values(results).every(r => r.success);
    const finalStatus = allSucceeded ? 'complete' : 'partial';

    // Final update
    await updateGenerationStatus(supabase, brochureId, finalStatus, {
      hero_headline_i18n,
      hero_subtitle_i18n,
      description_i18n,
      features_i18n,
      meta_title_i18n,
      meta_description_i18n,
    });

    console.log(`🏁 Content generation ${finalStatus} for ${cityName}`);

    return new Response(
      JSON.stringify({
        success: true,
        cityName,
        status: finalStatus,
        results,
        languagesGenerated: Object.keys(results).filter(k => results[k].success).length,
        totalLanguages: targetLanguages.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Content generation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
