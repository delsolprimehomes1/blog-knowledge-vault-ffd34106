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

    // Build regeneration prompt
    const systemPrompt = `You are an expert real estate content writer. Your task is to regenerate a blog article with STRICT requirements.

${masterPrompt}

CRITICAL WORD COUNT REQUIREMENT:
- You MUST write between 1,800 and 2,200 words of detailed content
- This is non-negotiable. Articles under 1,500 words will be REJECTED
- Write with depth and substance - no filler content

STRUCTURAL REQUIREMENTS:
1. Include exactly 8 H2 sections with descriptive headings
2. Each H2 section must have 3-4 paragraphs (200-250 words per section minimum)
3. Include a "Frequently Asked Questions" section with 5 Q&A items
4. Use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> HTML tags only
5. NO markdown, NO <h1> tags

CONTENT QUALITY:
- Write for ${article.language === 'en' ? 'English' : article.language.toUpperCase()} language audience
- Focus on practical, actionable advice
- Include specific examples and data where relevant
- Maintain professional, authoritative tone`;

    const userPrompt = `Regenerate this blog article with COMPREHENSIVE, HIGH-QUALITY content:

ARTICLE DETAILS:
- Title: ${article.headline}
- Topic: ${cluster?.topic || article.headline}
- Primary Keyword: ${cluster?.primary_keyword || ''}
- Target Audience: ${cluster?.target_audience || 'real estate investors and buyers'}
- Funnel Stage: ${article.funnel_stage}
- Language: ${article.language}

REQUIREMENTS:
1. Write 1,800-2,200 words of detailed content (this is MANDATORY)
2. Structure with 8 H2 sections + FAQ section with 5 questions
3. Each section should be 200-250 words minimum
4. Include practical examples and specific advice
5. Use HTML formatting only (<h2>, <h3>, <p>, <ul>, <li>, <strong>)

Return a JSON object with this EXACT structure:
{
  "detailed_content": "<h2>First Section Title</h2><p>Content...</p>...",
  "meta_title": "SEO title under 60 chars",
  "meta_description": "SEO description under 160 chars",
  "speakable_answer": "2-3 sentence summary for voice search"
}`;

    let finalContent = null;
    let newWordCount = 0;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Regeneration attempt ${attempt}/${maxAttempts}...`);
      
      let attemptPrompt = userPrompt;
      
      // Escalate prompt on retries
      if (attempt === 2 && newWordCount > 0) {
        attemptPrompt = `CRITICAL: Your previous attempt was only ${newWordCount} words. This is UNACCEPTABLE.

${userPrompt}

MANDATORY EXPANSION:
- You MUST write at least 1,800 words
- Each H2 section needs 200-250 words minimum
- Include more examples, details, and explanations
- Add more FAQ questions if needed

COUNT YOUR WORDS BEFORE RESPONDING. If under 1,800, ADD MORE CONTENT.`;
      } else if (attempt === 3 && newWordCount > 0) {
        attemptPrompt = `FINAL ATTEMPT - STRICT WORD COUNT ENFORCEMENT

Previous attempts failed with only ${newWordCount} words. This attempt MUST succeed.

MANDATORY STRUCTURE (follow exactly):
- Section 1: Introduction (200 words)
- Section 2: Overview/Background (250 words)
- Section 3: Key Benefits (250 words)
- Section 4: Process/How-To (250 words)
- Section 5: Considerations (250 words)
- Section 6: Market Insights (200 words)
- Section 7: Expert Tips (200 words)
- Section 8: FAQ Section (200 words - 5 questions)
- Section 9: Conclusion (200 words)

TOTAL: 1,800+ words MINIMUM

${userPrompt}`;
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
            { role: 'user', content: attemptPrompt }
          ],
          temperature: 0.7,
          max_tokens: 12000,
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
