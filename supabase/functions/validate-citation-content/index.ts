import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  citationUrl: string;
  targetClaim: string;
  articleLanguage: string;
  sourceName?: string;
}

interface ValidationResult {
  url: string;
  isValid: boolean;
  validationScore: number; // 0-100
  explanation: string;
  keyFactsExtracted: string[];
  relevanceAnalysis: string;
  recommendations?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { citationUrl, targetClaim, articleLanguage, sourceName } = await req.json() as ValidationRequest;

    if (!citationUrl || !targetClaim) {
      throw new Error('citationUrl and targetClaim are required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log(`🔍 Validating citation: ${citationUrl}`);
    console.log(`🎯 Target claim: ${targetClaim}`);

    // Fetch citation page content (with timeout and error handling)
    let pageContent = '';
    let fetchError = null;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const pageResponse = await fetch(citationUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CitationValidator/1.0)',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (pageResponse.ok) {
        const html = await pageResponse.text();
        // Extract text content (simple approach - remove HTML tags)
        pageContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 8000); // Limit to first 8000 chars
      } else {
        fetchError = `HTTP ${pageResponse.status}`;
      }
    } catch (error: any) {
      fetchError = error.name === 'AbortError' ? 'Timeout' : error.message;
      console.warn(`⚠️ Could not fetch page content: ${fetchError}`);
    }

    // Use Lovable AI to validate citation
    const validationPrompt = pageContent 
      ? `You are an expert fact-checker validating whether a citation supports a specific claim.

**Target Claim to Verify:**
"${targetClaim}"

**Citation Source:** ${sourceName || citationUrl}
**Citation URL:** ${citationUrl}

**Page Content (excerpt):**
${pageContent}

**Your Task:**
1. Determine if this citation DIRECTLY supports the target claim
2. Extract key facts/statistics from the citation that relate to the claim
3. Analyze how relevant and reliable the citation is
4. Provide a validation score (0-100) where:
   - 90-100: Perfect match - citation directly supports the claim with specific data
   - 70-89: Good match - citation supports the general claim but may lack specifics
   - 50-69: Partial match - citation is related but doesn't fully support the claim
   - 30-49: Weak match - citation is tangentially related
   - 0-29: No match - citation doesn't support the claim

Respond in this JSON format:
{
  "validationScore": <number 0-100>,
  "isValid": <true if score >= 50>,
  "explanation": "<why the citation does/doesn't support the claim>",
  "keyFactsExtracted": ["<fact 1>", "<fact 2>"],
  "relevanceAnalysis": "<detailed analysis of relevance>",
  "recommendations": "<optional suggestions for improvement>"
}`
      : `You are an expert fact-checker validating whether a citation likely supports a specific claim.

**Target Claim to Verify:**
"${targetClaim}"

**Citation Source:** ${sourceName || citationUrl}
**Citation URL:** ${citationUrl}

**Note:** Page content could not be fetched (${fetchError}). Based on the source name and URL, provide an estimated validation.

Respond in this JSON format:
{
  "validationScore": <number 0-100, conservative estimate>,
  "isValid": <true if score >= 50>,
  "explanation": "<explain that validation is limited without page content>",
  "keyFactsExtracted": [],
  "relevanceAnalysis": "<analysis based on source reputation and URL>",
  "recommendations": "⚠️ Manual verification recommended - page content unavailable"
}`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert fact-checker. Respond ONLY with valid JSON. Be strict but fair in validation.'
          },
          {
            role: 'user',
            content: validationPrompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI error:', aiResponse.status, errorText);
      throw new Error(`AI validation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response:', aiContent);
      throw new Error('Invalid AI response format');
    }

    const validation = JSON.parse(jsonMatch[0]) as ValidationResult;
    
    console.log(`✅ Validation complete: ${validation.validationScore}/100 - ${validation.isValid ? 'VALID' : 'INVALID'}`);

    return new Response(
      JSON.stringify({
        success: true,
        validation: {
          ...validation,
          url: citationUrl,
        },
        pageContentFetched: !!pageContent,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in validate-citation-content:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
