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
      language = 'en',
      languages = [], // NEW: batch multilingual support
      include_internal_links = false,
      include_citations = false,
      suggested_headline = '',
    } = await req.json();

    // Validate language is supported (folder-language mismatch prevention)
    const requestedLanguage = language || 'en';
    if (!ALL_SUPPORTED_LANGUAGES.includes(requestedLanguage)) {
      return new Response(
        JSON.stringify({ 
          error: `Unsupported language: ${requestedLanguage}. Supported languages: ${ALL_SUPPORTED_LANGUAGES.join(', ')}`,
          validLanguages: ALL_SUPPORTED_LANGUAGES,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!option_a || !option_b) {
      return new Response(
        JSON.stringify({ error: 'option_a and option_b are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Determine languages to generate
    const isMultilingual = languages.length > 1 || languages.includes('all');
    const targetLanguages = languages.includes('all') 
      ? ALL_SUPPORTED_LANGUAGES 
      : languages.length > 0 
        ? languages 
        : [language];

    console.log('Generating comparison:', { 
      option_a, 
      option_b, 
      niche, 
      languages: targetLanguages,
      isMultilingual,
      include_internal_links, 
      include_citations 
    });

    // Generate shared hreflang_group_id for all language versions
    const hreflangGroupId = crypto.randomUUID();
    console.log(`Generated hreflang_group_id: ${hreflangGroupId} for ${targetLanguages.length} language versions`);

    // Fetch internal BOFU articles for linking
    let bofuArticles: any[] = [];
    let approvedDomains: any[] = [];
    
    if (include_internal_links || include_citations) {
      // Fetch BOFU articles for internal linking
      const { data: articlesData } = await supabase
        .from('blog_articles')
        .select('headline, slug, meta_description, language')
        .eq('status', 'published')
        .eq('funnel_stage', 'bofu')
        .limit(20);
      
      if (articlesData) bofuArticles = articlesData;
      
      // Fetch approved domains for citations
      const { data: domainsData } = await supabase
        .from('approved_domains')
        .select('domain, category, language, trust_score')
        .eq('is_allowed', true)
        .order('trust_score', { ascending: false })
        .limit(30);
      
      if (domainsData) approvedDomains = domainsData;
    }

    const results: any[] = [];
    let englishComparison: any = null;

    // Generate for each target language
    for (const lang of targetLanguages) {
      const languageName = LANGUAGE_NAMES[lang] || 'English';
      const isTranslation = lang !== 'en' && englishComparison;

      console.log(`Generating comparison for ${languageName} (${lang})...`);

      // Build the prompt with suggested headline support
      const headlineInstruction = suggested_headline 
        ? `Use exactly: "${suggested_headline}"`
        : `Create an AI-query friendly headline like "[Option A] vs [Option B]: Which Should You [Choose/Buy/Invest in] in 2025?" Include location context (Spain/Marbella/Costa del Sol) where natural.`;
      
      const suggestedHeadlineSection = suggested_headline 
        ? `* Suggested Headline: "${suggested_headline}" (USE THIS EXACTLY)`
        : '';
      
      let prompt = MASTER_PROMPT
        .replace(/\[OPTION_A\]/g, option_a)
        .replace(/\[OPTION_B\]/g, option_b)
        .replace('[NICHE]', niche || 'real-estate')
        .replace('[AUDIENCE]', target_audience || 'property buyers and investors')
        .replace('[HEADLINE_INSTRUCTION]', headlineInstruction)
        .replace('[SUGGESTED_HEADLINE_SECTION]', suggestedHeadlineSection);

      // For translations, use English content as source
      let systemPrompt = lang !== 'en' 
        ? `Generate all content in ${languageName} language. The structure and field names must remain in English, but all values/content must be in ${languageName}. STRICTLY follow all word limits specified in the prompt.`
        : 'Generate all content in English. STRICTLY follow all word limits specified in the prompt.';

      if (isTranslation && englishComparison) {
        // Translate from English source
        prompt = `Translate this comparison page content from English to ${languageName}.
        
Keep the JSON structure EXACTLY the same but translate all text content to ${languageName}.
Maintain the same tone: Authoritative, Neutral, Evidence-based.

Source content (English):
${JSON.stringify(englishComparison, null, 2)}

Return ONLY valid JSON with all content in ${languageName}, no markdown, no explanation.`;
        
        systemPrompt = `You are a professional translator. Translate all content to ${languageName} while maintaining the exact JSON structure.`;
      }

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
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 6000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI API error for ${lang}:`, response.status, errorText);
        
        if (response.status === 429) {
          results.push({ language: lang, error: 'Rate limit exceeded' });
          continue;
        }
        if (response.status === 402) {
          results.push({ language: lang, error: 'Payment required' });
          continue;
        }
        
        results.push({ language: lang, error: `AI API error: ${response.status}` });
        continue;
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content;

      if (!content) {
        results.push({ language: lang, error: 'No content received from AI' });
        continue;
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
        console.error(`JSON parse error for ${lang}:`, parseError);
        results.push({ language: lang, error: 'Failed to parse AI response' });
        continue;
      }

      // Save English version for translation reference
      if (lang === 'en') {
        englishComparison = parsed;
      }

      // Generate internal links from BOFU articles
      const internalLinks: any[] = [];
      if (include_internal_links && bofuArticles.length > 0) {
        const langArticles = bofuArticles.filter(a => a.language === lang);
        const topicKeywords = [option_a.toLowerCase(), option_b.toLowerCase(), 'property', 'investment', 'spain', 'costa del sol'];
        
        langArticles.forEach(article => {
          const headline = article.headline?.toLowerCase() || '';
          const slug = article.slug?.toLowerCase() || '';
          
          const isRelevant = topicKeywords.some(keyword => 
            headline.includes(keyword) || slug.includes(keyword.replace(/\s+/g, '-'))
          );
          
          if (isRelevant || internalLinks.length < 4) {
            internalLinks.push({
              url: `/blog/${article.slug}`,
              anchor_text: article.headline,
              context: article.meta_description,
              relevance: isRelevant ? 'high' : 'medium',
            });
          }
        });
      }

      // Generate external citations from approved domains
      const externalCitations: any[] = [];
      if (include_citations && approvedDomains.length > 0) {
        const relevantDomains = approvedDomains.filter(d => 
          d.language === lang || d.language === null || d.language === 'en'
        ).slice(0, 5);
        
        relevantDomains.forEach(domain => {
          externalCitations.push({
            source: domain.domain,
            url: `https://${domain.domain}`,
            category: domain.category,
            trust_score: domain.trust_score,
            suggested_anchor: `Source: ${domain.domain}`,
          });
        });
      }

      // Build the comparison object with hreflang_group_id and source_language
      const baseSlug = parsed.suggested_slug || `${option_a}-vs-${option_b}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const slug = lang === 'en' ? baseSlug : `${baseSlug}-${lang}`;

      const comparison = {
        option_a,
        option_b,
        comparison_topic: `${option_a} vs ${option_b}`,
        niche: niche || 'real-estate',
        target_audience: target_audience || 'property buyers and investors',
        language: lang,
        source_language: 'en', // English-first strategy
        hreflang_group_id: hreflangGroupId,
        slug,
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
        internal_links: internalLinks,
        external_citations: externalCitations,
        status: 'draft',
      };

      results.push({ 
        language: lang, 
        success: true, 
        comparison,
        slug: comparison.slug 
      });

      console.log(`Generated comparison for ${lang}: ${comparison.slug}`);
    }

    // Link translations between language versions
    if (isMultilingual && results.filter(r => r.success).length > 1) {
      const translations: Record<string, string> = {};
      for (const result of results) {
        if (result.success && result.comparison) {
          translations[result.language] = result.comparison.slug;
        }
      }

      // Update each comparison with translations
      for (const result of results) {
        if (result.success && result.comparison) {
          const siblings = { ...translations };
          delete siblings[result.language];
          result.comparison.translations = siblings;
        }
      }

      console.log(`Linked translations across ${Object.keys(translations).length} languages`);
    }

    // Return single comparison for single-language mode, array for multilingual
    if (targetLanguages.length === 1) {
      const result = results[0];
      if (result.error) {
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, comparison: result.comparison }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        comparisons: results.filter(r => r.success).map(r => r.comparison),
        results,
        hreflang_group_id: hreflangGroupId,
      }),
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
