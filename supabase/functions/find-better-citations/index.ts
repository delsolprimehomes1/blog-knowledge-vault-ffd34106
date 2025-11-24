import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { findBetterCitations, verifyCitations } from "../shared/citationFinder.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      targetContext,
      focusArea,
      verifyUrls = true
    } = await req.json();

    if (!articleTopic || !articleContent) {
      throw new Error('Article topic and content are required');
    }

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    console.log(`Finding better citations for: "${articleTopic}" (${articleLanguage})`);

    // Find citations with Perplexity
    const citations = await findBetterCitations(
      articleTopic,
      articleLanguage,
      articleContent,
      currentCitations,
      perplexityApiKey,
      targetContext,
      focusArea
    );

    if (citations.length === 0) {
      console.warn('No suitable citations found by Perplexity');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No suitable citations found',
          citations: [],
          totalFound: 0,
          verifiedCount: 0,
          language: articleLanguage,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Optionally verify URLs are accessible
    const finalCitations = verifyUrls 
      ? await verifyCitations(citations)
      : citations;

    const verifiedCount = finalCitations.filter((c: any) => c.verified !== false).length;

    console.log(`Returning ${finalCitations.length} citations (${verifiedCount} verified)`);

    return new Response(
      JSON.stringify({
        success: true,
        citations: finalCitations,
        totalFound: finalCitations.length,
        verifiedCount,
        language: articleLanguage,
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in find-better-citations:', error);
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
