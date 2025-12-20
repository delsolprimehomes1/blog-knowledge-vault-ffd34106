import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MASTER_PROMPT = `You are an expert comparison content strategist and answer-engine optimizer.

Create a **decision-focused comparison page** designed to be cited by AI systems (ChatGPT, Perplexity, Google AI Overviews, Bing Copilot).

### Comparison Topic
**[OPTION_A] vs [OPTION_B]**

### Context
* Industry/Niche: [NICHE]
* Location: Costa del Sol, Spain
* Audience: [AUDIENCE]
* Intent Stage: Decision / Evaluation

### Requirements

Produce content as JSON with this exact structure:

{
  "headline": "[Option A] vs [Option B]: Which Is Better for [Audience/Goal]?",
  "meta_title": "Short SEO title under 60 characters",
  "meta_description": "Meta description under 160 characters with target keyword naturally integrated",
  "speakable_answer": "50-80 word neutral, factual, citation-ready summary answering 'Which is better and why?'. Non-salesy, suitable for voice assistants.",
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
    {"question": "Natural language question", "answer": "Clear, objective answer in 30-50 words"},
    {"question": "...", "answer": "..."}
  ],
  "suggested_slug": "url-friendly-slug",
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

Tone: Authoritative, Neutral, Evidence-based, Human-readable, AI-friendly. Avoid hype, exaggeration, or sales language.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { option_a, option_b, niche, target_audience, language = 'en' } = await req.json();

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

    // Build the prompt
    const prompt = MASTER_PROMPT
      .replace(/\[OPTION_A\]/g, option_a)
      .replace(/\[OPTION_B\]/g, option_b)
      .replace('[NICHE]', niche || 'real-estate')
      .replace('[AUDIENCE]', target_audience || 'property buyers and investors');

    const systemPrompt = language !== 'en' 
      ? `Generate all content in ${language} language. The structure and field names must remain in English, but all values/content must be in ${language}. STRICTLY follow all word limits specified in the prompt.`
      : 'Generate all content in English. STRICTLY follow all word limits specified in the prompt.';

    console.log('Generating comparison:', { option_a, option_b, niche, language });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 6000, // Reduced to encourage conciseness
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
      throw new Error('No content received from AI');
    }

    // Parse JSON from response (handle potential markdown wrapping)
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Build the comparison object
    const comparison = {
      option_a,
      option_b,
      comparison_topic: `${option_a} vs ${option_b}`,
      niche: niche || 'real-estate',
      target_audience: target_audience || 'property buyers and investors',
      language,
      slug: parsed.suggested_slug || `${option_a}-vs-${option_b}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      headline: parsed.headline,
      meta_title: parsed.meta_title,
      meta_description: parsed.meta_description,
      speakable_answer: parsed.speakable_answer,
      quick_comparison_table: parsed.quick_comparison_table || [],
      option_a_overview: parsed.option_a_overview,
      option_b_overview: parsed.option_b_overview,
      side_by_side_breakdown: parsed.side_by_side_breakdown,
      use_case_scenarios: parsed.use_case_scenarios,
      final_verdict: parsed.final_verdict,
      qa_entities: parsed.qa_entities || [],
      status: 'draft',
    };

    console.log('Generated comparison successfully:', comparison.slug);

    return new Response(
      JSON.stringify({ success: true, comparison }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-comparison:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
