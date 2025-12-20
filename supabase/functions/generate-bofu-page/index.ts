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

// BOFU Page Templates
const BOFU_TEMPLATES: Record<string, {
  topic: string;
  targetKeyword: string;
  category: string;
  targetAudience: string;
  pageType: string;
  contentFocus: string[];
}> = {
  'golden-visa': {
    topic: 'Golden Visa Spain Complete Guide 2025',
    targetKeyword: 'golden visa spain',
    category: 'Legal & Regulations',
    targetAudience: 'Non-EU investors seeking Spanish residency through property investment',
    pageType: 'comprehensive-guide',
    contentFocus: [
      'Investment thresholds (€500K minimum property investment)',
      '10-step application process with timelines',
      'Required documents checklist',
      'Benefits (residency, Schengen travel, path to citizenship)',
      'Comparison with Portugal Golden Visa changes',
      'Family inclusion options',
      'Tax implications for Golden Visa holders',
      'Common mistakes to avoid'
    ]
  },
  'property-costs': {
    topic: 'Costa del Sol Property Buying Costs Complete Breakdown',
    targetKeyword: 'costa del sol property buying costs',
    category: 'Buying Guide',
    targetAudience: 'International buyers planning property purchase on Costa del Sol',
    pageType: 'calculator-guide',
    contentFocus: [
      'Purchase taxes (ITP 7-10% for resale, VAT 10% for new builds)',
      'Notary fees (€600-€1,200)',
      'Land registry fees (€400-€800)',
      'Legal fees (1-1.5% of purchase price)',
      'Mortgage arrangement fees if applicable',
      'Property survey costs',
      'Worked examples at €300K, €500K, and €1M price points',
      'Annual ownership costs overview'
    ]
  },
  'nie-number': {
    topic: 'NIE Number Spain Complete Application Guide',
    targetKeyword: 'nie number spain',
    category: 'Legal & Regulations',
    targetAudience: 'Anyone needing Spanish tax identification for property purchase or business',
    pageType: 'process-guide',
    contentFocus: [
      'What is NIE and who needs it',
      'Required documents list',
      'Application methods (in Spain at police station, via consulate abroad)',
      'Online booking system for appointments',
      'Processing timelines (2-4 weeks typical)',
      'Costs (€10-15 for the form)',
      'Common rejection reasons and how to avoid them',
      'Difference between NIE and TIE'
    ]
  },
  'spanish-mortgage': {
    topic: 'Spanish Mortgage for Non-Residents Complete Guide',
    targetKeyword: 'spanish mortgage non residents',
    category: 'Financing',
    targetAudience: 'Non-resident international buyers seeking mortgage financing in Spain',
    pageType: 'comprehensive-guide',
    contentFocus: [
      'LTV ratios for non-residents (typically 60-70%)',
      'Income requirements and documentation',
      'Interest rates comparison (fixed vs variable)',
      'Spanish bank options for non-residents',
      'Required documents checklist',
      'Step-by-step mortgage application process',
      'Mortgage costs and fees',
      'Currency considerations for non-Euro earners'
    ]
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
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

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
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
