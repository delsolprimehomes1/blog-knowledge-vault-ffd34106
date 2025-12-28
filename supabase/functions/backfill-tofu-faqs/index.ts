import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Article {
  id: string;
  headline: string;
  detailed_content: string;
  meta_description: string;
  language: string;
  funnel_stage: string;
}

const languageMap: Record<string, string> = {
  'en': 'English', 'de': 'German', 'nl': 'Dutch', 'fr': 'French',
  'pl': 'Polish', 'sv': 'Swedish', 'da': 'Danish', 'hu': 'Hungarian',
  'fi': 'Finnish', 'no': 'Norwegian', 'es': 'Spanish', 'it': 'Italian',
  'ru': 'Russian', 'tr': 'Turkish'
};

async function generateFAQsForArticle(
  article: Article,
  OPENAI_API_KEY: string
): Promise<Array<{ question: string; answer: string }>> {
  const faqLanguageName = languageMap[article.language] || 'English';
  
  const faqPrompt = `Generate 3-5 FAQ entities for this article.

CRITICAL: Both questions AND answers MUST be written in ${faqLanguageName}. Do NOT write in English unless the article language is English.

Article Language: ${faqLanguageName}
Funnel Stage: ${article.funnel_stage}
Headline: ${article.headline}
Description: ${article.meta_description}
Content Summary: ${article.detailed_content.substring(0, 800)}...

Return ONLY valid JSON with questions and answers in ${faqLanguageName}:
{
  "faqs": [
    {
      "question": "Question in ${faqLanguageName}?",
      "answer": "Concise answer in ${faqLanguageName} (2-3 sentences)"
    }
  ]
}`;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 45000);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2048,
        messages: [{ role: 'user', content: faqPrompt }],
      }),
      signal: abortController.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded - please try again later');
      }
      if (response.status === 402) {
        throw new Error('Payment required - please add credits');
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const faqText = data.choices?.[0]?.message?.content;
    
    if (!faqText) {
      throw new Error('No FAQ content in response');
    }

    const cleanedText = faqText.replace(/```json\n?|\n?```/g, '').trim();
    const faqResult = JSON.parse(cleanedText);
    
    if (!Array.isArray(faqResult.faqs) || faqResult.faqs.length === 0) {
      throw new Error('Invalid FAQ structure');
    }

    return faqResult.faqs;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { clusterId, language, batchSize = 10, dryRun = false } = await req.json();

    // Build query for TOFU articles missing FAQs
    let query = supabase
      .from('blog_articles')
      .select('id, headline, detailed_content, meta_description, language, funnel_stage')
      .eq('funnel_stage', 'TOFU')
      .eq('status', 'published')
      .or('qa_entities.is.null,qa_entities.eq.[]');

    if (clusterId) {
      query = query.eq('cluster_id', clusterId);
    }

    if (language) {
      query = query.eq('language', language);
    }

    query = query.limit(batchSize);

    const { data: articles, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    if (!articles || articles.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No TOFU articles need FAQ backfill',
        processed: 0,
        remaining: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 Found ${articles.length} TOFU articles to backfill with FAQs`);

    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const article of articles) {
      try {
        console.log(`🔄 Generating FAQs for: ${article.headline.substring(0, 50)}...`);
        
        const faqs = await generateFAQsForArticle(article as Article, OPENAI_API_KEY);
        
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('blog_articles')
            .update({ 
              qa_entities: faqs,
              updated_at: new Date().toISOString()
            })
            .eq('id', article.id);

          if (updateError) {
            throw updateError;
          }
        }

        console.log(`✅ Generated ${faqs.length} FAQs for article ${article.id}`);
        results.success++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed for ${article.id}: ${errorMsg}`);
        results.failed++;
        results.errors.push(`${article.id}: ${errorMsg}`);
      }
      
      results.processed++;
    }

    // Check how many remain
    const { count: remainingCount } = await supabase
      .from('blog_articles')
      .select('id', { count: 'exact', head: true })
      .eq('funnel_stage', 'TOFU')
      .eq('status', 'published')
      .or('qa_entities.is.null,qa_entities.eq.[]');

    return new Response(JSON.stringify({
      success: true,
      message: `Backfilled FAQs for ${results.success} TOFU articles`,
      processed: results.processed,
      successCount: results.success,
      failed: results.failed,
      remaining: remainingCount || 0,
      errors: results.errors,
      dryRun
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
