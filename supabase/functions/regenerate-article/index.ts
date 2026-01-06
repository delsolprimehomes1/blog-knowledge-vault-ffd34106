import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function countWords(html: string): number {
  const text = (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function extractJsonFromResponse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {}
    }
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {}
    }
    throw new Error('Failed to parse JSON from response');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleId } = await req.json();
    
    if (!articleId) {
      return new Response(JSON.stringify({ success: false, error: 'articleId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Fetch existing article
    const { data: article, error: articleError } = await supabase
      .from('blog_articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      throw new Error(`Article not found: ${articleError?.message || 'No data'}`);
    }

    const oldWordCount = countWords(article.detailed_content || '');
    console.log(`Regenerating article: ${article.headline} (current: ${oldWordCount}w)`);

    // Fetch cluster info
    const { data: cluster } = await supabase
      .from('cluster_generations')
      .select('topic, primary_keyword, target_audience')
      .eq('id', article.cluster_id)
      .single();

    // Fetch master prompt
    const { data: promptSetting } = await supabase
      .from('content_settings')
      .select('setting_value')
      .eq('setting_key', 'master_content_prompt')
      .single();

    const masterPrompt = promptSetting?.setting_value || '';

    // Build regeneration prompt - MUCH more explicit about word counts
    const systemPrompt = `You are an expert real estate content writer. Your PRIMARY objective is to write LONG, comprehensive articles.

${masterPrompt}

## ABSOLUTE WORD COUNT REQUIREMENT (NON-NEGOTIABLE)
- You MUST write AT LEAST 1,800 words of content
- Target range: 1,800 - 2,200 words
- Articles under 1,500 words will be REJECTED and you will have failed
- COUNT YOUR WORDS BEFORE RESPONDING

## MANDATORY STRUCTURE (each section MUST be 200+ words)
1. Introduction (200 words) - Set the scene
2. Overview/Background (250 words) - Context and importance
3. Key Benefits (250 words) - Why this matters
4. Process/How-To (250 words) - Step-by-step guidance
5. Important Considerations (250 words) - What to watch for
6. Market Insights (200 words) - Current trends and data
7. Expert Tips (200 words) - Professional recommendations
8. FAQ Section (200 words) - 5 common questions with detailed answers
9. Conclusion (200 words) - Summary and call to action

TOTAL: 2,000+ words MINIMUM

## CONTENT QUALITY
- Write in ${article.language === 'en' ? 'English' : article.language.toUpperCase()}
- Use practical, actionable advice with specific examples
- Include statistics and data points where relevant
- Each paragraph should be 3-4 sentences minimum
- NO filler content - every sentence should add value

## HTML FORMAT
- Use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags only
- NO markdown, NO <h1> tags
- Each H2 section must have multiple paragraphs`;

    const userPrompt = `Write a COMPREHENSIVE, DETAILED blog article of AT LEAST 1,800 words.

ARTICLE DETAILS:
- Title: ${article.headline}
- Topic: ${cluster?.topic || article.headline}
- Primary Keyword: ${cluster?.primary_keyword || ''}
- Target Audience: ${cluster?.target_audience || 'real estate investors and buyers'}
- Funnel Stage: ${article.funnel_stage}
- Language: ${article.language}

CRITICAL REQUIREMENTS:
1. Write MINIMUM 1,800 words (aim for 2,000+)
2. Include 9 H2 sections as specified in the system prompt
3. Each section MUST be 200+ words
4. Include 5 FAQ questions with detailed answers
5. Use HTML formatting only

BEFORE SUBMITTING: Count your total words. If under 1,800, go back and expand each section with more examples, details, and explanations.

Return JSON:
{
  "detailed_content": "<h2>Section 1</h2><p>Long detailed content...</p>...",
  "meta_title": "SEO title under 60 chars",
  "meta_description": "SEO description under 160 chars",
  "speakable_answer": "2-3 sentence summary"
}`;

    let finalContent = null;
    let newWordCount = 0;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Regeneration attempt ${attempt}/${maxAttempts}...`);
      
      let attemptPrompt = userPrompt;
      
      // Escalate prompt on retries with VERY explicit instructions
      if (attempt === 2 && newWordCount > 0) {
        attemptPrompt = `CRITICAL FAILURE: Your previous response was only ${newWordCount} words. THIS IS UNACCEPTABLE.

You MUST write AT LEAST 1,800 words this time. Here's how:
- Write 9 sections of 200+ words each = 1,800 words minimum
- Each paragraph should be 4-5 sentences
- Include more examples, statistics, and details
- Expand every point with supporting information

${userPrompt}

FINAL CHECK: Before responding, count your words. If under 1,800, ADD MORE CONTENT to each section.`;
      } else if (attempt === 3 && newWordCount > 0) {
        attemptPrompt = `FINAL ATTEMPT - YOU HAVE FAILED TWICE

Previous attempts produced only ${newWordCount} words. You need 1,800+ words.

MANDATORY: Write EXACTLY this structure with MINIMUM word counts:

SECTION 1 - Introduction (220 words): Set the scene, explain why this topic matters
SECTION 2 - Background (250 words): Historical context, current market conditions  
SECTION 3 - Benefits (250 words): List 5+ benefits with 2 sentences each explaining why
SECTION 4 - Process (250 words): 6+ step-by-step instructions with details
SECTION 5 - Considerations (250 words): 5+ things to watch out for with explanations
SECTION 6 - Market Data (220 words): Statistics, trends, price ranges, growth rates
SECTION 7 - Expert Tips (220 words): 5+ professional recommendations
SECTION 8 - FAQ (220 words): 5 questions with 2-3 sentence answers each
SECTION 9 - Conclusion (220 words): Summarize key points, next steps, call to action

TOTAL REQUIRED: 2,100+ words

${userPrompt}`;
      }

      // Use GPT-5 for better instruction following
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-2025-08-07',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: attemptPrompt }
          ],
          max_completion_tokens: 16000,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        console.error(`Attempt ${attempt}: No content returned`);
        continue;
      }

      const parsed = extractJsonFromResponse(content);
      newWordCount = countWords(parsed.detailed_content || '');
      console.log(`Attempt ${attempt}: Generated ${newWordCount} words`);

      if (newWordCount >= 1500) {
        finalContent = parsed;
        break;
      }

      console.log(`Attempt ${attempt}: Word count ${newWordCount} too low, ${attempt < maxAttempts ? 'retrying...' : 'giving up'}`);
    }

    // Hard fail if still under minimum
    if (!finalContent || newWordCount < 1200) {
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to generate sufficient content after ${maxAttempts} attempts. Best result: ${newWordCount} words (minimum: 1,500)`,
        articleId,
        oldWordCount,
        newWordCount
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the article
    const { error: updateError } = await supabase
      .from('blog_articles')
      .update({
        detailed_content: finalContent.detailed_content,
        meta_title: finalContent.meta_title || article.meta_title,
        meta_description: finalContent.meta_description || article.meta_description,
        speakable_answer: finalContent.speakable_answer || article.speakable_answer,
        date_modified: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId);

    if (updateError) {
      throw new Error(`Failed to update article: ${updateError.message}`);
    }

    console.log(`Successfully regenerated article: ${oldWordCount}w -> ${newWordCount}w`);

    return new Response(JSON.stringify({
      success: true,
      articleId,
      oldWordCount,
      newWordCount,
      message: `Regenerated from ${oldWordCount}w to ${newWordCount}w`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Regenerate article error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
