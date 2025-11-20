import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Citation {
  url: string;
  sourceName: string;
  description: string;
  relevance: string;
  authorityScore: number;
  suggestedContext: string;
  diversityScore?: number;
  usageCount?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      articleTopic,
      articleLanguage = 'es',
      articleContent,
      currentCitations = [],
    } = await req.json();

    if (!articleTopic || !articleContent) {
      throw new Error('Article topic and content are required');
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`🔍 Finding citations with Gemini for: "${articleTopic}" (${articleLanguage})`);

    // Initialize Supabase client to query approved domains
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get approved domains for this language
    const { data: approvedDomains, error: domainsError } = await supabase
      .from('approved_domains')
      .select('domain, category, trust_score, tier, source_type')
      .eq('is_allowed', true)
      .or(`language.eq.${articleLanguage},language.eq.EU,language.eq.GLOBAL`)
      .order('trust_score', { ascending: false });

    if (domainsError) {
      console.error('Error fetching approved domains:', domainsError);
    }

    const approvedDomainsList = approvedDomains?.map(d => d.domain) || [];
    console.log(`📋 Loaded ${approvedDomainsList.length} approved domains for ${articleLanguage}`);

    // Get domain usage stats for diversity scoring
    const { data: usageStats } = await supabase
      .from('domain_usage_stats')
      .select('domain, total_uses');

    const usageMap = new Map(usageStats?.map(s => [s.domain, s.total_uses]) || []);

    // Language mapping
    const languageMap: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'de': 'German',
      'nl': 'Dutch',
      'fr': 'French',
      'pl': 'Polish',
      'sv': 'Swedish',
      'da': 'Danish',
      'hu': 'Hungarian',
    };

    const targetLanguage = languageMap[articleLanguage] || 'Spanish';

    // Extract content preview
    const bodyPreview = articleContent.substring(0, 1000).replace(/<[^>]+>/g, '');

    // Build the prompt for Gemini
    const prompt = `You are an expert research assistant finding authoritative external citations for real estate articles.

ARTICLE INFORMATION:
Title: "${articleTopic}"
Language: ${targetLanguage}
Content Preview: ${bodyPreview}

YOUR TASK:
Find 4-6 authoritative external sources that support claims or provide context for this article.

SOURCE REQUIREMENTS:
✅ MUST BE IN ${targetLanguage} LANGUAGE
✅ MUST be from credible sources:
   - Government websites (.gov, .gob.es, etc.)
   - Educational institutions (.edu)
   - Reputable news organizations
   - Industry research organizations
   - Real estate associations or councils

❌ MUST NOT BE:
   - Direct real estate competitor websites (property listing sites like Idealista, Fotocasa, etc.)
   - Social media posts
   - User forums
   - Paywalled content

APPROVED DOMAINS (prioritize these):
${approvedDomainsList.slice(0, 50).join(', ')}

CRITICAL: Return ONLY a valid JSON array. No markdown, no code blocks, no explanations.

EXACT JSON FORMAT:
[
  {
    "sourceName": "Organization Name",
    "url": "https://complete-url.com/page",
    "description": "Brief description of the source",
    "relevance": "Why this source is relevant to the article",
    "authorityScore": 8,
    "suggestedContext": "Where in the article to place this citation"
  }
]

Authority scores: Government=9-10, Education=8-9, Major News=7-8, Industry Org=6-7

RETURN ONLY THE JSON ARRAY. NO OTHER TEXT OR FORMATTING.`;

    console.log('📡 Calling Lovable AI (Gemini)...');

    // Call Lovable AI Gateway with Gemini
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway returned ${aiResponse.status}: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices[0].message.content;

    console.log('✅ Gemini response received');
    console.log('📝 Raw response length:', responseText.length);

    // Parse response with multiple fallback methods
    let citations: Citation[] = [];

    // Method 1: Direct JSON parse
    try {
      citations = JSON.parse(responseText);
      console.log('✅ Direct JSON parse successful');
    } catch (e) {
      console.log('⚠️ Direct parse failed, trying extraction...');
    }

    // Method 2: Extract from code blocks
    if (citations.length === 0) {
      const codeBlockMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (codeBlockMatch) {
        try {
          citations = JSON.parse(codeBlockMatch[1]);
          console.log('✅ Extracted from code block');
        } catch (e) {
          console.log('⚠️ Code block extraction failed');
        }
      }
    }

    // Method 3: Find any JSON array
    if (citations.length === 0) {
      const arrayMatch = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      if (arrayMatch) {
        try {
          citations = JSON.parse(arrayMatch[0]);
          console.log('✅ Extracted JSON array via regex');
        } catch (e) {
          console.log('⚠️ Regex extraction failed');
        }
      }
    }

    // Method 4: Clean and parse
    if (citations.length === 0) {
      try {
        const cleaned = responseText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        citations = JSON.parse(cleaned);
        console.log('✅ Parsed after cleaning');
      } catch (e) {
        console.log('⚠️ Cleaned parse failed');
      }
    }

    if (citations.length === 0) {
      console.error('❌ Failed to parse citations');
      console.error('Raw response:', responseText.substring(0, 500));
      throw new Error('Failed to parse AI response');
    }

    // Validate and filter citations
    const validCitations = citations.filter((citation) => {
      if (!citation.url || !citation.sourceName) {
        console.warn('⚠️ Citation missing required fields');
        return false;
      }

      // Extract domain from URL
      try {
        const url = new URL(citation.url);
        const domain = url.hostname.replace('www.', '');

        // Check if domain is in approved list
        const isApproved = approvedDomainsList.some(approved => 
          domain.includes(approved) || approved.includes(domain)
        );

        if (!isApproved) {
          console.warn(`⚠️ Domain not approved: ${domain}`);
        }

        // Calculate diversity score based on usage
        const usageCount = usageMap.get(domain) || 0;
        let diversityScore = 100;
        if (usageCount >= 20) diversityScore = 0;
        else if (usageCount >= 15) diversityScore = 30;
        else if (usageCount >= 10) diversityScore = 60;
        else if (usageCount >= 5) diversityScore = 80;

        citation.diversityScore = diversityScore;
        citation.usageCount = usageCount;

        return true;
      } catch (e) {
        console.warn(`⚠️ Invalid URL: ${citation.url}`);
        return false;
      }
    });

    console.log(`✅ Validated: ${validCitations.length}/${citations.length} citations`);

    if (validCitations.length === 0) {
      throw new Error('No valid citations found after filtering');
    }

    // Sort by diversity score and authority
    validCitations.sort((a, b) => {
      const scoreA = (a.diversityScore || 0) + (a.authorityScore * 10);
      const scoreB = (b.diversityScore || 0) + (b.authorityScore * 10);
      return scoreB - scoreA;
    });

    return new Response(
      JSON.stringify({
        success: true,
        citations: validCitations,
        totalFound: validCitations.length,
        verifiedCount: validCitations.length,
        language: articleLanguage,
        model: 'google/gemini-2.5-flash',
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Error in find-citations-gemini:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        citations: []
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
