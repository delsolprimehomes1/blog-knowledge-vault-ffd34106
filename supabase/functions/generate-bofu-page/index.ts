import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

// Calculate read time
function calculateReadTime(content: string): number {
  const wordCount = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
  return Math.max(5, Math.ceil(wordCount / 200));
}

// BOFU Page Templates - AI-Query Friendly Titles
const BOFU_TEMPLATES: Record<string, {
  topic: string;
  targetKeyword: string;
  category: string;
  targetAudience: string;
  pageType: string;
  contentFocus: string[];
}> = {
  'golden-visa': {
    topic: 'Golden Visa Spain 2025: Requirements, Costs & Process',
    targetKeyword: 'golden visa spain requirements',
    category: 'Legal & Regulations',
    targetAudience: 'Non-EU investors seeking Spanish residency through property investment',
    pageType: 'comprehensive-guide',
    contentFocus: [
      '€500,000 minimum investment threshold (current 2025 requirement)',
      '10-step application process with exact timelines',
      'Required documents checklist with official forms',
      'Benefits: residency, Schengen travel, path to permanent residency (5 years)',
      'Comparison with Portugal Golden Visa (now closed to property)',
      'Family inclusion rules (spouse, children, dependents)',
      'Tax implications for Golden Visa holders (Beckham Law eligibility)',
      'Common mistakes to avoid and rejection reasons',
      'Processing times by consulate/region',
      'Renewal process and citizenship pathway'
    ]
  },
  'property-costs': {
    topic: 'Property Buying Costs in Spain: Complete Breakdown for 2025',
    targetKeyword: 'property buying costs spain',
    category: 'Buying Guide',
    targetAudience: 'International buyers planning property purchase in Spain',
    pageType: 'calculator-guide',
    contentFocus: [
      'Purchase taxes by region (Andalucía ITP: 7%, new builds VAT: 10%)',
      'Notary fees breakdown (€600-€1,200 typical range)',
      'Land registry fees (€400-€800)',
      'Legal fees (1-1.5% of purchase price)',
      'Mortgage arrangement fees if applicable (1-2%)',
      'Property survey and valuation costs',
      'Worked examples at €300K, €500K, and €1M price points',
      'Annual ongoing costs (IBI property tax, community fees, basura)',
      'Non-resident tax implications (IRNR)',
      'Total cost calculator with all fees included'
    ]
  },
  'nie-number': {
    topic: 'How to Get an NIE Number in Spain (Step-by-Step Guide)',
    targetKeyword: 'nie number spain how to get',
    category: 'Legal & Regulations',
    targetAudience: 'Anyone needing Spanish tax identification for property purchase or business',
    pageType: 'process-guide',
    contentFocus: [
      'What is NIE and who needs it (required for all property transactions)',
      'EX-15 form: exact document reference and where to download',
      'Required documents list with specifications',
      'Application methods (in Spain at police station, via Spanish consulate abroad)',
      'Online booking system for appointments (Cita Previa)',
      'Processing timelines (2-6 weeks typical)',
      'Fees: approximately €9.84 (Tasa 790 code 012)',
      'Common rejection reasons and how to avoid them',
      'Difference between NIE and TIE (residency card)',
      'Using a gestor vs DIY application'
    ]
  },
  'spanish-mortgage': {
    topic: 'Spanish Mortgages for Non-Residents: Rates, Banks & Requirements',
    targetKeyword: 'spanish mortgage non residents',
    category: 'Financing',
    targetAudience: 'Non-resident international buyers seeking mortgage financing in Spain',
    pageType: 'comprehensive-guide',
    contentFocus: [
      'LTV ratios for non-residents (60-70% typical maximum)',
      'Current interest rates 2025 (fixed: 3.5-4.5%, variable: Euribor + 1-2%)',
      'Bank comparison: Sabadell, Santander, BBVA, CaixaBank, Bankinter',
      'Income requirements and documentation (3x gross salary rule)',
      'Required documents checklist for non-residents',
      'Step-by-step mortgage application process (6-8 weeks typical)',
      'Mortgage costs and fees (1-2% arrangement, valuation, AJD tax)',
      'Currency considerations for non-Euro earners (GBP, USD, SEK)',
      'Self-employed vs employed requirements',
      'Age limits and maximum term (typically to age 70-75)'
    ]
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const { 
      templateId, 
      customTopic, 
      customKeyword, 
      customAudience,
      language = 'en',
      authorId,
      generateAll = false 
    } = await req.json();

    console.log(`[BOFU Generator] Starting generation...`, { templateId, customTopic, generateAll, language });

    // Fetch approved domains for citations
    const { data: approvedDomains } = await supabase
      .from('approved_domains')
      .select('domain, category, trust_score')
      .eq('is_allowed', true)
      .gte('trust_score', 70)
      .limit(50);

    const topDomains = (approvedDomains || [])
      .map(d => d.domain)
      .slice(0, 20)
      .join(', ');

    // Determine which templates to generate
    const templatesToGenerate: string[] = generateAll 
      ? Object.keys(BOFU_TEMPLATES) 
      : [templateId];

    const results: any[] = [];
    const errors: string[] = [];

    for (const tplId of templatesToGenerate) {
      try {
        const template = BOFU_TEMPLATES[tplId];
        
        if (!template && !customTopic) {
          errors.push(`Template ${tplId} not found`);
          continue;
        }

        const topic = customTopic || template.topic;
        const targetKeyword = customKeyword || template?.targetKeyword || topic.toLowerCase();
        const targetAudience = customAudience || template?.targetAudience || 'International property buyers';
        const category = template?.category || 'Buying Guide';
        const contentFocus = template?.contentFocus || [];

        console.log(`[BOFU Generator] Generating: ${topic}`);

        // Check if article already exists
        const proposedSlug = generateSlug(topic);
        const { data: existing } = await supabase
          .from('blog_articles')
          .select('id, slug')
          .eq('slug', proposedSlug)
          .single();

        if (existing) {
          console.log(`[BOFU Generator] Article already exists: ${proposedSlug}`);
          results.push({ 
            templateId: tplId, 
            status: 'exists', 
            articleId: existing.id,
            slug: existing.slug 
          });
          continue;
        }

        // Generate the BOFU page content
        const prompt = `You are an expert real estate content writer specializing in Spain's Costa del Sol property market. Create a comprehensive BOFU (Bottom of Funnel) guide that is optimized for AI citation and voice search.

TOPIC: ${topic}
TARGET KEYWORD: ${targetKeyword}
TARGET AUDIENCE: ${targetAudience}
LANGUAGE: ${language === 'en' ? 'English' : language}

${contentFocus.length > 0 ? `MUST COVER THESE TOPICS:\n${contentFocus.map((f, i) => `${i + 1}. ${f}`).join('\n')}` : ''}

APPROVED CITATION SOURCES (use these domains when citing statistics or facts):
${topDomains}

Generate a complete article with the following JSON structure:

{
  "headline": "Clear, intent-matching headline under 70 characters",
  "meta_title": "SEO title under 60 characters including primary keyword",
  "meta_description": "Compelling meta description 150-160 characters with keyword",
  "speakable_answer": "A concise 50-80 word answer that directly answers the main question. This should be citation-worthy for AI systems like Google's featured snippets.",
  "executive_summary": "A 2-3 sentence summary providing the key takeaways upfront.",
  "detailed_content": "Full HTML content with proper structure: multiple H2 and H3 headings, bullet lists, tables where appropriate, at least 3000 words. Include practical steps, real costs, timelines. Use <strong> for key terms.",
  "qa_entities": [
    {
      "question": "Decision-level question buyers ask",
      "answer": "Clear, helpful answer 2-4 sentences"
    }
  ],
  "external_citations": [
    {
      "text": "Anchor text for the citation",
      "url": "https://approved-domain.com/relevant-page",
      "source": "Source Name",
      "verified": true
    }
  ],
  "featured_image_alt": "Descriptive alt text for hero image",
  "featured_image_caption": "Caption explaining the image context"
}

CRITICAL REQUIREMENTS:
1. The speakable_answer MUST be a complete, standalone answer suitable for voice assistants
2. Include 8-10 qa_entities with genuine buyer questions
3. Content must be factual with current 2024-2025 data
4. Include step-by-step processes where relevant
5. Add cost breakdowns with actual figures
6. The detailed_content must have at least 6 H2 sections
7. Use tables for comparisons and cost breakdowns
8. Cite sources from the approved domains list
9. NO placeholder text - all content must be complete
10. Focus on actionable, practical information

Return ONLY valid JSON, no markdown code blocks.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: 'You are a professional real estate content writer. Return only valid JSON.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 8000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[BOFU Generator] AI API error:`, errorText);
          errors.push(`Failed to generate ${tplId}: AI API error`);
          continue;
        }

        const aiData = await response.json();
        let content = aiData.choices?.[0]?.message?.content || '';

        // Clean JSON response
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let articleData;
        try {
          articleData = JSON.parse(content);
        } catch (parseError) {
          console.error(`[BOFU Generator] JSON parse error for ${tplId}:`, parseError);
          errors.push(`Failed to parse ${tplId}: Invalid JSON from AI`);
          continue;
        }

        // Filter citations to approved domains only
        const filteredCitations = (articleData.external_citations || []).filter((c: any) => {
          const domain = extractDomain(c.url);
          return approvedDomains?.some(d => d.domain === domain);
        });

        // Create the article
        const slug = generateSlug(articleData.headline || topic);
        const now = new Date().toISOString();

        const { data: newArticle, error: insertError } = await supabase
          .from('blog_articles')
          .insert({
            slug,
            language,
            category,
            funnel_stage: 'BOFU',
            is_primary: true,
            headline: articleData.headline,
            meta_title: articleData.meta_title,
            meta_description: articleData.meta_description,
            speakable_answer: articleData.speakable_answer,
            detailed_content: articleData.detailed_content,
            featured_image_url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=630&fit=crop',
            featured_image_alt: articleData.featured_image_alt || `${topic} guide`,
            featured_image_caption: articleData.featured_image_caption,
            qa_entities: articleData.qa_entities || [],
            external_citations: filteredCitations,
            internal_links: [],
            author_id: authorId || null,
            status: 'draft',
            date_published: null,
            date_modified: now,
            read_time: calculateReadTime(articleData.detailed_content || ''),
            created_at: now,
            updated_at: now,
          })
          .select('id, slug, headline')
          .single();

        if (insertError) {
          console.error(`[BOFU Generator] Insert error for ${tplId}:`, insertError);
          errors.push(`Failed to save ${tplId}: ${insertError.message}`);
          continue;
        }

        console.log(`[BOFU Generator] ✅ Created: ${newArticle.slug}`);
        results.push({
          templateId: tplId,
          status: 'created',
          articleId: newArticle.id,
          slug: newArticle.slug,
          headline: newArticle.headline
        });

      } catch (templateError: unknown) {
        const errMsg = templateError instanceof Error ? templateError.message : 'Unknown error';
        console.error(`[BOFU Generator] Error generating ${tplId}:`, templateError);
        errors.push(`Error generating ${tplId}: ${errMsg}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: results.filter(r => r.status === 'created').length,
        existing: results.filter(r => r.status === 'exists').length,
        failed: errors.length,
        results,
        errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BOFU Generator] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
