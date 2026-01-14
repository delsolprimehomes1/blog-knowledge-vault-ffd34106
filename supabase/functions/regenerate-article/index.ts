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
    const systemPrompt = `You are an expert real estate content writer.

${masterPrompt}

## WORD COUNT REQUIREMENTS (STRICT BOUNDARIES)
- TARGET: 1,800 words (ideal length)
- MINIMUM: 1,500 words (do not go below)
- MAXIMUM: 2,500 words (do not exceed)
- Articles outside this range will be REJECTED

## STRUCTURE (aim for ~1,800 words total)
1. Introduction (150 words) - Set the scene
2. Overview/Background (180 words) - Context and importance
3. Key Benefits (180 words) - Why this matters
4. Process/How-To (180 words) - Step-by-step guidance
5. Important Considerations (180 words) - What to watch for
6. Market Insights (150 words) - Current trends
7. Expert Tips (150 words) - Professional recommendations
8. FAQ Section (150 words) - 4-5 questions with concise answers
9. Conclusion (120 words) - Summary and call to action

## CONTENT QUALITY
- Write in ${article.language === 'en' ? 'English' : article.language.toUpperCase()}
- Be concise and valuable - no filler content
- Each paragraph: 2-3 sentences

## HTML FORMAT
- Use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags only
- NO markdown, NO <h1> tags`;

    const userPrompt = `Write a blog article about the topic below.

ARTICLE DETAILS:
- Title: ${article.headline}
- Topic: ${cluster?.topic || article.headline}
- Primary Keyword: ${cluster?.primary_keyword || ''}
- Target Audience: ${cluster?.target_audience || 'real estate investors and buyers'}
- Funnel Stage: ${article.funnel_stage}
- Language: ${article.language}

WORD COUNT BOUNDARIES:
- MINIMUM: 1,500 words
- TARGET: 1,800 words
- MAXIMUM: 2,500 words

If your content exceeds 2,500 words, trim it by being more concise.
If your content is under 1,500 words, expand with more details.

Return JSON:
{
  "detailed_content": "<h2>Section 1</h2><p>Content...</p>...",
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
        attemptPrompt = `Your previous response was ${newWordCount} words, which is ${newWordCount < 1500 ? 'below the 1,500 minimum' : 'acceptable but could be better'}.

Target: 1,700-1,900 words. Add more detail to each section.

${userPrompt}`;
      } else if (attempt === 3 && newWordCount > 0) {
        attemptPrompt = `Previous attempt: ${newWordCount} words. Target: 1,600-1,800 words.

Write 8 sections with ~200 words each. Be thorough but concise.

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

      if (newWordCount >= 1500 && newWordCount <= 2500) {
        finalContent = parsed;
        break;
      } else if (newWordCount > 2500) {
        console.warn(`Attempt ${attempt}: ${newWordCount}w exceeds 2,500 maximum, but accepting`);
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

    // Truncate meta fields to fit database constraints
    const metaTitle = (finalContent.meta_title || article.meta_title || '').slice(0, 60);
    const metaDescription = (finalContent.meta_description || article.meta_description || '').slice(0, 160);

    // Update the article
    const { error: updateError } = await supabase
      .from('blog_articles')
      .update({
        detailed_content: finalContent.detailed_content,
        meta_title: metaTitle,
        meta_description: metaDescription,
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
