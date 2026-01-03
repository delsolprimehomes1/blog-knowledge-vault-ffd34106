import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Canonical 10 languages (aligned with src/types/hreflang.ts)
const SUPPORTED_LANGUAGES = ['en', 'nl', 'hu', 'de', 'fr', 'sv', 'pl', 'no', 'fi', 'da'];

const MASTER_PROMPT = `You are generating an AI-citation-ready Location Intelligence page.

GOAL:
Create a location-specific page designed to be cited by:
- ChatGPT
- Perplexity
- Google AI Overviews
- Bing Copilot

The content must be:
- Fact-based
- Neutral
- Helpful
- Structured for AI extraction

DO NOT use sales language.
DO NOT use markdown in final output.
Return clean HTML only in content fields.

LOCATION:
City: [CITY]
Region: [REGION]
Country: [COUNTRY]
Business Type: Real Estate

PRIMARY PAGE INTENT:
[INTENT_TYPE]
Examples:
- Buying Property in [CITY]
- Best Areas in [CITY] for [GOAL]
- Cost of Living in [CITY]

OUTPUT STRUCTURE (STRICT JSON):

{
  "headline": "Clear, intent-matching H1 headline",
  "meta_title": "SEO title under 60 characters with main keyword",
  "meta_description": "Meta description under 160 characters with target keyword naturally integrated",
  "speakable_answer": "50-80 word neutral, factual summary. Written for voice & AI citation. Answer the main query directly. No sales language.",
  "location_overview": "HTML (MAX 200 WORDS). Where the city is, who it's best for, key characteristics. Use <p>, <strong>, <ul>, <li>.",
  "market_breakdown": "HTML (MAX 300 WORDS). Prices, ranges, expectations. What affects cost or outcomes. Seasonal or demand factors. Use <p>, <h3>, <ul>, <li>.",
  "best_areas": [
    {
      "name": "Area/Neighborhood name",
      "description": "Who it's best for in 1-2 sentences",
      "pros": ["Pro 1", "Pro 2", "Pro 3"],
      "cons": ["Con 1", "Con 2"],
      "price_range": "Typical price range or cost indicator"
    }
  ],
  "cost_breakdown": [
    {"item": "Cost item name", "range": "Price range", "notes": "Brief note"},
    {"item": "Another item", "range": "Range", "notes": "Note"}
  ],
  "use_cases": "HTML (MAX 200 WORDS). Ideal scenarios. Who should consider this location. Who should consider alternatives. Use <h3>, <p>, <ul>, <li>.",
  "final_summary": "HTML (MAX 100 WORDS). Neutral conclusion. Reinforces decision clarity. Use <p>.",
  "qa_entities": [
    {"question": "Real question users ask", "answer": "Clear, direct answer in 30-50 words"},
    {"question": "Another question", "answer": "Another answer"}
  ],
  "suggested_slug": "url-friendly-slug-with-city-and-intent",
  "image_prompt": "Professional real estate photography style image showing: [describe visual for the city/topic]. Modern, clean, Costa del Sol setting. No text overlays."
}

CRITICAL RULES:
1. CONCISENESS IS KEY: AI systems extract short, focused content. Long content gets diluted.
2. WORD LIMITS ARE STRICT: Follow the MAX WORDS limits for each section.
3. NO MARKDOWN in HTML fields. Use ONLY: <p>, <ul>, <li>, <strong>, <em>, <h3>, <h4>
4. Every list must use <ul><li>...</li></ul> format
5. Wrap paragraphs in <p> tags
6. Use <strong> for emphasis, not **
7. NO fluff, filler words, or repetitive content
8. Each sentence must add unique value
9. best_areas should have 3-5 neighborhoods/areas
10. cost_breakdown should have 5-8 cost items relevant to the intent
11. qa_entities should have 4-6 FAQs

Tone: Authoritative, Neutral, Evidence-based, Human-readable, AI-friendly. Avoid hype, exaggeration, or sales language.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`;

// Generate UUID v4 for hreflang group linking
function generateHreflangGroupId(): string {
  return crypto.randomUUID();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      city, 
      region = 'Andalusia', 
      country = 'Spain', 
      intent_type,
      goal,
      language = 'en',
      languages = [], // Array of languages for batch generation
      batch_mode = false, // Enable batch multilingual generation
    } = await req.json();

    // Validate language is supported (folder-language mismatch prevention)
    const requestedLanguage = language || 'en';
    if (!SUPPORTED_LANGUAGES.includes(requestedLanguage)) {
      return new Response(
        JSON.stringify({ 
          error: `Unsupported language: ${requestedLanguage}. Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`,
          validLanguages: SUPPORTED_LANGUAGES,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!city || !intent_type) {
      return new Response(
        JSON.stringify({ error: 'city and intent_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Determine which languages to generate
    let targetLanguages: string[] = [];
    if (batch_mode && languages.length > 0) {
      // Use provided languages array
      targetLanguages = languages.filter((l: string) => SUPPORTED_LANGUAGES.includes(l));
    } else if (batch_mode) {
      // Default to all 10 languages
      targetLanguages = [...SUPPORTED_LANGUAGES];
    } else {
      // Single language mode
      targetLanguages = [language];
    }

    // Ensure English is first (source language)
    if (batch_mode && !targetLanguages.includes('en')) {
      targetLanguages.unshift('en');
    } else if (batch_mode && targetLanguages[0] !== 'en') {
      targetLanguages = ['en', ...targetLanguages.filter(l => l !== 'en')];
    }

    console.log('Location generation mode:', batch_mode ? 'batch' : 'single');
    console.log('Target languages:', targetLanguages);

    // Build intent description
    const intentDescriptions: Record<string, string> = {
      'buying-property': `Buying Property in ${city}`,
      'best-areas-families': `Best Areas in ${city} for Families`,
      'best-areas-investors': `Best Areas in ${city} for Investors`,
      'best-areas-expats': `Best Areas in ${city} for Expats`,
      'best-areas-retirees': `Best Areas in ${city} for Retirees`,
      'cost-of-living': `Cost of Living in ${city}`,
      'cost-of-property': `Cost of Property in ${city}`,
      'investment-guide': `Investment Guide for ${city}`,
      'relocation-guide': `Relocation Guide to ${city}`,
    };

    const intentDescription = intentDescriptions[intent_type] || `${intent_type} in ${city}`;

    // Build the prompt
    const prompt = MASTER_PROMPT
      .replace(/\[CITY\]/g, city)
      .replace('[REGION]', region)
      .replace('[COUNTRY]', country)
      .replace('[INTENT_TYPE]', intentDescription)
      .replace('[GOAL]', goal || 'property buyers');

    // Generate shared hreflang_group_id for batch mode
    const hreflangGroupId = batch_mode ? generateHreflangGroupId() : null;

    const generatedPages: any[] = [];
    let englishVersion: any = null;

    for (let i = 0; i < targetLanguages.length; i++) {
      const targetLang = targetLanguages[i];
      
      let systemPrompt: string;
      let currentPrompt: string;
      
      if (targetLang === 'en') {
        // Generate English version first
        systemPrompt = 'Generate all content in English. STRICTLY follow all word limits specified in the prompt.';
        currentPrompt = prompt;
      } else {
        // For translations, use the English content as reference
        systemPrompt = `Translate and adapt the following content to ${targetLang} language. 
The structure and field names must remain in English, but all values/content must be translated to ${targetLang}.
STRICTLY follow all word limits specified in the prompt.
Adapt cultural references and examples to be relevant for ${targetLang}-speaking audiences while maintaining factual accuracy.`;
        
        // Include English version for reference in translation
        currentPrompt = englishVersion 
          ? `Original English content for reference:\n${JSON.stringify(englishVersion, null, 2)}\n\nTranslate and adapt this content to ${targetLang}, following the same structure.`
          : prompt;
      }

      console.log(`Generating ${targetLang} version (${i + 1}/${targetLanguages.length})...`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: currentPrompt }
          ],
          temperature: 0.7,
          max_tokens: 8000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Payment required. Please add credits to continue.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(`AI API error: ${response.status}`);
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error(`No content received from AI for ${targetLang}`);
      }

      // Parse JSON from response
      let parsed;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error(`JSON parse error for ${targetLang}:`, parseError);
        throw new Error(`Failed to parse AI response as JSON for ${targetLang}`);
      }

      // Save English version for translation reference
      if (targetLang === 'en') {
        englishVersion = parsed;
      }

      // Generate language-specific slug
      const baseSlug = parsed.suggested_slug || `${intent_type}-${city}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const langSlug = targetLang === 'en' ? baseSlug : `${baseSlug}-${targetLang}`;

      // Build the location page object
      const locationPage = {
        city_slug: city.toLowerCase().replace(/\s+/g, '-'),
        city_name: city,
        region,
        country,
        intent_type,
        topic_slug: langSlug,
        headline: parsed.headline,
        meta_title: parsed.meta_title,
        meta_description: parsed.meta_description,
        speakable_answer: parsed.speakable_answer,
        location_overview: parsed.location_overview,
        market_breakdown: parsed.market_breakdown,
        best_areas: parsed.best_areas || [],
        cost_breakdown: parsed.cost_breakdown || [],
        use_cases: parsed.use_cases,
        final_summary: parsed.final_summary,
        qa_entities: parsed.qa_entities || [],
        language: targetLang,
        source_language: 'en', // Always English-first strategy
        status: 'draft',
        image_prompt: parsed.image_prompt,
        hreflang_group_id: hreflangGroupId,
        content_type: 'location',
      };

      generatedPages.push(locationPage);
      console.log(`Generated ${targetLang} location page successfully:`, locationPage.topic_slug);
    }

    // Return based on mode
    if (batch_mode) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          locationPages: generatedPages,
          hreflang_group_id: hreflangGroupId,
          languages_generated: targetLanguages,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: true, locationPage: generatedPages[0] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in generate-location-page:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
