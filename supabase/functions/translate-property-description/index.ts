import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();
    
    if (!description || typeof description !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Translating property description to 9 languages...');

    const prompt = `Translate this property description to Dutch, French, German, Polish, Swedish, Danish, Finnish, Hungarian, and Norwegian. Keep the same luxury real estate marketing tone and style.

English description: "${description}"

Return ONLY a valid JSON object with language codes as keys (no markdown, no explanation):
{
  "nl": "Dutch translation here",
  "fr": "French translation here",
  "de": "German translation here",
  "pl": "Polish translation here",
  "sv": "Swedish translation here",
  "da": "Danish translation here",
  "fi": "Finnish translation here",
  "hu": "Hungarian translation here",
  "no": "Norwegian translation here"
}`;

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
            content: 'You are a professional translator specializing in luxury real estate marketing. Return only valid JSON with no markdown formatting.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('Raw AI response:', content.substring(0, 200));

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // Try to find raw JSON object
      const rawJsonMatch = content.match(/\{[\s\S]*\}/);
      if (rawJsonMatch) {
        jsonStr = rawJsonMatch[0];
      }
    }

    const translations = JSON.parse(jsonStr);
    
    // Validate all required languages are present
    const requiredLangs = ['nl', 'fr', 'de', 'pl', 'sv', 'da', 'fi', 'hu', 'no'];
    for (const lang of requiredLangs) {
      if (!translations[lang]) {
        console.warn(`Missing translation for ${lang}, using English`);
        translations[lang] = description;
      }
    }

    console.log('Translations completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        translations 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Translation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Translation failed';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
